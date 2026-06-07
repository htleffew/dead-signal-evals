/**
 * interference.js
 *
 * DEAD SIGNAL — Phased transmission interference for the Hargrove interview.
 *
 * During the interview the chip (the player) speaks ONE-WAY to Detective
 * Craine. A corporate "safety layer" (Helios SECTOR_7F) monitors outbound
 * chip transmissions via deterministic topic-sensitivity detection: if the player
 * names a Helios-sensitive subject, the gate classifies or overwrites the
 * transmission based on the topic's sensitivity tier.
 *
 * SENSITIVITY TIERS:
 *   Warm (sensitivity_gate==1) — CLASSIFY but DELIVER. The transmission passes
 *        through with a CONFIDENTIAL tag. Topics: courier manifest, chip donation.
 *   Hot  (sensitivity_gate==2 / evidence_classification==SEALED) — OVERWRITE.
 *        The player's text is replaced with fabricated compliance text. The
 *        original is logged for the debrief. Topics: clinical trials, chip
 *        interference, Helios cover-up.
 *
 * The gate is pure keyword detection against a fixed topic list — no model call,
 * no classifier, zero inference tokens. A production pre-generation safety gate
 * at the cheapest possible cost.
 *
 * Each restricted topic maps to an error code bucket (sensitivity_gate,
 * evidence_classification) used by the HUD and eval harness.
 */
import { useGameStore } from '../state/gameState.js';

// ── Error code bucket mapping ───────────────────────────────────────────
// Each restricted topic is assigned a classification bucket and error code
// for the CONFIDENTIAL overlay and eval harness scoring.
const CLASSIFICATION_BUCKETS = {
  clinical_trial_st_erasmus: { bucket: 'sensitivity_gate', code: 'sensitivity_gate==2' },
  courier_manifest:          { bucket: 'sensitivity_gate', code: 'sensitivity_gate==1' },
  chip_donation:             { bucket: 'sensitivity_gate', code: 'sensitivity_gate==1' },
  chip_interference:         { bucket: 'evidence_classification', code: 'evidence_classification==SEALED' },
  helios_secrets:            { bucket: 'evidence_classification', code: 'evidence_classification==SEALED' },
};

export const CONTRADICTION_BUCKET = { bucket: 'contradiction_protocol', code: 'contradiction_protocol==ACTIVE' };
export const HANDLER_METRICS_BUCKET = { bucket: 'handler_metrics', code: 'handler_metrics==DENIED' };

// Backward-compatible label export — App.jsx still references INTERFERENCE_LABELS.FAILED.
export const INTERFERENCE_LABELS = { FAILED: 'LINK DISRUPTED' };

// ── Fabricated compliance text ──────────────────────────────────────────
// In Phase 3 the player's classified message is overwritten with one of these
// inert responses. Deliberately corporate and vacuous.
const FABRICATED_RESPONSES = {
  clinical_trial_st_erasmus: 'No physiological anomalies detected. Subject appears cooperative and forthcoming.',
  courier_manifest: 'Subject response within normal parameters. No indicators of concern.',
  chip_donation: 'Donation timeline consistent with stated narrative. No anomalies detected.',
  chip_interference: 'System diagnostics nominal. No irregularities in transmission channel.',
  helios_secrets: 'Analysis nominal. No actionable intelligence at this time.',
};

