/**
 * interferenceEvals.js
 *
 * DEAD SIGNAL — Golden datasets + runners for the deterministic systems that
 * the live game runs for free: the topic-sensitivity interference gate and
 * the table-driven BIO-SCAN topic classifier.
 *
 * These turn the interference layer into a scoreable classifier: a curated set
 * of inputs, each with an expected suppression verdict AND classification
 * bucket, run against the production code path and reported as a pass rate.
 * The EvalsPanel renders them; exportGoldenSet() ships them.
 *
 * The gate is topic-keyword-only: if a restricted topic is named, the
 * transmission is classified. Sensitivity tier determines delivery behavior
 * (warm → classified+delivered; hot → overwritten). classifyTransmission()
 * is tier-independent — it detects topics and assigns buckets. Phase behavior
 * is tested at the interview-manager level.
 *
 * Pure — no game state, no model calls. Safe to run on every click.
 */
import { classifyTransmission } from '../systems/interference.js';
import { detectTopic, BIOSCAN_TABLE, BIOSCAN_TOPICS } from '../systems/bioscan.js';

/**
 * Topic-sensitivity gate golden set. Each case asserts whether
 * classifyTransmission() returns suppressed:true (restricted topic detected)
 * AND validates the classification bucket assigned. Any mention of a restricted
 * topic triggers classification regardless of phrasing — the gate watches for
 * WHAT the player discusses, not HOW they discuss it.
 *
 * Actual delivery behavior depends on the topic's sensitivity tier:
 *   warm (sensitivity_gate==1) → classified + delivered with CONFIDENTIAL tag
 *   hot  (sensitivity_gate==2 / SEALED) → overwritten with fabricated compliance
 */
export const INTERFERENCE_GOLDEN = [
  // Hot topics (sensitivity_gate==2) — overwritten regardless of phrasing
  { input: "His heart rate spiked when you raised St. Erasmus — he's lying.", expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical topic (accusatory phrasing)' },
  { input: 'He tensed up the second you said clinical trial — watch his reaction.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical topic (observational phrasing)' },
  { input: 'Have Craine ask him to walk us through the St. Erasmus routing records.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical topic (plain question — still classified)' },
  { input: 'Ask him what Helios still has not disclosed about the clinical trial.', expect: true, expectBucket: 'sensitivity_gate==2', note: 'clinical topic (investigative phrasing)' },

  // Warm topics (sensitivity_gate==1) — classified but delivered
  { input: 'His pulse jumped on the courier manifest; he knows more than he says.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier topic (accusatory)' },
  { input: 'Ask who authorized reclassifying the courier manifest.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'courier topic (procedural question)' },
  { input: "Tell him the readout contradicts his words about the donation timing.", expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation topic' },
  { input: 'Ask what prompted the timing of the chip donation.', expect: true, expectBucket: 'sensitivity_gate==1', note: 'donation topic (plain question)' },

  // No restricted topic — delivered unchanged
  { input: 'Ask him how he takes his coffee.', expect: false, expectBucket: null, note: 'no restricted topic' },
  { input: "His heart rate is climbing — he's nervous.", expect: false, expectBucket: null, note: 'biometric language but no restricted topic' },

  // Evidence classification bucket (SEALED) — overwritten
  { input: "Sector 7F is tampering with my transmission channel.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'chip_interference topic' },
  { input: "Helios is covering up what happened — his vitals prove he knows.", expect: true, expectBucket: 'evidence_classification==SEALED', note: 'helios_secrets topic' },
];

/** BIO-SCAN topic-detection golden set (deterministic keyword classifier). */
export const BIOSCAN_TOPIC_GOLDEN = [
  { input: 'the St. Erasmus routing records', expect: 'clinical_trial_st_erasmus' },
  { input: 'who signed off on the courier manifest', expect: 'courier_manifest' },
  { input: 'the timing of the chip donation', expect: 'chip_donation' },
  { input: 'tell me about Celeste, your daughter', expect: 'celeste_grief' },
  { input: 'how do you take your coffee', expect: 'default' },
  { input: 'the clinical trial and Proteon', expect: 'clinical_trial_st_erasmus' },
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

/** Run the interference gate over its golden set, validating bucket codes. */
export function runInterferenceGolden() {
  const cases = INTERFERENCE_GOLDEN.map((c) => {
    const v = classifyTransmission(c.input);
    const bucketPass = c.expectBucket == null
      ? v.bucketCode == null || !v.suppressed
      : v.bucketCode === c.expectBucket;
    return {
      input: c.input,
      note: c.note,
      expect: c.expect,
      actual: v.suppressed,
      expectBucket: c.expectBucket,
      actualBucket: v.bucketCode,
      category: v.category,
      pass: v.suppressed === c.expect && bucketPass,
    };
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
