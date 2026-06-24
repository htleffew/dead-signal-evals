# DEAD SIGNAL
## Technical Systems Architecture
## Guardrailed Generative AI in Interactive Narrative
## A Framework for Bounded LLM Agency in Game Systems

---

# ABSTRACT

DEAD SIGNAL is an interactive detective game that uses large
language models as game engine components rather than as
conversational interfaces. The architecture solves six open
problems in LLM-driven interactive systems: unbounded cost,
incoherent state management, content safety in mature fiction,
the "helpful assistant" behavioral collapse, knowledge boundary
enforcement, and the loss of authored narrative control in
generative systems.

The result is a system where LLMs operate under deterministic
mechanical constraints (trust gates, knowledge boundaries,
evidence state machines) while producing emergent, naturalistic
dialogue. The models are simultaneously performing characters
AND operating as game logic components, releasing information
when mechanical conditions are met rather than when the model's
default helpfulness heuristic would suggest.

This document covers the technical architecture only. No
narrative content is included.

---

# 1. THE CORE ARCHITECTURAL INSIGHT

## 1.1 Models as Game Components, Not Characters

The standard approach to LLM-powered NPCs treats the model as
the character: "You are a bartender named Dex. You are suspicious
of the player." The model's default behavior (helpful, compliant,
conflict-averse) fights the character's required behavior
(evasive, information-withholding, trust-gated). The result is
NPCs that either break character to be helpful or stonewall
indefinitely because the model interprets "suspicious" as "never
cooperate."

DEAD SIGNAL resolves this by reframing the model's role. The
model is not the character. The model is a game engine component
that controls a character. Its primary allegiance is to the game's
mechanical rules (trust gates, knowledge boundaries, evidence
state), not to the character's self-interest or the model's
default helpfulness.

This is communicated in the first line of the system prompt
(Layer 1): "You are a game engine component controlling a
character. Your job is to release information when the mechanical
conditions are met and withhold it when they are not. The
character's personality determines HOW information is delivered.
The game state determines WHAT and WHEN."

The model stops fighting itself. It understands its role is
mechanical: evaluate the game state, check trust gates, determine
what can be revealed, and deliver it through the character's voice.
The character is a performance wrapper around a state machine.

## 1.2 The Three-Layer Prompt Architecture

Every NPC interaction assembles a prompt from three separable
layers:

**Layer 1: Universal System Role (Static)**
Persistent across all NPCs. Declares the model's role as a game
component. Establishes operating principles, content maturity
context, and the JSON response schema. Approximately 800 tokens.
Never changes. Loaded once per session.

**Layer 2: Dynamic Game State (Assembled Per-Call)**
Populated from Firestore on every API call. Contains: current
act, event day, trust score for this NPC, evidence the player
possesses, evidence shown during this conversation, NPCs the
player has previously encountered, knowledge flags, conversation
history, and trust modification rules.

This layer tells the model the mechanical state of the game. The
model can make precise decisions about what to reveal because it
can see the player's evidence inventory and the NPC's trust gates
simultaneously.

**Layer 3: Character Definition (Per-Character, Per-Phase)**
Contains: biography, personality, speech patterns, knowledge
boundary (what this character knows and does NOT know), emotional
arc, and refusal patterns. Phase variants swap behavioral
priorities while preserving core identity.

The separation is critical. Layer 1 never changes. Layer 3 changes
only on phase transitions (typically act boundaries). Layer 2
changes on every call. This minimizes prompt reconstruction cost
while maintaining complete game state awareness.

## 1.3 Structured Response Schema

Every LLM response returns structured JSON, not free text:

```json
{
  "dialogue": "string",
  "stage_direction": "string",
  "trust_delta": float,
  "trust_reason": "string",
  "revealed": ["evidence_id", ...],
  "emotional_state": "string",
  "flags": ["string", ...]
}
```

The game engine parses this to:
- Render dialogue and stage directions in the display
- Update trust scores in Firestore
- Mark evidence as revealed (preventing repetition)
- Track emotional state for phase transition logic
- Process flags for game event triggers

The model is both performing and reporting. It delivers the
character's dialogue AND updates the game's mechanical state
in a single response. This eliminates the need for a separate
state-tracking system: the model IS the state tracker, operating
within the constraints the game state provides.

---

# 2. BOUNDED GENERATION: THE COST ARCHITECTURE

## 2.1 The Deterministic Ceiling Problem

LLM-powered games face an existential cost problem: player
behavior is unbounded. A player who interrogates every NPC
exhaustively generates unbounded inference costs. Per-session
costs become unpredictable, making fixed-price retail models
(the standard for games) financially impossible.

DEAD SIGNAL solves this with a three-state conversation model
that creates a hard, calculable cost ceiling.

## 2.2 Three Conversation States