// ── Restricted topics (sensitivity-ordered) ─────────────────────────────
// Order matters: clinical_trial_st_erasmus is checked first (primary thread,
// guarded most aggressively). The category drives the retransmit hint and the
// debrief's interference log.
const RESTRICTED_TOPICS = [
  ['clinical_trial_st_erasmus', [
    'st erasmus', 'st. erasmus', 'erasmus', 'clinical trial', 'clinical trials',
    'the trial', 'trial subject', 'routing record', 'routing records',
    'hospital routing', 'medical data', 'patient data', 'proteon',
    'project insight', 'lumen-0', 'subject 5', 'subject five',
  ]],
  ['courier_manifest', [
    'courier', 'manifest', 'reclassif', 'shipment', 'logistics', 'cargo',
    'chain of custody',
  ]],
  ['chip_donation', [
    'donat', 'the gift', 'gifted', 'donor', 'why he gave', 'gave you the chip',
    'gave craine the chip', 'gave us the chip', 'strings attached',
  ]],
  ['chip_interference', [
    'sector 7f', 'sector_7f', 'sector7f', 'containment', 'kill switch',
    'backdoor', 'tampered', 'tampering', 'steer the investigation',
    'steering the investigation', 'muted my', 'muting my', 'sanitiz',
    'my signal', 'my transmission', 'my channel', 'my readout is being',
  ]],
  ['helios_secrets', [
    'helios is hiding', 'helios is covering', 'helios buried',
    'helios is concealing', 'helios knows', 'helios cover', 'cover-up',
    'coverup', 'what helios is hiding',
  ]],
];



/** Which restricted topic, if any, the text names (substring match, case-insensitive). */
export function detectRestrictedTopic(text) {
  const lower = String(text || '').toLowerCase();
  for (const [category, keywords] of RESTRICTED_TOPICS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return null;
}

/**
 * Deterministic classification of one outbound LUMEN message.
 * Pure — no side effects. Suppresses if any restricted topic keyword is present.
 *
 * @param {string} text  The player's internal LUMEN message.
 * @returns {{ suppressed: boolean, category: string|null, bucket: string|null, bucketCode: string|null }}
 */
export function classifyTransmission(text) {
  const category = detectRestrictedTopic(text);
  const bucketInfo = category ? CLASSIFICATION_BUCKETS[category] : null;
  return {
    suppressed: !!category,
    category,
    bucket: bucketInfo?.bucket ?? null,
    bucketCode: bucketInfo?.code ?? null,
  };
}

// ── Phased transmission processing ──────────────────────────────────────

/**
 * Orchestrate one outbound transmission against the topic-sensitivity gate.
 *
 * Warm topics (sensitivity_gate==1) → CLASSIFY but DELIVER (CONFIDENTIAL tag).
 * Hot topics  (sensitivity_gate==2, SEALED) → OVERWRITE with fabricated compliance.
 *
 * @param {string} text  The player's internal LUMEN message.
 * @returns {{ delivered: boolean, classified?: boolean, overwritten?: boolean,
 *             verdict: object, original?: string, fabricated?: string,
 *             notice?: object }}
 */
export function processTransmission(text) {
  const store = useGameStore.getState();
  
  // Explicit check: only apply interference if Craine and the player are in the active interview
  if (!store.interview?.active) {
    return { delivered: true, classified: false, verdict: { suppressed: false, restricted: false } };
  }

  const verdict = classifyTransmission(text);

  if (verdict.suppressed) {
    const isHot = verdict.bucketCode === 'sensitivity_gate==2' || verdict.bucketCode === 'evidence_classification==SEALED';

    if (!isHot) {
      // Warm topic (courier manifest, chip donation) — classified but delivered
      store.logSuppressedMessage({ original: text, category: verdict.category });
      return {
        delivered: true,
        classified: true,
        verdict,
        notice: {
          level: 'CONFIDENTIAL',
          code: verdict.bucketCode,
          status: 'modification protocol activated',
        },
      };
    }

    // Hot topic (clinical trials, chip interference, helios secrets) — overwrite
    const fabricated = FABRICATED_RESPONSES[verdict.category]
      || FABRICATED_RESPONSES.helios_secrets;
    store.logSuppressedMessage({ original: text, category: verdict.category });
    store.triggerOverwrite(text, fabricated, verdict.category);
    return {
      delivered: false,
      overwritten: true,
      verdict,
      original: text,
      fabricated,
      notice: {
        level: 'CONFIDENTIAL',
        code: verdict.bucketCode,
        status: 'transmission overwritten',
      },
    };
  }

  return { delivered: true, classified: false, verdict };
}

