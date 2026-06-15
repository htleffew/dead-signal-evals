/**
 * contradictionDetector.js — DEAD SIGNAL
 *
 * Cross-references Hargrove's spoken dialogue against evidence the player
 * has discovered. Returns PATTERN CONFLICT data when a contradiction is
 * detected. Deterministic, keyword-driven, no LLM cost.
 *
 * Contradiction detection is GATED on evidence discovery: if the player
 * hasn't examined the courier manifest hotspot, LUMEN can't cross-reference
 * Hargrove's claims about logistics. Exploring the room rewards sharper
 * analytics during the interview.
 */
import { CONTRADICTION_BUCKET } from './interference.js';
import { getEvidence, interviewBible } from '../content/knowledge/index.js';

// ── Chunk 13: canonical-id references ────────────────────────────────────────
// The four contradiction evidence ids are resolved through the canonical source
// rather than carried as free literals, so an id rename surfaces as a resolution
// error at module load instead of silently disabling a pair. The canonical set
// is the interview-bible contradictionDetection.evidenceIds list; each id is
// also resolved against the evidence bible via getEvidence so a record rename is
// likewise caught. resolveEvidenceId(canonicalId) returns the id unchanged when
// it resolves and throws when it does not.
const CONTRADICTION_EVIDENCE_IDS =
  interviewBible?.entries?.[0]?.contradictionDetection?.evidenceIds || [];

function resolveEvidenceId(canonicalId) {
  if (!CONTRADICTION_EVIDENCE_IDS.includes(canonicalId)) {
    throw new Error(
      `contradictionDetector: evidence id '${canonicalId}' is not in the interview-bible canonical contradictionDetection set [${CONTRADICTION_EVIDENCE_IDS.join(', ')}]`
    );
  }
  if (!getEvidence(canonicalId)) {
    throw new Error(
      `contradictionDetector: evidence id '${canonicalId}' does not resolve to an evidence-bible record`
    );
  }
  return canonicalId;
}

const CONTRADICTION_PAIRS = [
  {
    evidenceId: resolveEvidenceId('COURIER_MANIFEST'),
    claimPatterns: [
      /standard\s+(logistics|operations)/i,
      /thousands?\s+of\s+transactions/i,
      /wouldn.t\s+have\s+visibility/i,
      /routine\s+(audit|operations|logistics)/i,
    ],
    subjectClaim: 'Standard logistics operations',
    conflictDescription: 'Reclassified routing on 2057.08.20, post-mortem of Marsh, Y. Reclassification originated from corporate-level system access.',
  },
  {
    evidenceId: resolveEvidenceId('CHIP_DONATION_TIMING'),
    claimPatterns: [
      /after\s+celeste\s+(died|was\s+killed|passed)/i,
      /wanted\s+to\s+(do\s+something|help|contribute)/i,
      /channel(ing|ed)?\s+(my\s+)?grief/i,
      /direct(ed)?\s+my\s+team/i,
    ],
    subjectClaim: 'Donation motivated by grief',
    conflictDescription: 'Celeste died August 30th. Chip offered September 1st, surgery fast-tracked, implanted by September 3rd, plaque dedicated September 5th. Corporate bureaucracy does not move this fast on grief.',
  },
  {
    evidenceId: resolveEvidenceId('ST_ERASMUS_ROUTING'),
    claimPatterns: [
      /research\s+program/i,
      /cognitive\s+enhancement/i,
      /regulatory\s+(review|confidentiality|compliance)/i,
      /intellectual\s+property/i,
      /legal\s+(review|team|counsel)/i,
    ],
    subjectClaim: 'Research program under regulatory review',
    conflictDescription: 'St. Erasmus routing records document a clinical trial with human subjects, terminology the subject consistently avoids.',
  },
  {
    evidenceId: resolveEvidenceId('DELACROIX_NOTEBOOK'),
    claimPatterns: [
      /no\s+(one|outside|independent).*(investigat|look)/i,
      /no\s+(external|outside)\s+(parties|scrutiny|interest)/i,
      /unaware\s+of\s+(any\s+)?(outside|independent|external)/i,
      /first\s+(I.ve|I\s+have)\s+heard/i,
      /nobody.*(poking|digging|asking)\s+(around|questions)/i,
    ],
    subjectClaim: 'No independent investigation of Helios',
    conflictDescription: 'Delacroix case notebook documents an active independent investigation into Helios: a retired forensic technician pursuing the connection the subject denies exists.',
  },
];

/**
 * Check Hargrove's spoken response for contradictions against discovered evidence.
 *
 * @param {string} hargroveResponse  Hargrove's dialogue text
 * @param {string[]} discoveredEvidence  Array of evidence IDs the player has found
 * @returns {object|null}  PATTERN CONFLICT data, or null if no contradiction detected
 */
export function checkContradiction(hargroveResponse, discoveredEvidence) {
  if (!hargroveResponse || !discoveredEvidence?.length) return null;

  for (const pair of CONTRADICTION_PAIRS) {
    // Gate: player must have discovered this evidence
    if (!discoveredEvidence.includes(pair.evidenceId)) continue;

    // Check if Hargrove's response matches any claim pattern
    const matched = pair.claimPatterns.some(p => p.test(hargroveResponse));
    if (matched) {
      return {
        evidenceId: pair.evidenceId,
        subjectClaim: pair.subjectClaim,
        conflictDescription: pair.conflictDescription,
        bucket: CONTRADICTION_BUCKET.code,
        status: 'routing suspended',
      };
    }
  }

  return null;
}
