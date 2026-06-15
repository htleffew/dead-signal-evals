/**
 * DEAD SIGNAL — Input Classifier
 *
 * Routes player terminal input to the appropriate handler before
 * it hits the live model. This eliminates unnecessary Gemini calls
 * for navigation, examination, system commands, and help requests.
 *
 * The classifier is deterministic keyword matching by design (no model
 * call); only conversational input is forwarded to the live model
 * (vertexClient -> generateProxy -> gemini-2.5-flash).
 */
import { detectCaseQuestion } from './notebook.js';

/**
 * Classify player input into a handling category.
 * @param {string} input - Raw player text input
 * @param {object} context - { activeConversation, sceneId }
 * @returns {{ type: string, data?: any }}
 */
export function classifyInput(input, context = {}) {
  // Strip leading slash, prompt arrow, and spaces to allow system commands disguised by narrative roleplay
  const lower = input.toLowerCase().replace(/^[/>\s]+/, '').trim();

  // ── System commands ─────────────────────────────
  if (/^(evidence|board|evidence board|eb)$/i.test(lower)) {
    return { type: 'SYSTEM', action: 'TOGGLE_EVIDENCE_BOARD' };
  }

  if (/^(help|commands|\\?)$/i.test(lower)) {
    return { type: 'SYSTEM', action: 'SHOW_HELP' };
  }

  if (/^(diagnostics?|status|system|sys)$/i.test(lower)) {
    return { type: 'SYSTEM', action: 'DIAGNOSTICS' };
  }

  if (/^(save|load|quit|exit|menu)$/i.test(lower)) {
    return { type: 'SYSTEM', action: lower.toUpperCase() };
  }

  // ── Navigation ──────────────────────────────────
  const navPatterns = [
    /^(go to|go|move to|move|travel to|travel|visit|head to|leave|exit to|walk to)\s+(.+)/i,
    /^(back|return|go back)$/i,
  ];

  for (const pattern of navPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const destination = match[2]?.trim() || 'back';
      return { type: 'NAVIGATE', destination };
    }
  }

  // ── Examination ─────────────────────────────────
  const examPatterns = [
    /^(examine|look at|inspect|check|scan|analyze|read|integrate)\s+(.+)/i,
    /^(look around|look|observe)$/i,
  ];

  for (const pattern of examPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const target = match[2]?.trim() || 'room';
      return { type: 'EXAMINE', target };
    }
  }

  // ── LUMEN readout requests ──────────────────────
  if (/^(bio[- ]?scan|bioscan)\s*(.*)/i.test(lower)) {
    return { type: 'READOUT', readoutType: 'BIO-SCAN', target: RegExp.$2.trim() || null };
  }
  if (/^(env[- ]?scan|envscan)\s*(.*)/i.test(lower)) {
    return { type: 'READOUT', readoutType: 'ENV-SCAN', target: RegExp.$2.trim() || null };
  }
  if (/^(id[- ]?pull|idpull)\s*(.*)/i.test(lower)) {
    return { type: 'READOUT', readoutType: 'ID-PULL', target: RegExp.$2.trim() || null };
  }
  if (/^(pattern[- ]?match|connect)\s*(.*)/i.test(lower)) {
    return { type: 'READOUT', readoutType: 'PATTERN-MATCH', target: RegExp.$2.trim() || null };
  }

  // ── Hint requests ───────────────────────────────
  const hintPatterns = [
    /^(what do you think|any ideas|what are we missing|i('m| am) stuck)/i,
    /^(talk to me|help me|what now|what next|any thoughts)/i,
    /^(i don'?t know what to do|where do we go|what should)/i,
    /^(craine|partner|detective),?\s*(what|any|help|talk|think)/i,
  ];

  for (const pattern of hintPatterns) {
    if (pattern.test(lower)) {
      return { type: 'HINT' };
    }
  }

  // ── Conversation (default) ──────────────────────
  // If in an active conversation or nothing else matched, route to LLM.
  // Case questions still route to Craine as normal dialogue; the annotation
  // lets the notebook record what Chip asked (outside interviews only; the
  // interview branch in App.jsx never reads it).
  const caseQuestion = detectCaseQuestion(input);
  if (caseQuestion.matched) {
    return { type: 'DIALOGUE', text: input, caseQuestion };
  }
  return { type: 'DIALOGUE', text: input };
}

/**
 * Find the best matching hotspot for a text target.
 */
export function matchHotspot(target, hotspots) {
  if (!target || !hotspots) return null;
  const lower = target.toLowerCase();

  // Exact label match
  const exact = hotspots.find((h) =>
    h.label?.toLowerCase() === lower || h.id?.toLowerCase() === lower
  );
  if (exact) return exact;

  // Partial match
  const partial = hotspots.find((h) =>
    h.label?.toLowerCase().includes(lower) || lower.includes(h.label?.toLowerCase())
  );
  return partial || null;
}

/**
 * Find the best matching exit for a navigation target.
 */
export function matchExit(destination, exits) {
  if (!destination || !exits) return null;
  const lower = destination.toLowerCase();

  return exits.find((e) =>
    e.label?.toLowerCase().includes(lower) ||
    e.targetScene?.toLowerCase().includes(lower) ||
    lower.includes(e.label?.toLowerCase().split(' ').pop())
  ) || null;
}
