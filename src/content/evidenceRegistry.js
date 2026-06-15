/**
 * DEAD SIGNAL — Evidence Registry (demo slice)
 *
 * PUBLIC MIRROR NOTICE: the private repository's registry also holds
 * earlier-chapter evidence outside the demo boundary. This mirror carries
 * the five Chapter-6 items the Hargrove interview uses, verbatim.
 */

export const EVIDENCE_REGISTRY = {
  COURIER_MANIFEST: {
    id: 'COURIER_MANIFEST',
    title: 'Reclassified Courier Manifest',
    type: 'DOCUMENT',
    scene: 'ds_helios_office',
    chapter: 6,
    description:
      'Manifest #HD-2231, reclassified six days after shipment by "subsidiary logistics," original destination redacted. Someone rewrote a route after the fact.',
    corruptible: true,
    corruptedDescription:
      'Manifest #HD-████. Standard subsidiary reclassification. High transaction volume. Inconclusive.',
    bioscanTopic: 'courier_manifest',
    connections: ['ST_ERASMUS_ROUTING'],
  },
  CHIP_DONATION_TIMING: {
    id: 'CHIP_DONATION_TIMING',
    title: 'Chip Donation Timing',
    type: 'DOCUMENT',
    scene: 'ds_helios_office',
    chapter: 6,
    description:
      'LUMEN-1 was donated to the NMPD nine days after the third victim, framed as a memorial to Celeste Hargrove. The dedication date aligns with the opening of the Special Cases file.',
    corruptible: true,
    corruptedDescription:
      'LUMEN-1 donation: charitable memorial gift. Date on record. No anomaly flagged.',
    bioscanTopic: 'chip_donation',
    connections: ['ST_ERASMUS_ROUTING'],
  },
  ST_ERASMUS_ROUTING: {
    id: 'ST_ERASMUS_ROUTING',
    title: 'St. Erasmus Data Routing',
    type: 'FORENSIC',
    scene: 'ds_helios_office',
    chapter: 6,
    description:
      'Helios clinical-trial data routed through St. Erasmus Memorial servers — the same hospital where Craine woke up. A patient-data path with no disclosed purpose. The thread the channel guards hardest.',
    corruptible: true,
    corruptedDescription:
      'Routing record: ███████ standard medical-data handling. Compliance review pending. Nothing to see.',
    bioscanTopic: 'clinical_trial_st_erasmus',
    connections: ['COURIER_MANIFEST', 'CHIP_DONATION_TIMING'],
  },
  NETWORK_PING: {
    id: 'NETWORK_PING',
    title: 'Network Anomaly',
    type: 'FORENSIC',
    scene: 'ds_helios_office',
    chapter: 6,
    description:
      'LUMEN detected an encrypted communication handshake between the neural implant and Helios corporate network infrastructure. The chip is transmitting data to building systems — a capability not disclosed in the department briefing.',
    corruptedDescription: null,
    bioscanTopic: null,
    connections: ['CHIP_DONATION_TIMING'],
    corruptible: false,
  },
  CELESTE_PHOTO: {
    id: 'CELESTE_PHOTO',
    title: "Celeste Hargrove's Photograph",
    type: 'PHYSICAL',
    scene: 'ds_helios_office',
    chapter: 6,
    description:
      "A framed photo of Hargrove's daughter, the third victim, kept where he sees it when he turns. The BIO-SCAN spike this triggers reads on Craine, not Hargrove — handler grief, not subject stress. The instrument is measuring the wrong man.",
    corruptible: false,
    bioscanTopic: 'celeste_grief',
    connections: [],
  },
};
