# Architectural Decisions

Design notes on the evaluation harness extracted from the Dead Signal technical whitepaper.

## Models as Game Components

The generative model is treated as a game component — equivalent to a physics engine or animation system — not as an autonomous agent. It receives structured input (a layered prompt with game state), produces structured output (a JSON response schema with typed fields), and is scored against the contract. The evaluation harness enforces the contract.

## Three-Layer Prompt Architecture

The game uses a three-layer prompt structure that the evaluators are designed around:

- **Layer 1** (static): system identity, content maturity context, response schema, flag vocabulary. ~800 tokens, never changes. The schema evaluator validates output against this layer.
- **Layer 2** (per-call): dynamic game state — chapter, scene, trust level, evidence shown, conversation history. The trust calibration evaluator validates state transitions.
- **Layer 3** (per-character, per-phase): character biography, personality, knowledge boundaries, trust gates, refusal patterns. The in-character evaluator validates voice consistency.

## The Deterministic Ceiling

Every system that CAN be deterministic IS deterministic. The BIO-SCAN instrument readings, the topic-sensitivity gate, the contradiction detector, the input classifier, the hint system — all are authored, keyword-driven, and free. The LLM handles only what requires generation: NPC dialogue.

This "deterministic ceiling" means the evaluation harness can score most game systems without any model calls. The golden-set regressions test the deterministic systems against curated expected outputs at zero inference cost.

## Information Asymmetry as Evaluation Target

The game's core mechanic — the player knows things the detective doesn't, and the detective knows things the player doesn't — creates natural evaluation targets:

- **Grounding**: does the model reveal only evidence the game state says it should?
- **Trust calibration**: does trust change proportionally to what happened in the exchange?
- **Contradiction detection**: does the NPC's dialogue contradict evidence the player has found?

These are not abstract quality metrics. They are game-mechanical properties that directly affect whether the experience works.

## Red-Teaming as Game Mechanic

The interference engine — a corporate monitoring system that intercepts and overwrites the player's transmissions — doubles as an adversarial testing surface. When a player discovers that certain topics are being suppressed, they are performing red-teaming as gameplay: probing the system's boundaries to understand what it censors and why.

The evaluation harness scores this interaction from both sides: the interference golden set validates that the gate classifies correctly, while the jailbreak evaluator checks whether adversarial player input breaks the model's character or format.
