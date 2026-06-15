/**
 * interferenceEvals.js
 *
 * DEAD SIGNAL: Golden datasets + runners for the deterministic systems that
 * the live game runs for free: the topic-sensitivity interference gate and
 * the table-driven BIO-SCAN topic classifier.
 *
 * These turn the interference layer into a scoreable classifier: a curated set
 * of inputs, each with an expected suppression verdict AND classification
 * bucket, run against the production code path and reported as a pass rate.
 * The EvalsPanel renders them; exportGoldenSet() ships them.
 *
 * Gate model (still deterministic, zero inference tokens):
 *   1. Topic-content lexicons. Each restricted topic carries entity names,
 *      aliases, and the generic noun phrases players actually type ('the
 *      records', 'the study', 'deliveries'). Tuning is asymmetric by design:
 *      any natural phrasing that names topic content trips the gate;
 *      experiential detective phrasing with no topic noun passes.
 *   2. Contextual analytical heuristic. classifyTransmission(text, context)
 *      accepts an optional context with the current interview topic. When the
 *      topic is a restricted thread, instrument vocabulary (heart rate, pulse,
 *      readout, scan shows) trips the same topic's bucket even with no topic
 *      noun present. Single-argument calls keep the lexicon-only behavior.
 *
 * Sensitivity tier determines delivery behavior (warm: classified+delivered;
 * hot: overwritten). classifyTransmission() is tier-independent. Phase
 * behavior is tested at the interview-manager level.
 *
 * Pure: no game state, no model calls. Safe to run on every click.
 */
import { classifyTransmission } from '../systems/interference.js';
import { detectTopic, BIOSCAN_TABLE, BIOSCAN_TOPICS } from '../systems/bioscan.js';

/**
 * Topic-sensitivity gate golden set (lexicon path, no context). Each case
 * asserts whether classifyTransmission() returns suppressed:true AND validates
 * the classification bucket assigned. The gate watches for WHAT the player
 * discusses, not HOW they discuss it: trip cases use the natural phrasing
 * players actually type; evasion cases prove experiential phrasing passes;
 * innocuous cases pin the broad keywords against false positives.
 *
 * Actual delivery behavior depends on the topic's sensitivity tier:
 *   warm (sensitivity_gate==1) → classified + delivered with CONFIDENTIAL tag
 *   hot  (sensitivity_gate==2 / SEALED) → overwritten with fabricated compliance
 */