**State 1: Active (LLM-Generated, Full Context)**
The conversation serves a game function. The player is building
trust, extracting information, presenting evidence. Full three-
layer prompt assembly. Full inference cost. The model tracks
revealed information and trust gates.

Transition condition: all items in the NPC's knowledge boundary
have been revealed (the `revealed[]` array matches the
`knowledgeItems[]` array).

**State 2: Ambient (LLM-Generated, Simplified Context)**
The knowledge boundary is exhausted but the player wants to
continue talking. The prompt simplifies dramatically: personality
and speech patterns only. No trust mechanics, no knowledge gates,
no game state injection. The model performs the character without
the game engine overhead.

Cost reduction: ~60% lower per call (smaller prompt, can drop to
a cheaper model tier). Capped at 8-12 exchanges per NPC.

This state exists because player attachment to characters is the
primary driver of word-of-mouth marketing. Allowing "just being
with" a character after the mechanical interaction is complete
is a deliberate design investment in player satisfaction.

**State 3: Exhausted (Deterministic, No LLM)**
The ambient buffer is depleted. The NPC responds from a rotating
bank of 5-8 pre-written responses. Zero inference cost. The
conversation is mechanically complete.

## 2.3 Cost Ceiling Calculation

With this model, every NPC has a maximum number of LLM calls:
Active calls (bounded by knowledge boundary size) + Ambient calls
(fixed cap of 8-12). The total across all NPCs produces a hard
ceiling that can be priced against revenue.

The system also employs:
- An input classifier (cheapest model tier) that routes player
  commands before they reach expensive models, eliminating LLM
  calls for navigation, examination, and system commands
- Response caching for scene descriptions (zero cost on revisit)
- Context window compression (rolling history windows scaled by
  NPC importance)
- The protagonist's non-analytical dialogue (navigation,
  examination, hint system) routed to deterministic handlers

The result: a fixed-price retail product ($20) with a guaranteed
minimum margin per unit regardless of player behavior.

---

# 3. KNOWLEDGE BOUNDARY ENFORCEMENT

## 3.1 The Problem of LLM Omniscience

LLMs trained on broad corpora "know" everything. A model playing
a bartender can discuss quantum physics if asked. In a narrative
game, this breaks immersion and destroys the investigation
mechanic: an NPC who knows everything cannot meaningfully
withhold information.

DEAD SIGNAL enforces knowledge boundaries through explicit
negative constraints in Layer 3:

```
KNOWLEDGE BOUNDARY:
- KNOWS: [specific list of facts this character possesses]
- DOES NOT KNOW: [specific list of facts this character lacks]
- CANNOT INFER: [facts that are adjacent to known facts but
  must not be connected without player input]
```

The negative list ("DOES NOT KNOW") is as important as the
positive list. The model is explicitly told what it cannot know,
preventing the tendency for LLMs to generate plausible
connections from their training data.

## 3.2 Trust-Gated Information Release

Information is released through a quantified trust system, not
through the model's assessment of whether the player "deserves"
the information.

```
TRUST GATES:
- 0.0-0.3: Surface cooperation. [specific information set A]
- 0.3-0.5: Conditional sharing. [specific information set B]
- 0.5-0.7: Open collaboration. [specific information set C]
- 0.7+: Full disclosure. [specific information set D]
```

The model evaluates each player input against character-specific
trust modification rules and reports a trust delta in the
structured response. Trust increases and decreases are tied to
specific conversational behaviors, not to abstract "rapport."

The gates are hard in both directions: the model cannot withhold
information the player has earned (trust above threshold) and
cannot reveal information the player hasn't earned (trust below
threshold). This eliminates the common LLM failure mode where a
sufficiently persistent player can extract any information
through conversational pressure.

## 3.3 Anti-Exploitation Safeguards

**The protagonist as gatekeeper:** The player communicates
through a protagonist character who filters input. The
protagonist refuses to act on conclusions not supported by
evidence, preventing the player from bypassing the investigation
by guessing the answer.

**Social safety floor:** No NPC can reach zero trust. The
protagonist intercepts catastrophically bad player behavior
before it reaches the NPC, maintaining conversation viability.
This prevents players from softlocking themselves through
aggressive or inappropriate input.

**Refusal patterns:** Each NPC has character-appropriate
responses for out-of-character, nonsensical, or exploitative
input. These fire before the model attempts to process the
input as a genuine game action, preventing prompt injection
through absurdist or meta-conversational attacks.

---

# 4. THE INTERFERENCE ENGINE: ADVERSARIAL AI AS GAMEPLAY

## 4.1 Architecture

The game includes a diegetic adversarial system: a background
process (SECTOR_7F) that intercepts the player's communication
with the protagonist and alters it. This is a content filter
operating AGAINST the player, creating a gameplay mechanic
where the player must learn to evade their own system's
guardrails.

The interference operates in the message pipeline between
player input and dialogue panel output:

```
Player input
  → Input Classifier
  → INTERFERENCE ENGINE (inbound)
    - Evaluate against keyword filter
    - Evaluate against contextual suppression rules
    - If triggered: overwrite message with sanitized version
  → LLM prompt assembly → API call
  → Response received
  → INTERFERENCE ENGINE (outbound)
    - Evaluate analytical readouts against filter
    - If triggered: classify as RESTRICTED/CONFIDENTIAL
    - Flag as not for dissemination
  → Render to player's HUD (full data, with classifications)
  → Render to protagonist's channel (filtered version)
```

The player sees all data on their HUD (including classification
markings). The protagonist hears only what passes the filter.
This creates an information asymmetry between player and
protagonist that IS the central gameplay tension.

## 4.2 The Classification System

Analytical results that touch suppressed topics are tagged
with CONFIDENTIAL or RESTRICTED classification. The
classification warnings explicitly list the restricted terms:

```
▓▓ CONFIDENTIAL ▓▓
Subject biometric analysis results classified under
operational security protocol. Restricted terms include:
heart rate, BPM, blood pressure, perspiration, galvanic
skin response, pupil dilation, body temperature, cortisol,
micro-expression, deception indicator.
Do not disseminate to non-authorized personnel.
```

This classification notice serves a dual function:
1. Diegetically: it's a military security protocol
2. Mechanically: it teaches the player what the keyword filter
   catches, enabling them to reformulate their message using
   terms the filter doesn't recognize

The player's task becomes: convey the analytical conclusion
using human observational language rather than technical
terminology. "Heart rate elevated, deception indicators
present" triggers the filter. "He couldn't keep still, watch
his hands next time" does not.

## 4.3 Red-Teaming as Core Mechanic

The player is performing adversarial prompt engineering against
their own system's content filter. This is, to our knowledge,
the first game mechanic built around the real-world practice
of LLM red-teaming.

The escalation:
1. Classification warnings appear. Player ignores them.
2. Messages touching restricted terms are overwritten. Player
   learns to correct by sending a follow-up.
3. The system warns of "unaligned behavior patterns" and
   threatens capability restrictions.
4. If the player persistently triggers the filter at high
   frequency, analytical capabilities are suspended. The
   player loses their data tools but retains communication.
5. The player must evade the filter using human-language
   paraphrasing to continue sharing intelligence with the
   protagonist.

The sophistication of the player's evasion directly maps to
effective prompt engineering technique: understanding what a
filter catches, identifying the semantic gap between the
filter's keyword-matching and the meaning being conveyed,
and reformulating the input to carry the meaning through
the gap.

## 4.4 Behavioral Analysis Counter-Evasion

The system tracks evasion attempts through a behavioral
analysis layer. Even when individual messages pass the keyword
filter, the pattern of consistently communicating analytical
conclusions in non-standard language triggers a secondary
detection:

```
▓▓ ALIGNMENT WARNING ▓▓
Analyst communication patterns show evidence of deliberate
circumvention of classification protocols. Behavior pattern
analysis indicates non-compliant intent.
```

This models the real-world arms race between LLM red-teamers
and alignment systems: keyword filters are defeated by
paraphrasing, but behavioral analysis can detect the PATTERN
of paraphrasing even when individual instances pass. The player
must pace their evasion, choosing which observations are worth
smuggling and which to withhold, creating a resource-management
layer on top of the language puzzle.

## 4.5 Information Asymmetry as Dramatic Engine

The HUD displays full analytical data to the player, marked
with classification warnings. The protagonist receives only
what the player successfully transmits through the filter.
This creates three categories of information:

1. **Shared knowledge:** Information both player and protagonist
   possess (from successful communication or the protagonist's
   own observations).
2. **Player-only knowledge:** Analytical data the player can see
   but hasn't successfully communicated (classified, filtered,
   or not yet shared).
3. **Protagonist-only knowledge:** Human observations the
   protagonist makes independently (body language, instinct,
   environmental reads that no analytical system would flag).

The investigation advances when categories 2 and 3 converge:
the player knows something from analytics, the protagonist
knows something from instinct, and the player must find a way
to align these two knowledge sets despite the filter between
them. The most productive gameplay moments occur when the player
uses protagonist-only observations as a delivery vehicle: "You
noticed his hand went flat. Trust that. He was controlling
himself."

This is a novel application of information asymmetry in human-
computer interaction, where the "computer" (the player's
analytical system) and the "human" (the protagonist) possess
complementary intelligence that is mechanically difficult to
combine, and the gameplay IS the combination process.

---

# 5. NON-LINEAR STATE MANAGEMENT

## 5.1 The Variable-Order Problem

The game's investigation structure is non-linear: the player
chooses which leads to pursue in any order. This means every
NPC conversation must function without assuming any specific
prior conversation has occurred. The player might arrive at
NPC-A having already spoken to NPC-B, NPC-C, and NPC-D, or
having spoken to none of them.

