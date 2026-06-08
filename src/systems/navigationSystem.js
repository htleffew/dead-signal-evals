/**
 * DEAD SIGNAL — Navigation System
 *
 * Defines the scene graph for the playable demo. Each scene declares its
 * exits as an array of transition objects. Transitions may be gated behind
 * state conditions; unconditioned transitions are always available.
 *
 * To add a new scene: add an entry to SCENES and add it as an exit on
 * whatever scenes should link to it.
 *
 * The navigation button always reads "Navigation". Calling getNavigationOptions()
 * returns the destinations available from the current scene given the live
 * game state — render these as a dismissible option list.
 */

/**
 * Scene graph.
 *
 * Each scene: { id, label, exits: [{ sceneId, label, condition? }] }
 *
 * condition(gameState) => boolean — omit for always-available exits.
 * Exits are listed in the order they should appear in the menu.
 */
export const SCENES = {
  brief_car: {
    id: 'brief_car',
    label: 'Brief Car',
    exits: [
      { sceneId: 'lobby', label: 'Head to the lobby' },
    ],
  },

  lobby: {
    id: 'lobby',
    label: 'Lobby',
    exits: [
      {
        sceneId: 'hargrove_office',
        label: "Go up to Hargrove's office",
        condition: (gs) => !gs.hargrove?.exhausted,
      },
      {
        sceneId: 'brief_car',
        label: 'Return to the brief car',
        condition: (gs) => !gs.hargrove?.exhausted,
      },
      {
        sceneId: 'debrief_car',
        label: 'Head to the debrief car',
        condition: (gs) => gs.hargrove?.exhausted === true,
      },
    ],
  },

  hargrove_office: {
    id: 'hargrove_office',
    label: "Hargrove's Office",
    exits: [
      { sceneId: 'lobby', label: 'Return to the lobby' },
    ],
  },

  debrief_car: {
    id: 'debrief_car',
    label: 'Debrief Car',
    exits: [],
  },
};

/**
 * Return the navigation options available from the current scene.
 *
 * @param {string} sceneId - The player's current scene ID.
 * @param {object} gameState - Live game state (e.g. { hargrove: { exhausted: true } }).
 * @returns {{ sceneId: string, label: string }[]} Filtered, ordered list of destinations.
 */
export function getNavigationOptions(sceneId, gameState = {}) {
  const scene = SCENES[sceneId];
  if (!scene) return [];

  return scene.exits.filter((exit) =>
    typeof exit.condition === 'function' ? exit.condition(gameState) : true
  ).map(({ sceneId: targetId, label }) => ({ sceneId: targetId, label }));
}

/**
 * Resolve a player's typed or clicked destination to a scene ID.
 * Returns the matched scene ID, or null if no match found.
 *
 * @param {string} destination - Text destination (typed navigation or option label).
 * @param {string} currentSceneId - Current scene, used to scope the search.
 * @param {object} gameState - Live game state.
 * @returns {string|null}
 */
export function resolveDestination(destination, currentSceneId, gameState = {}) {
  const options = getNavigationOptions(currentSceneId, gameState);
  const lower = destination.toLowerCase();

  const match = options.find(
    (opt) =>
      opt.sceneId.toLowerCase() === lower ||
      opt.label.toLowerCase().includes(lower) ||
      lower.includes(opt.sceneId.toLowerCase().replace(/_/g, ' '))
  );

  return match?.sceneId ?? null;
}
