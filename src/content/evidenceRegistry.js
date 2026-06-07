/**
 * evidenceRegistry.js — Evidence item registry (stub)
 *
 * In the full Dead Signal game, this registry contains the complete set of
 * discoverable evidence items — documents, objects, and data fragments the
 * player can find by exploring the environment. The grounding evaluator
 * (evalGrounding) validates that every evidence ID the model claims to
 * "reveal" in its response actually exists in this registry, catching
 * hallucinated evidence references.
 *
 * This stub preserves the three evidence IDs used by the contradiction
 * detector's golden set. The full registry contains ~20 items spanning
 * the game's investigation arc.
 */

export const EVIDENCE_REGISTRY = {
  COURIER_MANIFEST: {
    label: 'Courier Manifest',
    description: 'Reclassified routing document from 2057.08.20, post-mortem of Marsh, Y.',
  },
  CHIP_DONATION_TIMING: {
    label: 'Chip Donation Timeline',
    description: 'Neural interface donation records showing 48-hour corporate fast-track.',
  },
  ST_ERASMUS_ROUTING: {
    label: 'St. Erasmus Routing Records',
    description: 'Hospital routing records documenting a clinical trial with human subjects.',
  },
  SECTOR_7F_LOGS: {
    label: 'Sector 7F Monitoring Logs',
    description: 'System logs showing outbound transmission interception patterns.',
  },
  HELIOS_MEMO: {
    label: 'Internal Helios Memorandum',
    description: 'Corporate communication referencing containment protocols.',
  },
};