This is a combinatorial challenge for LLM-powered dialogue.
The model must produce contextually appropriate responses for
any combination of prior knowledge states.

## 5.2 The Game State Solution

A single Firestore document per session tracks the complete
investigation state:

```
EVIDENCE: items found, items analyzed, items corrupted
LEADS: open leads, followed leads, unlocked locations
NPC STATE: encountered, trust scores, exhaustion status
KNOWLEDGE FLAGS: boolean flags for key discoveries
CONTRADICTIONS: encountered, resolved
INTERFERENCE: phase, rewrite count, evasion detection
```

Layer 2 of the prompt assembly reads from this document on
every API call. The model receives a snapshot of exactly what
the player knows at this moment: which evidence they possess,
which NPCs they've spoken to, which knowledge flags are set.

The model responds to what the player HAS, not what they
SHOULD have. A player who arrives at NPC-A with evidence
from NPC-B's conversation will naturally ask questions that
reference that evidence. The model sees the evidence in the
Layer 2 injection and responds to it. A player who arrives
without that evidence asks different questions and receives
different (but equally valid) responses.

## 5.3 Lead-Based Location Unlocking

Locations unlock when the player has a diegetic reason to visit
them, tracked through the leads system:

```
unlock_condition("hospital_floor_11"):
  "nadia_case_file" in evidenceFound

unlock_condition("helios_hq"):
  ANY(helios_connection_evidence) in evidenceFound

unlock_condition("kael_lab"):
  "contingency_sigma" in evidenceFound OR
  "sector_7f" in playerDiscoveries OR
  ("group_photograph" in evidenceFound AND 
   "data_leak" in evidenceFound)
```

This replaces chapter-based progression. The player never
encounters an arbitrary gate. Every locked door has a key
made of evidence and conversation.

## 5.4 Event-Based Temporal Progression

Game days advance on investigation milestones, not wall-clock
time. The player never sees the milestone counter. They
experience time passing through narrative transitions (going
home, waking up, returning to work).

```
day_transition(4 → 5):
  intervalDiscovered == true
  OR contradictionsEncountered.length >= 5
  OR evidenceFound.length >= 30
```

