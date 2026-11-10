import type { Step } from "./Director";

/**
 * Shot lists for the hero preview, keyed by figure id. Each one plays like a short screen recording of
 * someone using the figure: the pointer moves, clicks and types, and the camera follows it. `focus`
 * moves the pointer over an element (to "read" it) and sets the zoom. Figures without a script fall
 * back to their own `demo` autoplay.
 */
export const SCRIPTS: Record<string, Step[]> = {
  "fig-retrieval": [
    { wide: true, hold: 600 },
    { focus: ".rf-input input", zoom: 2, at: [0.12, 0.5], hold: 100 },
    { type: "Can I renew my loans online?", into: ".rf-input input", hold: 200 },
    { click: ".rf-input button", hold: 400 },
    { focus: ".rf-chunks li.hit", zoom: 1.8, at: [0.4, 0.6], hold: 1500 },
    { focus: ".rf-answer p", zoom: 2.1, at: [0.3, 0.5], hold: 2200 },
    { wide: true, hold: 300 },
    { click: ".rf-presets button:nth-child(2)", hold: 300 },
    { drag: ".rf-k input", to: 3, hold: 300 },
    { focus: ".rf-answer p", zoom: 2.1, at: [0.3, 0.5], hold: 2400 },
    { drag: ".rf-k input", to: 2, hold: 200 },
    { wide: true, hold: 800 },
  ],

  "fig-visa-check": [
    { wide: true, hold: 600 },
    { focus: ".vf-tabs", zoom: 1.8, at: [0.25, 0.5], hold: 100 },
    { click: ".vf-tabs button:nth-child(2)", hold: 300 },
    { focus: ".vf-ad p", zoom: 1.8, at: [0.35, 0.4], hold: 1800 },
    { focus: ".vf-rules", zoom: 1.9, at: [0.4, 0.3], hold: 1600 },
    { focus: ".vf-verdict", zoom: 2.1, at: [0.4, 0.5], hold: 2000 },
    { wide: true, hold: 300 },
    { click: ".vf-tabs button:nth-child(1)", hold: 300 },
    { focus: ".vf-verdict", zoom: 2.1, at: [0.4, 0.5], hold: 2000 },
    { wide: true, hold: 300 },
    { click: ".vf-tabs button:nth-child(3)", hold: 300 },
    { focus: ".vf-ad p", zoom: 1.8, at: [0.35, 0.4], hold: 1400 },
    { focus: ".vf-verdict", zoom: 2.1, at: [0.4, 0.5], hold: 2000 },
    { wide: true, hold: 800 },
  ],

  "fig-match-score": [
    { wide: true, hold: 600 },
    { drag: ".mf-sliders label:nth-of-type(3) input", to: 3, hold: 200 },
    { focus: ".mf-score", zoom: 1.9, at: [0.45, 0.5], hold: 1300 },
    { drag: ".mf-sliders label:nth-of-type(1) input", to: 4, hold: 200 },
    { focus: ".mf-score", zoom: 1.9, at: [0.45, 0.5], hold: 1000 },
    { focus: ".mf-why", zoom: 2.1, at: [0.3, 0.5], hold: 1800 },
    { wide: true, hold: 300 },
    { click: ".mf .vf-tabs button:nth-child(2)", hold: 400 },
    { focus: ".mf-parts", zoom: 1.8, at: [0.4, 0.4], hold: 1600 },
    { focus: ".mf-score", zoom: 1.9, at: [0.45, 0.5], hold: 1400 },
    { wide: true, hold: 300 },
    { click: ".mf .vf-tabs button:nth-child(1)", hold: 200 },
    { drag: ".mf-sliders label:nth-of-type(3) input", to: 1, hold: 100 },
    { drag: ".mf-sliders label:nth-of-type(1) input", to: 3, hold: 600 },
  ],

  "fig-room-quote": [
    { wide: true, hold: 1200 },
    { click: ".room-side fieldset:nth-of-type(1) button:nth-child(3)", hold: 200 },
    { focus: ".room-view", zoom: 1.35, at: [0.5, 0.6], hold: 1300 },
    { click: ".room-side fieldset:nth-of-type(3) button:nth-child(2)", hold: 200 },
    { focus: ".room-view", zoom: 1.35, at: [0.55, 0.55], hold: 1300 },
    { click: ".room-side fieldset:nth-of-type(2) button:nth-child(3)", hold: 200 },
    { focus: ".room-view", zoom: 1.35, at: [0.6, 0.5], hold: 1300 },
    { focus: ".room-quote tfoot", zoom: 2.2, at: [0.6, 0.5], hold: 2000 },
    { wide: true, hold: 300 },
    { click: ".room-side fieldset:nth-of-type(1) button:nth-child(2)", hold: 100 },
    { click: ".room-side fieldset:nth-of-type(2) button:nth-child(2)", hold: 100 },
    { click: ".room-side fieldset:nth-of-type(3) button:nth-child(1)", hold: 800 },
  ],

  // Althea: the CI/CD tab. A scan blocks the release, each finding gets fixed, then it ships.
  "fig-althea": [
    { wide: true, hold: 600 },
    { click: ".pf-actions .pf-run", hold: 200 },
    { focus: ".pf-stages", zoom: 1.6, at: [0.85, 0.5], hold: 2600 },
    { focus: ".pf-merge", zoom: 2, at: [0.4, 0.5], hold: 900 },
    { click: ".pf-finding:not(:disabled)", hold: 300 },
    { focus: ".pf-diff", zoom: 2, at: [0.4, 0.5], hold: 700 },
    { click: ".pf-diff button", hold: 200 },
    { click: ".pf-finding:not(:disabled)", hold: 200 },
    { click: ".pf-diff button", hold: 200 },
    { click: ".pf-finding:not(:disabled)", hold: 200 },
    { click: ".pf-diff button", hold: 300 },
    { click: ".pf-actions .pf-run", hold: 200 },
    { focus: ".pf-stages", zoom: 1.6, at: [0.85, 0.5], hold: 2700 },
    { click: ".pf-actions button:nth-child(2)", hold: 500 },
    { click: ".pf-actions button:nth-child(2)", hold: 500 },
    { click: ".pf-actions button:nth-child(2)", hold: 300 },
    { focus: ".pf-tracks", zoom: 1.9, at: [0.7, 0.5], hold: 1600 },
    { wide: true, hold: 400 },
    { click: ".pf-actions button:last-child", hold: 600 },
  ],
};
