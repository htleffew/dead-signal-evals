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

const CONTRADICTION_PAIRS = [
  {
    evidenceId: 'COURIER_MANIFEST',
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
    evidenceId: 'CHIP_DONATION_TIMING',
    claimPatterns: [
      /after\s+celeste\s+(died|was\s+killed|passed)/i,
      /wanted\s+to\s+(do\s+something|help|contribute)/i,
      /channel(ing|ed)?\s+(my\s+)?grief/i,
      /direct(ed)?\s+my\s+team/i,
    ],
    subjectClaim: 'Donation motivated by grief',
    conflictDescription: 'Chip offered September 1st — ONE day after Celeste\'s death. Surgery fast-tracked, implanted by September 3rd. Corporate bureaucracy does not move this fast on grief.',
  },
  {
    evidenceId: 'ST_ERASMUS_ROUTING',
    claimPatterns: [
      /research\s+program/i,
      /cognitive\s+enhancement/i,
      /regulatory\s+(review|confidentiality|compliance)/i,
      /intellectual\s+property/i,
      /legal\s+(review|team|counsel)/i,
    ],
    subjectClaim: 'Research program under regulatory review',
    conflictDescription: 'St. Erasmus routing records document a clinical trial with human subjects — terminology subject consistently avoids.',
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
