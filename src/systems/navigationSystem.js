/**
 * DEAD SIGNAL — Navigation System
 *
 * Data-driven scene graph with state-gated exits. The navigation button
 * always reads "NAVIGATION"; clicking it opens the available destinations
 * for the current scene, filtered by game state.
 *
 * Scene graph DATA lives in the active chapter's navigation.js (chapter chunk).
 * This module reads the graph at call time via getSceneGraph() so it always
 * reflects the loaded chapter.
 *
 * Current scene graph (Chapter 1):
 *
 *   BRIEF CAR ──► LOBBY ──► OFFICE
 *                   │  ◄────── │
 *                   │
 *                   ▼ (when exhausted)
 *              DEBRIEF CAR
 *
 *   Office exit to lobby is always available.
 *   Lobby exit to office requires canReEngage (Hargrove not exhausted).
 *   Lobby exit to car always available; App.jsx sets carMode based on exhaustion.
 *   Brief car exit to lobby is available (debrief car has no exits).
 */

import { getSceneGraph } from '../content/activeChapter.js';

/**
 * Get the available navigation options for the current scene, filtered
 * by game state. Returns an array of { targetScene, label }.
 */
export function getNavigationOptions(sceneId, state) {
  const SCENE_GRAPH = getSceneGraph();
  const node = SCENE_GRAPH[sceneId];
  if (!node) return [];

  return node.exits
    .filter((exit) => !exit.condition || exit.condition(state))
    .map(({ targetScene, label }) => ({ targetScene, label }));
}

function matchesExit(lower, exit) {
  if (exit.label.toLowerCase().includes(lower)) return true;
  if (exit.targetScene.toLowerCase().includes(lower)) return true;
  if (lower.includes(exit.label.toLowerCase().split(' ').pop())) return true;
  if (exit.aliases?.some((a) => lower.includes(a) || a.includes(lower))) return true;
  return false;
}

/**
 * Resolve a typed navigation target to a valid destination from the
 * current scene. Used by the NAVIGATE handler in App.jsx.
 */
export function resolveDestination(destination, sceneId, state) {
  const SCENE_GRAPH = getSceneGraph();
  const options = getNavigationOptions(sceneId, state);
  if (!options.length) return null;

  const lower = destination.toLowerCase();
  const node = SCENE_GRAPH[sceneId];

  const match = node.exits
    .filter((exit) => !exit.condition || exit.condition(state))
    .find((exit) => matchesExit(lower, exit));

  return match ? { targetScene: match.targetScene, label: match.label } : null;
}

/**
 * Check whether the destination matches a known exit that's currently
 * blocked by a state condition. Used to give the player a reason
 * instead of "I don't see how to get there."
 */
export function isBlockedDestination(destination, sceneId, state) {
  const SCENE_GRAPH = getSceneGraph();
  const node = SCENE_GRAPH[sceneId];
  if (!node) return false;

  const lower = destination.toLowerCase();
  return node.exits.some((exit) =>
    exit.condition && !exit.condition(state) && matchesExit(lower, exit)
  );
}

/**
 * Get Craine's in-character response for why a blocked destination
 * isn't available right now.
 */
export function getBlockedMessage(sceneId, state) {
  const SCENE_GRAPH = getSceneGraph();
  const node = SCENE_GRAPH[sceneId];
  if (!node) return '"Can\'t get there from here."';

  const blocked = node.exits.find((exit) =>
    exit.condition && !exit.condition(state) && exit.blockedMessage
  );
  return blocked?.blockedMessage || '"Can\'t do that right now."';
}