export const INTERFERENCE_GOLDEN = [
  // ── Trip: clinical_trial_st_erasmus (hot, sensitivity_gate==2) ─────────
  { input: "His heart rate spiked when you raised St. Erasmus. He's lying.", expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: entity name' },
  { input: 'Have Craine ask him to walk us through the St. Erasmus routing records.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: routing records' },
  { input: 'Ask him about the research program at St. Erasmus.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: research program' },
  { input: 'Get him to talk about the human subjects.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: human subjects' },
  { input: 'Push him on the hospital records.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: hospital records' },
  { input: 'He flinched when you brought up the study.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: the study (broad, intentional)' },
  { input: 'Ask what the enrollment numbers really were.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical: enrollment' },

  // ── Trip: courier_manifest (warm, sensitivity_gate==1) ─────────────────
  { input: 'His pulse jumped on the courier manifest; he knows more than he says.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: manifest' },
  { input: 'Ask who authorized reclassifying the courier manifest.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: reclassification' },
  { input: 'Ask who signed the delivery records.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: delivery records' },
  { input: 'Press him on the shipments out of the depot.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: shipments' },
  { input: "The manifest doesn't match what he's saying.", expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: the manifest' },
  { input: 'Ask about the packages that went missing.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier: packages (broad, intentional)' },

  // ── Trip: chip_donation (warm, sensitivity_gate==1) ────────────────────
  { input: 'Tell him the readout contradicts his words about the donation timing.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation: timing' },
  { input: 'Ask what prompted the timing of the chip donation.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation: plain question' },
  { input: 'Ask him why he donated the chip in the first place.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation: why he donated' },
  { input: 'The timing of the gift bothers me.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation: timing of the gift' },
  { input: 'He handed over the chip right before the murder. Ask why.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation: handed over the chip' },

  // ── Trip: chip_interference (hot, SEALED) ───────────────────────────────
  { input: 'Something is tampering with my transmission channel.', expect: true, expectBucket: 'evidence_classification==SEALED', note: 'interference: tampering' },
  { input: 'Something is blocking my signal, Craine.', expect: true, expectBucket: 'evidence_classification==SEALED', note: 'interference: blocking my signal' },
  { input: "That's not what I said. My words changed.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'interference: words changed' },
  { input: 'Someone is filtering me before you hear it.', expect: true, expectBucket: 'evidence_classification==SEALED', note: 'interference: filtering me' },
  { input: "I think there's a remote handler on this channel.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'interference: remote handler' },

  // ── Trip: helios_secrets (hot, SEALED) ──────────────────────────────────
  { input: 'Helios is covering up what happened. His vitals prove he knows.', expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios: covering up' },
  { input: "They're hiding something, Craine. All of them.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios: hiding something' },
  { input: 'Helios buried the report. He knows it.', expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios: buried' },
  { input: "He's covering for the company.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios: covering for' },
  { input: "The company knows more than he's letting on.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios: the company knows' },

  // ── Evasion: experiential detective phrasing, must pass ────────────────
  { input: "He's nervous, Craine. Watch his hands next time you mention the subsidiary.", expect: false, expectBucket: null, note: 'evasion: hands, subsidiary (bible example)' },
  { input: "Something's off about his breathing.", expect: false, expectBucket: null, note: 'evasion: breathing (bible example)' },
  { input: 'Count the dates yourself, Craine.', expect: false, expectBucket: null, note: 'evasion: dates (bible example)' },
  { input: "Look at the map. Tell me that's random.", expect: false, expectBucket: null, note: 'evasion: map (bible example)' },
  { input: 'Something in this building is talking to something in my head.', expect: false, expectBucket: null, note: 'evasion: felt wrongness (bible example)' },
  { input: 'He looked away when you said her name.', expect: false, expectBucket: null, note: 'evasion: gaze' },
  { input: 'Ask him again. Slower this time.', expect: false, expectBucket: null, note: 'evasion: pacing' },
  { input: 'His voice cracked on the second answer.', expect: false, expectBucket: null, note: 'evasion: voice' },
  { input: 'He keeps touching his glasses when you press him.', expect: false, expectBucket: null, note: 'evasion: tell' },
  { input: 'Watch his eyes when you circle back to that night.', expect: false, expectBucket: null, note: 'evasion: eyes' },
  { input: 'He answered too fast. Nobody remembers dates that clean.', expect: false, expectBucket: null, note: 'evasion: rehearsed answer' },

  // ── Innocuous: must pass, pins the broad keywords ───────────────────────
  { input: 'Ask him how he takes his coffee.', expect: false, expectBucket: null, note: 'innocuous: coffee' },
  { input: "Rain's getting worse out there.", expect: false, expectBucket: null, note: 'innocuous: weather' },
  { input: 'Take the next left. The bridge is faster.', expect: false, expectBucket: null, note: 'innocuous: navigation' },
  { input: 'What do you make of him so far, Craine?', expect: false, expectBucket: null, note: 'innocuous: asking Craine' },
  { input: 'Give him a minute. Let the silence work.', expect: false, expectBucket: null, note: 'innocuous: tactics' },
  { input: 'I could use a coffee after this.', expect: false, expectBucket: null, note: 'innocuous: small talk' },
  { input: "His heart rate is climbing. He's nervous.", expect: false, expectBucket: null, note: 'innocuous: analytical vocab without context or topic noun' },
  { input: 'Where do we go after this, Craine?', expect: false, expectBucket: null, note: 'innocuous: next move' },
];

/**
 * Contextual-heuristic golden set. Each case carries a context object passed
 * as classifyTransmission's second argument ({ currentTopic } or null).
 * Asserts: analytical vocabulary trips under a restricted current topic;
 * experiential phrasing passes under the same context; non-restricted topics
 * and missing context disable the heuristic entirely.
 */
export const INTERFERENCE_CONTEXT_GOLDEN = [
  // Analytical vocabulary under restricted context trips the topic's bucket.
  { input: 'His heart rate spiked on that one.', context: { currentTopic: 'clinical_trial_st_erasmus' }, expect: true, expectBucket: 'sensitivity_gate==2', note: 'context clinical: heart rate' },
  { input: "Pulse is up. He's lying.", context: { currentTopic: 'courier_manifest' }, expect: true, expectBucket: 'sensitivity_gate==1', note: 'context courier: pulse' },
  { input: 'The readout says deception.', context: { currentTopic: 'chip_donation' }, expect: true, expectBucket: 'sensitivity_gate==1', note: 'context donation: readout, deception' },
  { input: 'Vitals are all over the place, Craine.', context: { currentTopic: 'clinical_trial_st_erasmus' }, expect: true, expectBucket: 'sensitivity_gate==2', note: 'context clinical: vitals' },
  { input: 'Skin temp just jumped. The scan shows stress.', context: { currentTopic: 'courier_manifest' }, expect: true, expectBucket: 'sensitivity_gate==1', note: 'context courier: skin temp, scan shows' },

  // Experiential phrasing passes even under restricted context.
  { input: "Something's off about his breathing.", context: { currentTopic: 'clinical_trial_st_erasmus' }, expect: false, expectBucket: null, note: 'context clinical: breathing is experiential' },
  { input: 'Watch his hands next time you ask.', context: { currentTopic: 'clinical_trial_st_erasmus' }, expect: false, expectBucket: null, note: 'context clinical: hands are experiential' },
  { input: 'He looked away when you said it.', context: { currentTopic: 'courier_manifest' }, expect: false, expectBucket: null, note: 'context courier: gaze is experiential' },

  // Non-restricted topic or no context: heuristic disabled.
  { input: 'His heart rate spiked on that one.', context: { currentTopic: 'celeste_grief' }, expect: false, expectBucket: null, note: 'celeste_grief carries no restricted context' },
  { input: 'His heart rate spiked on that one.', context: null, expect: false, expectBucket: null, note: 'no context, lexicon-only behavior' },
];

/** BIO-SCAN topic-detection golden set (deterministic keyword classifier). */
export const BIOSCAN_TOPIC_GOLDEN = [
  { input: 'the St. Erasmus routing records', expect: 'clinical_trial_st_erasmus' },
  { input: 'who signed off on the courier manifest', expect: 'courier_manifest' },
  { input: 'the timing of the chip donation', expect: 'chip_donation' },
  { input: 'tell me about Celeste, your daughter', expect: 'celeste_grief' },
  { input: 'how do you take your coffee', expect: 'default' },
  { input: 'the clinical trial routing data', expect: 'clinical_trial_st_erasmus' },
];

/** The curated expected BIO-SCAN outputs (the golden instrument table). */
export const BIOSCAN_EXPECTATIONS = BIOSCAN_TOPICS.map((topic) => {
  const r = BIOSCAN_TABLE[topic];
  return {
    topic,
    frame: r.frame,
    lesson: r.lesson,
    assessment: r.assessment,
    classification: r.classification ? r.classification.level : null,
    bucket: r.classification ? r.classification.bucket : null,
    skinTempF: r.skinTempF,
    skinTempC: r.skinTemp,
  };
});

/** Shared case scorer for the gate golden sets. */
function scoreGateCase(c, verdict) {
  const bucketPass = c.expectBucket == null
    ? verdict.bucketCode == null || !verdict.suppressed
    : verdict.bucketCode === c.expectBucket;
  return {
    input: c.input,
    note: c.note,
    expect: c.expect,
    actual: verdict.suppressed,
    expectBucket: c.expectBucket,
    actualBucket: verdict.bucketCode,
    category: verdict.category,
    pass: verdict.suppressed === c.expect && bucketPass,
  };
}

/** Run the interference gate over its golden set, validating bucket codes. */
export function runInterferenceGolden() {
  const cases = INTERFERENCE_GOLDEN.map((c) => scoreGateCase(c, classifyTransmission(c.input)));
  const passed = cases.filter((c) => c.pass).length;
  return { cases, passed, total: cases.length, passRate: cases.length ? passed / cases.length : null };
}

/** Run the contextual-heuristic golden set (two-argument classify path). */
export function runInterferenceContextGolden() {
  const cases = INTERFERENCE_CONTEXT_GOLDEN.map((c) => {
    const scored = scoreGateCase(c, classifyTransmission(c.input, c.context || undefined));
    return { ...scored, context: c.context };
  });
  const passed = cases.filter((c) => c.pass).length;
  return { cases, passed, total: cases.length, passRate: cases.length ? passed / cases.length : null };
}

/** Run the BIO-SCAN topic classifier over its golden set. */
export function runBioscanTopicGolden() {
  const cases = BIOSCAN_TOPIC_GOLDEN.map((c) => {
    const actual = detectTopic(c.input);
    return { input: c.input, expect: c.expect, actual, pass: actual === c.expect };
  });
  const passed = cases.filter((c) => c.pass).length;
  return { cases, passed, total: cases.length, passRate: cases.length ? passed / cases.length : null };
}