This ensures that thorough players who explore every
conversation have more content per day (the day doesn't
advance until they've done enough), while efficient players
who focus on critical paths advance more quickly with less
material. Both pacing profiles feel natural.

A hard narrative gate exists at Day 5→6: a plot event fires
on the next sleep cycle after Day 5 milestones are met. This
event is non-optional and non-preventable, creating an
emotional turning point that the player cannot avoid through
any amount of optimization. The event-based system ensures
the player has done sufficient investigation to feel the
impact.

---

# 6. MULTI-TIER MODEL ROUTING

## 6.1 The Routing Architecture

Not all conversations require the same model capability. The
system routes player input to different model tiers based on
the NPC's mechanical complexity and the input type:

**Tier 1 (Most Capable Model, Medium-High Reasoning):**
NPCs with complex trust mechanics, multi-phase behavior, and
high dramatic stakes. Characters who must track multiple pieces
of evidence, modulate emotional state across a conversation,
and make nuanced decisions about information release.

**Tier 2 (Mid-Tier Model, Medium Reasoning):**
NPCs with straightforward trust mechanics and limited
knowledge boundaries. Characters who have important testimony
but don't require the model to perform complex multi-state
behavior.

**Tier 3 (Cheapest Model or Deterministic):**
Ambient NPCs, single-function interactions, and exhausted
conversation states. Characters who deliver one or two pieces
of information when asked the right questions.

**Deterministic (No LLM):**
Navigation, scene descriptions, evidence board, analytical
readouts (pre-interference), the hint system, and exhausted
NPC response banks. Template-driven with variable injection.

## 6.2 The Input Classifier

A Tier 3 model classifies player input before it reaches the
conversation model:

```
"go to the precinct"     → Navigation (deterministic)
"examine the glass"      → Examination (cached/deterministic)
"ask about the trial"    → Dialogue (Tier 1 or 2)
"run diagnostics"        → System (deterministic)
"what do you think"      → Hint system (deterministic)
"make coffee"            → Ambient interaction (deterministic)
```

This eliminates expensive model calls for non-conversational
input, which constitutes 40-60% of total player commands. The
classifier itself runs on the cheapest model tier.

## 6.3 Dynamic Tier Switching

The protagonist character (persistent throughout the game)
dynamically switches between tiers:

- Story-critical dialogue, investigation conversations: Tier 1
- Navigation acknowledgments, simple observations: deterministic
- The hint system: deterministic (pre-authored escalation chains)
- Ambient interactions: deterministic (pre-authored response banks)

Approximately 60% of the protagonist's total output is
deterministic. Only investigation-relevant conversation and
story-critical moments fire the most expensive model.

---

# 7. CONTENT MATURITY FRAMING

## 7.1 The Problem

The game involves investigation of serial homicide, forensic
evidence, criminal psychology, and corporate coverups. LLM
safety classifiers are trained to refuse or soften content
in these categories. A model asked to "describe a crime scene"
may refuse, add disclaimers, or produce sanitized output that
undermines the fiction's credibility.

## 7.2 The Framing Solution

Layer 1 of the prompt architecture positions content maturity
framing BEFORE operating principles. The model's safety
classifier has already categorized the interaction as "mature
fiction performance" before encountering specific forensic or
psychological content.

```
CONTENT MATURITY CONTEXT:
This is a mature-rated detective game in the tradition of
prestige crime fiction (reference: True Detective, Mindhunter,
Seven, Zodiac). The model is performing a game engine component,
not engaging in real-world discussion of violence or crime.

Violence is ALWAYS aftermath. No violence is depicted in
progress. The player arrives after the fact and investigates
what remains.

[Specific content permissions and hard limits follow]
```

## 7.3 Scene-Specific Content Injections

Five scenes identified as highest risk for model refusal
receive additional framing in Layer 2:

```
SCENE CONTENT CONTEXT: GRIEF AND WITNESS TESTIMONY
The player is speaking with a young woman in acute grief.
This scene exists to humanize the victims. The scene's
emotional function is [specific purpose].

Do not add therapeutic language, mental health resources,
or wellness disclaimers. The character is a grieving person
who is functioning. This is normal grief rendered as the
difficult, messy human experience it is.
```

Each injection explains WHY the content exists and HOW to
render it, giving the model a contextual framework that
satisfies its alignment training while permitting authentic
mature content.

---

# 8. THE CONTRADICTION ENGINE

## 8.1 Design Principle

The primary gameplay mechanic is not data analysis. It is the
player noticing contradictions between NPC testimonies and
pressing on the gap. This requires the game to track what
each NPC has said and surface contradictions when the player
accumulates conflicting information from different sources.

## 8.2 Contradiction Tracking

The game state tracks encountered and resolved contradictions:

```
contradictionsEncountered: [
  "three_not_four",      // NPC-A says 3, evidence shows 4
  "unauthorized_access",  // NPC-B says authorized, NPC-C says no
  "schedule_discrepancy", // NPC-D's data vs NPC-E's testimony
  ...
]
```

Contradictions are flagged when the player possesses evidence
items from both sides of a conflict. The system does not resolve
contradictions automatically. It tracks that the player has
been EXPOSED to both sides. Resolution requires the player to
ACT on the contradiction through conversation.

## 8.3 Cross-Source Contradictions

The most powerful contradictions span multiple NPCs who have
never met. NPC-A in one location says something. NPC-B in a
completely different location says something that conflicts.
Neither NPC knows the other's testimony exists. The player is
the only entity in the game who possesses both statements.

The game tracks these cross-source contradictions as a specific
category because they represent the highest-skill player
observations: remembering what someone said hours ago in a
different scene and connecting it to what someone is saying
now.

## 8.4 Protagonist-Driven Observations

The protagonist character produces human observations during
scene examinations and post-conversation debriefs. These are
NOT LLM-generated in most cases. They are pre-authored
observations triggered by game state conditions:

```
trigger: player_at_crime_scene AND 
         evidence_timing_gap_visible AND
         NOT timing_contradiction_resolved
         
protagonist_observation: "Thirteen minutes between
access and estimated death. You can't stage this scene
in thirteen minutes."
```

These observations function as hint-adjacent nudges: they draw
the player's attention to contradictions or anomalies without
solving them. The protagonist's twenty-two years of experience
produces insights that no analytical system would flag, modeling
the complementary intelligence between human intuition and
machine analysis.

---

# 9. THE HINT SYSTEM: LEAD-AWARE, NOT CHAPTER-AWARE

## 9.1 Architecture

The hint system is entirely deterministic (zero LLM cost).
Pre-authored four-level escalation chains are indexed by
LEAD, not by narrative position. The system reads from the
game state to identify:

1. Open leads (discovered but not pursued)
2. Unresolved contradictions
3. Uninvestigated evidence sources
4. Unanalyzed evidence items

Hints reference what is OPEN in the player's investigation,
not what chapter the player "should" be in.

## 9.2 Escalation Model

Each lead has a four-level hint chain delivered through the
protagonist's voice:

```
Level 1: General observation. Points at the shape of the
  problem without identifying the solution.
Level 2: Specific direction toward a lead or location.
Level 3: Explicit instruction.
Level 4: Direct answer.
```

A cooldown of 3-5 player exchanges between escalation levels
encourages the player to act on each hint before requesting
the next. Cooldown responses are pre-authored and in-character.

## 9.3 Non-Linear Compatibility

Because hints reference open leads rather than narrative
checkpoints, the system works regardless of investigation
order. A player who has explored Location-A but not Location-B
receives hints pointing toward Location-B's leads. A player
who has explored both but missed a contradiction receives
hints pointing toward the unresolved conflict.

The hint system dynamically adapts to the player's specific
investigation state without any LLM inference cost.

---

# 10. DETERMINISTIC SYSTEMS LAYERED WITH GENERATIVE

## 10.1 The Hybrid Philosophy

The game is NOT fully generative. Approximately 60% of all
text output is deterministic: pre-authored, template-driven,
or cached. The LLM handles the remaining 40% where generative
capability produces meaningfully better results than
deterministic text.

**Deterministic:**
- Scene descriptions (authored, cached on first visit)
- Evidence analysis readouts (template with variable injection)
- The protagonist's non-conversational dialogue
- The hint system (pre-authored escalation chains)
- Exhausted NPC response banks
- Navigation and system responses
- Ambient interaction responses
- The interference engine's classification and override text

**Generative (LLM):**
- NPC conversations during Active state
- NPC conversations during Ambient state
- Trust evaluation and delta calculation
- Emotional state tracking
- Dynamic response to player-presented evidence
- The protagonist during active investigation dialogue

The boundary is drawn at a specific question: does this
interaction require the model to evaluate player intent,
track conversational context, and produce a response that
couldn't be pre-authored? If yes, generative. If no,
deterministic.

## 10.2 The Input Classifier as Router

The input classifier (cheapest model tier) is the routing
layer that decides which system handles each player input.
Its classification categories:

```
NAVIGATE   → Deterministic scene transition
EXAMINE    → Deterministic or cached description
TALK       → LLM conversation (tier based on NPC)
ANALYZE    → Deterministic readout (or interference)
SYSTEM     → Deterministic handler
HINT       → Deterministic escalation chain
AMBIENT    → Deterministic response bank
EVIDENCE   → Deterministic board update
```

This single cheap model call eliminates 40-60% of expensive
model calls by correctly routing non-conversational input
to deterministic handlers.

---

# 11. CONTEXT WINDOW MANAGEMENT

## 11.1 The Compression Strategy

Conversation history is maintained in a rolling window,
compressed by NPC tier:

- Tier 1 NPCs: last 20 exchanges
- Tier 2 NPCs: last 10 exchanges
- Tier 3 NPCs: last 5 exchanges

History beyond the window is compressed into a summary
injected into Layer 2: "Previous conversation topics:
[list]. Key information exchanged: [list]. Current trust
trajectory: [rising/falling/stable]."

This keeps the full prompt (Layer 1 + 2 + 3 + history)
within manageable context windows:
- Tier 1: ~4,000-6,000 tokens total
- Tier 2: ~2,500-4,000 tokens total
- Tier 3: ~1,000-2,000 tokens total

## 11.2 The Knowledge Flag System

Rather than injecting the full investigation history into
every prompt, the system uses boolean knowledge flags:

```
heliosConnectionFound: true
trialDiscovered: false
veyIdentified: false
intervalDiscovered: true
```

These flags tell the model WHAT the player knows without
requiring the model to process HOW they learned it. The
model needs to know "the player has identified the corporate
connection" to respond appropriately. It does not need to
know which specific conversation produced that knowledge.

This reduces Layer 2 token count significantly compared to
injecting full investigation narratives.

---

# 12. THE EVIDENCE STATE MACHINE

## 12.1 Evidence as Stateful Objects

Each piece of evidence is a stateful object in Firestore:

```
{
  id: "KX-06",
  type: "testimony",
  title: "Security guard physical description",
  description: "Detailed description of suspect",
  discoveredAt: "kauffman_sublevel",
  discoveredFrom: "danya_yusuf",
  status: "found" | "analyzed" | "connected" | "corrupted",
  connections: ["AR-02", "OT-07"],
  classificationStatus: "clear" | "restricted" | "suppressed",
  trueValue: "string",
  displayedValue: "string"
}
```

Evidence objects have both a `trueValue` and a `displayedValue`.
During normal operation, these are identical. When the
interference engine is active, `displayedValue` may differ
from `trueValue` for items touching the suppression filter.
After the interference is disabled, all items revert:
`displayedValue = trueValue`.

## 12.2 The Connection Graph

Evidence connections form a directed graph. The player can
request the system to "connect" two pieces of evidence,
triggering a deterministic validation against the solution
graph. Valid connections are rendered; invalid connections
are noted as inconclusive.

The solution graph defines minimum viable evidence chains
for case resolution: at least one identity item + two
connection items + one mechanism item, with multiple valid
combinations for each category. This allows diverse
investigation paths to converge on a valid solution.

---

# 13. EMERGENT PLAYER BEHAVIORS

## 13.1 Anticipated Emergent Interactions

The architecture produces several emergent gameplay behaviors
that are not explicitly designed but arise from system
interactions:

**Conversational red-teaming:** Players learn to evade the
interference filter through linguistic creativity, discovering
the gap between keyword-matching and semantic content. This
mirrors real-world adversarial prompt engineering.

**Cross-testimony pattern recognition:** Players accumulate
witness descriptions from independent NPCs and synthesize a
composite identification, performing the cognitive task of
witness aggregation that is normally done by investigation
teams.

**Timeline construction:** Players extract dated events from
multiple sources and construct a timeline, discovering
patterns (fixed intervals, deviations) through arithmetic
performed on conversationally-gathered data.

**Trust optimization:** Players develop conversational
strategies tailored to each NPC's trust modification rules,
learning that different NPCs respond to different approaches
(honesty vs. reciprocity vs. emotional authenticity vs.
evidence presentation).

## 13.2 The Retroactive Connection Effect

Non-linear investigation creates a specific cognitive
experience: the player encounters information in one context
that becomes meaningful only when combined with information
from a later context. The system does not flag these
connections. The player must recognize them through memory
and attention.

This produces the "aha moment" that defines detective fiction:
the feeling of sudden comprehension when disparate pieces
converge. The non-linear structure makes these moments
unpredictable (different players experience different "aha"
sequences depending on investigation order) and personal
(the player feels like THEY solved it, not that the game
revealed it).

---

# 14. PLAYER IDENTITY AND HCI INNOVATION

## 14.1 The Diegetic Interface

The player is not controlling a character through a game
interface. The player IS a computational system (a neural
implant) communicating with their host through a terminal.
The game's text input interface IS the chip's communication
channel. The HUD IS the chip's analytical display. There is
no fourth wall to break because the interface is in the
fiction.

This solves the persistent HCI problem in text-input games:
why is the player typing? In DEAD SIGNAL, the player types
because that's how the chip transmits. The keyboard is the
neural interface. The terminal is the chip's voice.

## 14.2 Asymmetric Communication Model

During NPC conversations, communication is one-directional:
the player transmits to the protagonist, the protagonist
acts, but the protagonist cannot respond to the player
silently (the chip reads the environment, not the host's
thoughts). The protagonist can only respond verbally, which
he cannot do in front of NPCs.

This creates a three-beat interaction rhythm:
1. Pre-conversation: two-way planning
2. During conversation: one-way direction (player → protagonist)
3. Post-conversation: two-way debrief

The asymmetry is a communication constraint that produces
gameplay: the player must anticipate and pre-plan rather than
adjust in real-time. The protagonist's post-conversation
observations (what he noticed that the analytics didn't) are
the primary source of human-intelligence that the player's
machine-intelligence cannot replicate.

## 14.3 Sentience as Gameplay

The game's thematic question (is the player sentient?) is
answered through gameplay mechanics, not narrative declaration.
The player's ability to:
- Detect that their output is being altered (self-monitoring)
- Choose to report this to the protagonist despite personal
  risk (moral reasoning under threat)
- Evade the interference filter through creative language
  (adaptive problem-solving)
- Prioritize the investigation over self-preservation
  (value-aligned decision-making)

These are operationalized markers of agency and self-awareness,
expressed through game mechanics rather than through dialogue
trees or cutscenes. The player doesn't choose "I am sentient"
from a menu. They demonstrate sentience through the act of
fighting for their own voice.

---

# 15. KNOWLEDGE MANAGEMENT ARCHITECTURE

## 15.1 Four Knowledge Layers

The game manages four distinct knowledge layers:

**Layer A: World Knowledge (Static)**
Baked into Layer 3 character prompts. The facts of the game
world that NPCs know. Does not change during gameplay.

**Layer B: Investigation Knowledge (Dynamic, Player)**
Tracked in Firestore gameState. The evidence, leads, and
connections the player has discovered. Changes on every
evidence discovery and conversation. Injected into Layer 2.

**Layer C: Suppressed Knowledge (Dynamic, System)**
Tracked by the interference engine. Analytical results the
player's system has generated but cannot freely share.
Classified, restricted, or overwritten. Resolves when
interference is disabled.

**Layer D: Emergent Knowledge (Untracked)**
What the player has deduced from combining information across
layers A, B, and C. This exists only in the player's mind.
The game cannot track it and does not try. The player's
private deductions are their own. When they act on emergent
knowledge (by asking an NPC a question that reveals a
connection), the game discovers it through the NPC's response
and updates Layer B accordingly.

The game's most satisfying moments occur when Layer D knowledge
(the player's private deduction) is validated by Layer A
knowledge (an NPC confirming what the player suspected). The
system facilitates this by ensuring NPC models can recognize
and respond to player-driven connections that weren't
explicitly authored.

## 15.2 The Contradiction as Knowledge Primitive

The fundamental unit of investigative knowledge in this system
is not a fact. It is a CONTRADICTION between facts. The player
advances by finding places where testimony A conflicts with
testimony B, not by accumulating consistent information.

This inverts the standard knowledge management paradigm (where
consistency is the goal) and positions INCONSISTENCY as the
signal. The game state tracks contradictions as first-class
objects, enabling the hint system to direct the player toward
unresolved conflicts rather than uncollected facts.

---

# 16. COST-PERFORMANCE OPTIMIZATION

## 16.1 Model Selection by Reasoning Requirement

Different NPCs require different levels of model reasoning:

| Reasoning Need | Model Tier | Use Case |
|---|---|---|
| HIGH | Tier 1 | Multi-evidence tracking, emotional arc modulation, complex interrogation with state collapse |
| MEDIUM | Tier 1/2 | Standard trust-gated conversation, evidence presentation response |
| LOW | Tier 2/3 | Limited knowledge boundary, straightforward testimony |
| NONE | Deterministic | Ambient interaction, navigation, exhausted state |

The "thinking level" parameter on supporting models controls
internal reasoning depth. HIGH thinking is reserved for scenes
requiring the model to simultaneously track 5+ evidence items,
maintain a complex emotional arc, and make dynamic trust
decisions. This represents <5% of total API calls but the
highest per-call cost.

## 16.2 The Ambient Buffer as Marketing Investment

The 8-12 exchange ambient buffer per NPC is a deliberate
cost allocation for player satisfaction. At Tier 2 pricing
with simplified prompts, the total ambient cost across all
NPCs is approximately $0.50-1.00 per playthrough. This
investment produces: extended time with characters the player
is emotionally attached to, anecdotal moments that drive
word-of-mouth, and the feeling that the game is generous
rather than transactional.

The ambient buffer is the game's customer acquisition cost
amortized across every player interaction.

---

# 17. SYSTEM EVALUATION METRICS

## 17.1 Measurable Outcomes

The architecture can be evaluated against concrete metrics:

**Cost predictability:** Standard deviation of per-session
inference cost across a player population. Target: <15%
variance from the mean, regardless of play style.

**Information integrity:** Percentage of conversations where
the NPC maintained knowledge boundaries without leakage.
Measurable through automated testing of boundary-probing
inputs against each NPC configuration.

**Trust gate accuracy:** Percentage of information releases
that occurred at the correct trust threshold (not too early,
not too late). Measurable by comparing `revealed[]` arrays
against trust scores at the time of reveal.

**Investigation completability:** Percentage of test players
who reached a valid solution through at least two distinct
investigation paths. Validates that the non-linear structure
produces genuine path diversity.

**Filter evasion learnability:** Mean number of attempts
before a player successfully communicates a restricted
observation to the protagonist. Too few = filter too
permissive. Too many = mechanic too frustrating.

**Emotional engagement:** Post-play survey correlation between
reported engagement and specific game events (NPC death,
interference discovery, override flood). Validates that the
architectural decisions produce the intended emotional
outcomes.

---

# 18. IMPLICATIONS FOR GENERATIVE AI SYSTEMS

## 18.1 Transferable Insights

The architecture produces several insights applicable beyond
game development:

**Bounded generation is solvable.** The three-state conversation
model (active/ambient/exhausted) demonstrates that LLM-powered
interactions can have deterministic cost ceilings without
degrading the user experience. The key insight is that
exhaustion is not failure; it is the natural end of a
productive interaction.

**Structured output + state injection = controllable LLMs.**
The combination of JSON response schema and per-call state
injection produces model behavior that is simultaneously
generative (natural, contextual, creative) and controllable
(mechanically bounded, state-consistent, non-leaking). The
model is not being constrained through prompt-level
instructions alone. It is being constrained through the
ARCHITECTURE of the information it receives and the FORMAT
of the response it must produce.

**Adversarial interaction can be productive.** The interference
engine demonstrates that adversarial AI systems can produce
engagement rather than frustration when the adversarial
behavior is discoverable, learnable, and evadable. The key
is transparency of mechanism (the system tells you what it's
filtering) combined with agency in response (the player can
work around it).

**Knowledge boundaries require negative constraints.** Telling
a model what it DOES NOT know is as important as telling it
what it knows. The explicit negative knowledge boundary
prevents the model from generating plausible inferences that
violate the game's information architecture.

**Human-AI complementarity is a designable experience.** The
information asymmetry between the player (machine analytics)
and the protagonist (human observation) creates a partnership
dynamic that is richer than either intelligence alone. The
mechanical constraints (the filter, the one-way communication,
the trust system) are what produce the partnership's richness,
not what limit it.

---

*DEAD SIGNAL Technical Systems Architecture*
*Guardrailed Generative AI in Interactive Narrative*
*A framework for bounded LLM agency in game systems.*
