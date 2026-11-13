.pragma library

// Moodscreen: unrelated full-screen looks, one per "family". A family
// owns its own shader effect and its own tunable params; everything shares
// four universal picture controls (bright, contrast, saturation, vignette)
// plus a common grain, applied after the family effect runs.
//
// A preset is a family's params layered on that family's defaults. Controls
// describe what the panel shows for a family: sliders, toggles, and named
// colour swatches. Nothing here renders anything — ShaderBuilder.js turns a
// resolved preset into GLSL.

var USER_PREFIX = "user-"

var COMMON_DEFAULTS = {
  bright: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  vignette: 0.0,
  noise: 0.0
}

var FAMILIES = [
  {
    id: "glass",
    name: "Glass",
    subtitle: "Frosted, refractive pane over the desktop",
    defaults: { blur: 0.25, refract: 0.08, streak: 0.15, tint: [0.80, 0.88, 1.00], tintStrength: 0.10, animate: false },
    liveWhen: ["animate"],
    controls: [
      { key: "blur", label: "Blur", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "refract", label: "Ripple", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "streak", label: "Light streak", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tintStrength", label: "Tint strength", type: "slider", min: 0, max: 0.6, step: 0.01, dec: 2 },
      { key: "tint", label: "Tint", type: "swatch", options: [
        { name: "Clear",   value: [0.80, 0.88, 1.00] },
        { name: "Amber",   value: [1.00, 0.80, 0.55] },
        { name: "Rose",    value: [0.95, 0.65, 0.80] },
        { name: "Violet",  value: [0.75, 0.60, 0.95] },
        { name: "Sage",    value: [0.70, 0.90, 0.75] }
      ] },
      { key: "animate", label: "Living ripple", type: "toggle" }
    ],
    presets: [
      { id: "frosted", name: "Frosted", subtitle: "static bathroom glass", params: { blur: 0.42, refract: 0.03, streak: 0.08, tintStrength: 0.08, animate: false, vignette: 0.15 } },
      { id: "rippled", name: "Rippled", subtitle: "water glass, always moving", params: { blur: 0.18, refract: 0.18, streak: 0.24, tintStrength: 0.10, animate: true, vignette: 0.10 } },
      { id: "stained", name: "Stained", subtitle: "tinted cathedral pane", params: { blur: 0.30, refract: 0.05, streak: 0.20, tint: [0.85, 0.55, 0.95], tintStrength: 0.32, animate: false, vignette: 0.20, saturation: 1.15 } },
      { id: "foggy", name: "Foggy", subtitle: "thick, near-opaque haze", params: { blur: 0.55, refract: 0.02, streak: 0.05, tintStrength: 0.05, animate: false, vignette: 0.20 } },
      { id: "showerDoor", name: "Shower Door", subtitle: "warped, always shifting", params: { blur: 0.30, refract: 0.30, streak: 0.30, tintStrength: 0.06, animate: true, vignette: 0.05 } }
    ]
  },
  {
    id: "neon",
    name: "Neon",
    subtitle: "Glowing edges, tinted and pulsing",
    defaults: { glow: 0.5, hue: [1.0, 0.20, 0.80], scan: 0.15, pulse: 0.10, saturation: 1.15 },
    liveWhen: ["scan", "pulse"],
    controls: [
      { key: "glow", label: "Glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scan", label: "Scan sweep", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "pulse", label: "Pulse", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "hue", label: "Hue", type: "swatch", options: [
        { name: "Miami", value: [1.00, 0.25, 0.75] },
        { name: "Tron",  value: [0.25, 0.75, 1.00] },
        { name: "Acid",  value: [0.65, 1.00, 0.25] },
        { name: "Ruby",  value: [1.00, 0.15, 0.25] },
        { name: "Violet",value: [0.65, 0.25, 1.00] },
        { name: "Synthwave", value: [1.00, 0.35, 0.55] },
        { name: "Cyber", value: [0.15, 1.00, 0.55] }
      ] }
    ],
    presets: [
      { id: "miami", name: "Miami", subtitle: "pink and cyan glow", params: { hue: [1.00, 0.25, 0.75], glow: 0.55, pulse: 0.15, scan: 0.25, saturation: 1.25 } },
      { id: "tron", name: "Tron", subtitle: "cool blue grid glow", params: { hue: [0.25, 0.75, 1.00], glow: 0.60, pulse: 0.05, scan: 0.10, saturation: 1.15, contrast: 1.10 } },
      { id: "acid", name: "Acid", subtitle: "hot green-yellow glow", params: { hue: [0.65, 1.00, 0.25], glow: 0.50, pulse: 0.20, scan: 0.30, saturation: 1.30 } },
      { id: "synthwave", name: "Synthwave", subtitle: "hot pink-orange, deep vignette", params: { hue: [1.00, 0.35, 0.55], glow: 0.65, pulse: 0.10, scan: 0.35, saturation: 1.20, vignette: 0.30 } },
      { id: "cyber", name: "Cyber", subtitle: "sharp green, heavy pulse", params: { hue: [0.15, 1.00, 0.55], glow: 0.45, pulse: 0.25, scan: 0.15, contrast: 1.15, saturation: 1.10 } }
    ]
  },
  {
    id: "gameboy",
    name: "Game Boy",
    subtitle: "Four-shade dot-matrix palette",
    defaults: {
      palette: [[0.06, 0.13, 0.06], [0.19, 0.38, 0.19], [0.55, 0.67, 0.06], [0.68, 0.78, 0.31]],
      dotGrid: 0.35, ghost: 0.12
    },
    liveWhen: [],
    controls: [
      { key: "dotGrid", label: "Dot grid", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "ghost", label: "Ghosting", type: "slider", min: 0, max: 0.5, step: 0.01, dec: 2 },
      { key: "palette", label: "Tube", type: "swatch", options: [
        { name: "DMG",    value: [[0.06, 0.13, 0.06], [0.19, 0.38, 0.19], [0.55, 0.67, 0.06], [0.68, 0.78, 0.31]] },
        { name: "Pocket", value: [[0.05, 0.05, 0.05], [0.35, 0.35, 0.35], [0.65, 0.65, 0.65], [0.92, 0.92, 0.92]] },
        { name: "Light",  value: [[0.10, 0.12, 0.02], [0.35, 0.42, 0.05], [0.62, 0.70, 0.10], [0.86, 0.92, 0.35]] },
        { name: "Virtual Boy", value: [[0.05, 0.00, 0.00], [0.35, 0.03, 0.03], [0.65, 0.08, 0.08], [1.00, 0.15, 0.15]] },
        { name: "Arcade", value: [[0.08, 0.05, 0.00], [0.35, 0.20, 0.02], [0.65, 0.42, 0.05], [0.95, 0.75, 0.15]] }
      ] }
    ],
    presets: [
      { id: "dmg", name: "DMG", subtitle: "the original green tint", params: {
        palette: [[0.06, 0.13, 0.06], [0.19, 0.38, 0.19], [0.55, 0.67, 0.06], [0.68, 0.78, 0.31]], dotGrid: 0.40, ghost: 0.12 } },
      { id: "pocket", name: "Pocket", subtitle: "grayscale, crisper", params: {
        palette: [[0.05, 0.05, 0.05], [0.35, 0.35, 0.35], [0.65, 0.65, 0.65], [0.92, 0.92, 0.92]], dotGrid: 0.30, ghost: 0.08 } },
      { id: "light", name: "Light", subtitle: "backlit yellow-green", params: {
        palette: [[0.10, 0.12, 0.02], [0.35, 0.42, 0.05], [0.62, 0.70, 0.10], [0.86, 0.92, 0.35]], dotGrid: 0.35, ghost: 0.10, bright: 1.10 } },
      { id: "virtualBoy", name: "Virtual Boy", subtitle: "monochrome red", params: {
        palette: [[0.05, 0.00, 0.00], [0.35, 0.03, 0.03], [0.65, 0.08, 0.08], [1.00, 0.15, 0.15]], dotGrid: 0.45, ghost: 0.15 } },
      { id: "arcade", name: "Arcade", subtitle: "amber cabinet monitor", params: {
        palette: [[0.08, 0.05, 0.00], [0.35, 0.20, 0.02], [0.65, 0.42, 0.05], [0.95, 0.75, 0.15]], dotGrid: 0.25, ghost: 0.05, bright: 1.05 } }
    ]
  },
  {
    id: "vhs",
    name: "VHS / Vaporwave",
    subtitle: "Chroma split, tape noise, a slow roll",
    defaults: { chroma: 0.6, trackingNoise: 0.15, scanRoll: 0.10, wash: [0.90, 0.60, 1.00], washStrength: 0.0 },
    liveWhen: ["trackingNoise", "scanRoll"],
    controls: [
      { key: "chroma", label: "Chroma split", type: "slider", min: 0, max: 3, step: 0.1, dec: 1 },
      { key: "trackingNoise", label: "Tracking noise", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scanRoll", label: "Roll", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "washStrength", label: "Colour wash", type: "slider", min: 0, max: 0.6, step: 0.01, dec: 2 },
      { key: "wash", label: "Wash colour", type: "swatch", options: [
        { name: "Pastel", value: [0.90, 0.60, 1.00] },
        { name: "Sunset", value: [1.00, 0.55, 0.45] },
        { name: "Ocean",  value: [0.55, 0.75, 1.00] },
        { name: "Dream",  value: [0.65, 0.75, 1.00] }
      ] }
    ],
    presets: [
      { id: "vhsTracking", name: "VHS Tracking", subtitle: "a worn rental tape", params: { chroma: 1.2, trackingNoise: 0.35, scanRoll: 0.25, washStrength: 0.0, noise: 0.08 } },
      { id: "vaporwave", name: "Vaporwave", subtitle: "pastel wash, mostly clean", params: { chroma: 0.6, trackingNoise: 0.05, scanRoll: 0.04, wash: [0.85, 0.55, 1.00], washStrength: 0.22, saturation: 1.20, contrast: 1.05 } },
      { id: "lateNightRental", name: "Late Night Rental", subtitle: "heavy wear, deep vignette", params: { chroma: 1.6, trackingNoise: 0.50, scanRoll: 0.40, noise: 0.14, vignette: 0.35 } },
      { id: "camcorder", name: "Camcorder", subtitle: "light degrade, home video", params: { chroma: 0.8, trackingNoise: 0.15, scanRoll: 0.08, washStrength: 0.0, noise: 0.05 } },
      { id: "dreamwave", name: "Dreamwave", subtitle: "heavy pastel wash, gentle roll", params: { chroma: 0.4, trackingNoise: 0.02, scanRoll: 0.06, wash: [0.65, 0.75, 1.00], washStrength: 0.30, saturation: 1.15, vignette: 0.15 } }
    ]
  },
  {
    id: "fireplace",
    name: "Fireplace",
    subtitle: "Warm light, flickering like firelight",
    defaults: { warmth: 0.5, flicker: 0.4, glow: 0.3, glowColor: [1.0, 0.45, 0.12] },
    liveWhen: ["__always"],
    controls: [
      { key: "warmth", label: "Warmth", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "flicker", label: "Flicker", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glowColor", label: "Flame colour", type: "swatch", options: [
        { name: "Campfire", value: [1.00, 0.50, 0.15] },
        { name: "Ember",    value: [0.90, 0.25, 0.10] },
        { name: "Candle",   value: [1.00, 0.70, 0.35] }
      ] }
    ],
    presets: [
      { id: "campfire", name: "Campfire", subtitle: "lively, bright flicker", params: { warmth: 0.55, flicker: 0.45, glow: 0.35, glowColor: [1.00, 0.50, 0.15] } },
      { id: "hearth", name: "Hearth", subtitle: "steadier, deeper glow", params: { warmth: 0.40, flicker: 0.30, glow: 0.45, glowColor: [1.00, 0.42, 0.10], vignette: 0.25 } },
      { id: "embers", name: "Embers", subtitle: "dim, slow, mostly red", params: { warmth: 0.65, flicker: 0.20, glow: 0.25, glowColor: [0.90, 0.25, 0.10], contrast: 1.10, saturation: 0.90 } },
      { id: "bonfire", name: "Bonfire", subtitle: "big, wild, restless flicker", params: { warmth: 0.60, flicker: 0.60, glow: 0.50, glowColor: [1.00, 0.55, 0.10], vignette: 0.10 } },
      { id: "candlelight", name: "Candlelight", subtitle: "small, steady, warm", params: { warmth: 0.35, flicker: 0.15, glow: 0.20, glowColor: [1.00, 0.70, 0.35], vignette: 0.35 } }
    ]
  },
  {
    id: "computer",
    name: "Computer",
    subtitle: "Low-colour, dithered look of classic home computers",
    defaults: { pixelSize: 0.3, levels: 5, dither: 0.4, glow: 0.05, tint: [1.0, 1.0, 1.0] },
    liveWhen: [],
    controls: [
      { key: "pixelSize", label: "Pixel size", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "levels", label: "Colour levels", type: "slider", min: 2, max: 8, step: 1, dec: 0 },
      { key: "dither", label: "Dither", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Phosphor glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tint", label: "Machine", type: "swatch", options: [
        { name: "Amiga",     value: [0.90, 0.95, 1.15] },
        { name: "Macintosh", value: [1.00, 1.00, 1.00] },
        { name: "C64",       value: [0.85, 0.85, 1.20] },
        { name: "DOS",       value: [1.15, 0.95, 0.55] },
        { name: "Teletext",  value: [1.05, 1.00, 0.85] }
      ] }
    ],
    presets: [
      { id: "amiga", name: "Amiga", subtitle: "colourful, dithered Workbench glow", params: { pixelSize: 0.30, levels: 5, dither: 0.50, glow: 0.10, tint: [0.90, 0.95, 1.15], saturation: 1.10 } },
      { id: "macintosh", name: "Macintosh", subtitle: "crisp black and white bitmap", params: { pixelSize: 0.15, levels: 2, dither: 0.80, glow: 0.0, tint: [1.00, 1.00, 1.00], saturation: 0.10, contrast: 1.20 } },
      { id: "c64", name: "Commodore 64", subtitle: "blue-tinted, blocky home computer", params: { pixelSize: 0.35, levels: 4, dither: 0.40, glow: 0.05, tint: [0.85, 0.85, 1.20], saturation: 1.05 } },
      { id: "dos", name: "DOS Terminal", subtitle: "amber phosphor, chunky text mode", params: { pixelSize: 0.40, levels: 3, dither: 0.30, glow: 0.20, tint: [1.15, 0.95, 0.55], saturation: 0.85, contrast: 1.10 } },
      { id: "teletext", name: "Teletext", subtitle: "bold primary blocks, BBC Micro style", params: { pixelSize: 0.50, levels: 3, dither: 0.20, glow: 0.05, tint: [1.05, 1.00, 0.85], saturation: 1.35, contrast: 1.10 } }
    ]
  },
  {
    id: "scanlines",
    name: "Scanlines",
    subtitle: "A CRT tube: scan lines, curvature and glow",
    defaults: { lineStrength: 0.4, curvature: 0.2, glow: 0.15, mask: 0.2, roll: 0.0 },
    liveWhen: ["roll"],
    controls: [
      { key: "lineStrength", label: "Scan lines", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "curvature", label: "Curvature", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "mask", label: "Aperture mask", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "roll", label: "Vertical roll", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 }
    ],
    presets: [
      { id: "broadcast", name: "Broadcast", subtitle: "subtle scan lines, flat glass", params: { lineStrength: 0.30, curvature: 0.10, mask: 0.15, glow: 0.10, roll: 0.0 } },
      { id: "arcadeCabinet", name: "Arcade Cabinet", subtitle: "curved tube, strong RGB mask", params: { lineStrength: 0.55, curvature: 0.35, mask: 0.35, glow: 0.20, roll: 0.0 } },
      { id: "oldTv", name: "Old TV", subtitle: "heavy roll, glow and grain", params: { lineStrength: 0.70, curvature: 0.45, mask: 0.20, glow: 0.30, roll: 0.15, vignette: 0.30, noise: 0.06 } }
    ]
  },
  {
    id: "water",
    name: "Water",
    subtitle: "Rain, an aquarium, or a sheet of ice over the desktop",
    defaults: { dropAmount: 0.0, caustic: 0.0, frost: 0.0, fish: 0.0, tint: [0.75, 0.88, 0.95] },
    liveWhen: ["dropAmount", "caustic", "fish"],
    controls: [
      { key: "dropAmount", label: "Rain", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "caustic", label: "Shimmer", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "frost", label: "Frost", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "fish", label: "Fish", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tint", label: "Tint", type: "swatch", options: [
        { name: "Rain",     value: [0.85, 0.90, 0.95] },
        { name: "Aquarium", value: [0.70, 0.95, 0.90] },
        { name: "Ice",      value: [0.85, 0.93, 1.00] },
        { name: "Clear",    value: [1.00, 1.00, 1.00] }
      ] }
    ],
    presets: [
      { id: "rain", name: "Rain", subtitle: "streaked glass in a downpour", params: { dropAmount: 0.60, caustic: 0.0, frost: 0.0, fish: 0.0, tint: [0.85, 0.90, 0.95], saturation: 0.90, vignette: 0.15 } },
      { id: "aquarium", name: "Aquarium", subtitle: "shimmering tank, one fish swimming by", params: { dropAmount: 0.0, caustic: 0.50, frost: 0.0, fish: 1.0, tint: [0.70, 0.95, 0.90], saturation: 1.15, vignette: 0.10 } },
      { id: "ice", name: "Ice", subtitle: "frosted, crystalline chill", params: { dropAmount: 0.0, caustic: 0.0, frost: 0.60, fish: 0.0, tint: [0.85, 0.93, 1.00], saturation: 0.85, contrast: 1.05, vignette: 0.20 } }
    ]
  },
  {
    id: "toxic",
    name: "Toxic",
    subtitle: "Radioactive glow with ooze rising from below",
    defaults: { toxicity: 0.5, glow: 0.4, ooze: 0.3, pulse: 0.15, toxin: [0.45, 1.00, 0.15] },
    liveWhen: ["ooze", "pulse"],
    controls: [
      { key: "toxicity", label: "Contamination", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Edge glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "ooze", label: "Ooze", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "pulse", label: "Pulse", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "toxin", label: "Toxin", type: "swatch", options: [
        { name: "Radioactive", value: [0.45, 1.00, 0.15] },
        { name: "Acid",        value: [0.85, 1.00, 0.10] },
        { name: "Chemical",    value: [0.70, 0.25, 1.00] },
        { name: "Biohazard",   value: [1.00, 0.60, 0.05] },
        { name: "Coolant",     value: [0.10, 1.00, 0.80] }
      ] }
    ],
    presets: [
      { id: "radioactive", name: "Radioactive", subtitle: "green glow, slow ooze", params: { toxicity: 0.55, glow: 0.45, ooze: 0.30, pulse: 0.15, toxin: [0.45, 1.00, 0.15], vignette: 0.20 } },
      { id: "sludge", name: "Toxic Sludge", subtitle: "thick bubbling ooze, heavy tint", params: { toxicity: 0.75, glow: 0.30, ooze: 0.65, pulse: 0.10, toxin: [0.85, 1.00, 0.10], vignette: 0.30, contrast: 1.10 } },
      { id: "chemicalSpill", name: "Chemical Spill", subtitle: "violet glow, restless pulse", params: { toxicity: 0.50, glow: 0.55, ooze: 0.35, pulse: 0.30, toxin: [0.70, 0.25, 1.00], saturation: 1.15 } },
      { id: "biohazard", name: "Biohazard", subtitle: "orange warning glow", params: { toxicity: 0.45, glow: 0.50, ooze: 0.20, pulse: 0.25, toxin: [1.00, 0.60, 0.05], vignette: 0.25 } },
      { id: "contaminated", name: "Contaminated", subtitle: "faint tint and glow, no motion", params: { toxicity: 0.30, glow: 0.30, ooze: 0.0, pulse: 0.0, toxin: [0.45, 1.00, 0.15] } }
    ]
  },
  {
    id: "wasteland",
    name: "Post-Apocalypse",
    subtitle: "Faded, dusty and scratched, like the world ended",
    defaults: { fade: 0.5, dust: 0.4, dustColor: [0.82, 0.62, 0.38], grime: 0.3, storm: 0.0, scratches: 0.0 },
    liveWhen: ["storm", "scratches"],
    controls: [
      { key: "fade", label: "Fade", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "dust", label: "Dust tint", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "grime", label: "Grime", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "storm", label: "Dust storm", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scratches", label: "Film scratches", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "dustColor", label: "Sky", type: "swatch", options: [
        { name: "Dust Bowl",     value: [0.82, 0.62, 0.38] },
        { name: "Ash",           value: [0.55, 0.53, 0.50] },
        { name: "Nuclear Winter",value: [0.55, 0.62, 0.70] },
        { name: "Rust",          value: [0.70, 0.35, 0.20] },
        { name: "Sickly",        value: [0.65, 0.70, 0.35] }
      ] }
    ],
    presets: [
      { id: "wasteland", name: "Wasteland", subtitle: "sun-bleached desert dust", params: { fade: 0.50, dust: 0.45, dustColor: [0.82, 0.62, 0.38], grime: 0.30, storm: 0.0, scratches: 0.0, vignette: 0.30, contrast: 1.10 } },
      { id: "dustStorm", name: "Dust Storm", subtitle: "sand blowing across the screen", params: { fade: 0.45, dust: 0.55, dustColor: [0.82, 0.62, 0.38], grime: 0.20, storm: 0.55, scratches: 0.0, vignette: 0.25 } },
      { id: "ashfall", name: "Ashfall", subtitle: "grey, burnt-out and quiet", params: { fade: 0.75, dust: 0.40, dustColor: [0.55, 0.53, 0.50], grime: 0.45, storm: 0.20, scratches: 0.0, vignette: 0.35 } },
      { id: "nuclearWinter", name: "Nuclear Winter", subtitle: "cold, washed-out blue grey", params: { fade: 0.65, dust: 0.45, dustColor: [0.55, 0.62, 0.70], grime: 0.25, storm: 0.15, scratches: 0.0, vignette: 0.30, bright: 0.95 } },
      { id: "lastReel", name: "Last Reel", subtitle: "rusted, grainy found footage", params: { fade: 0.55, dust: 0.50, dustColor: [0.70, 0.35, 0.20], grime: 0.50, storm: 0.0, scratches: 0.50, noise: 0.10, vignette: 0.40 } }
    ]
  },
  {
    id: "matrix",
    name: "Matrix",
    subtitle: "Phosphor-tinted desktop behind falling code",
    defaults: { rain: 0.35, density: 0.5, speed: 0.5, mono: 0.6, glow: 0.2, code: [0.25, 1.00, 0.35] },
    liveWhen: ["rain"],
    controls: [
      { key: "rain", label: "Code rain", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "density", label: "Density", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "speed", label: "Speed", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "mono", label: "Phosphor tint", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "code", label: "Code", type: "swatch", options: [
        { name: "Classic",  value: [0.25, 1.00, 0.35] },
        { name: "Amber",    value: [1.00, 0.70, 0.15] },
        { name: "Ice",      value: [0.40, 0.85, 1.00] },
        { name: "Red Pill", value: [1.00, 0.20, 0.20] },
        { name: "Ghost",    value: [0.85, 0.90, 0.95] }
      ] }
    ],
    presets: [
      { id: "digitalRain", name: "Digital Rain", subtitle: "the classic green cascade", params: { rain: 0.40, density: 0.55, speed: 0.50, mono: 0.70, glow: 0.25, code: [0.25, 1.00, 0.35], contrast: 1.10, vignette: 0.20 } },
      { id: "construct", name: "The Construct", subtitle: "light drizzle, mostly readable", params: { rain: 0.18, density: 0.30, speed: 0.35, mono: 0.40, glow: 0.10, code: [0.25, 1.00, 0.35] } },
      { id: "downpour", name: "Downpour", subtitle: "dense, fast, all-in", params: { rain: 0.60, density: 0.90, speed: 0.80, mono: 0.90, glow: 0.35, code: [0.25, 1.00, 0.35], contrast: 1.15, vignette: 0.30 } },
      { id: "redPill", name: "Red Pill", subtitle: "red code, warning tint", params: { rain: 0.35, density: 0.50, speed: 0.55, mono: 0.60, glow: 0.25, code: [1.00, 0.20, 0.20], vignette: 0.25 } },
      { id: "greenScreen", name: "Green Screen", subtitle: "phosphor tint only, no rain", params: { rain: 0.0, density: 0.50, speed: 0.50, mono: 0.75, glow: 0.20, code: [0.25, 1.00, 0.35] } }
    ]
  },
  {
    id: "cctv",
    name: "Security Camera",
    subtitle: "Grainy CCTV feed with REC, timecode and interference",
    defaults: { mono: 0.9, lines: 0.35, soft: 0.3, interference: 0.15, overlay: true, clock: true, camTint: [0.92, 1.00, 0.95] },
    liveWhen: ["clock", "interference"],
    controls: [
      { key: "mono", label: "Black & white", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "lines", label: "Scan lines", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "soft", label: "Softness", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "interference", label: "Interference", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "camTint", label: "Feed", type: "swatch", options: [
        { name: "CCTV",         value: [0.92, 1.00, 0.95] },
        { name: "Night Vision", value: [0.40, 1.00, 0.45] },
        { name: "Old Tape",     value: [1.00, 0.88, 0.68] },
        { name: "Blue Monitor", value: [0.75, 0.88, 1.00] }
      ] },
      { key: "overlay", label: "REC overlay", type: "toggle" },
      { key: "clock", label: "Running timecode", type: "toggle" }
    ],
    presets: [
      { id: "lobbyCam", name: "Lobby Cam", subtitle: "everyday black-and-white CCTV", params: { mono: 0.90, lines: 0.35, soft: 0.30, interference: 0.10, overlay: true, clock: true, camTint: [0.92, 1.00, 0.95], noise: 0.10, vignette: 0.30, contrast: 1.10 } },
      { id: "nightVision", name: "Night Vision", subtitle: "bright green, noisy, after dark", params: { mono: 1.00, lines: 0.30, soft: 0.35, interference: 0.10, overlay: true, clock: true, camTint: [0.40, 1.00, 0.45], noise: 0.20, vignette: 0.55, bright: 1.25, contrast: 1.15 } },
      { id: "parkingGarage", name: "Parking Garage", subtitle: "cheap camera, constant interference", params: { mono: 0.80, lines: 0.50, soft: 0.45, interference: 0.45, overlay: true, clock: true, camTint: [0.75, 0.88, 1.00], noise: 0.14, vignette: 0.35 } },
      { id: "foundFootage", name: "Found Footage", subtitle: "old VHS security tape", params: { mono: 0.60, lines: 0.40, soft: 0.40, interference: 0.30, overlay: true, clock: true, camTint: [1.00, 0.88, 0.68], noise: 0.12, vignette: 0.30 } },
      { id: "stillFrame", name: "Still Frame", subtitle: "the look with no motion, saves GPU", params: { mono: 0.90, lines: 0.35, soft: 0.30, interference: 0.0, overlay: true, clock: false, camTint: [0.92, 1.00, 0.95], noise: 0.08, vignette: 0.30 } }
    ]
  },
  {
    id: "noir",
    name: "Noir",
    subtitle: "Hard black and white, blind shadows and smoke",
    defaults: { punch: 0.5, blinds: 0.0, spot: 0.0, smoke: 0.0, filmTint: [1.00, 1.00, 1.00] },
    liveWhen: ["smoke"],
    controls: [
      { key: "punch", label: "Contrast punch", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "blinds", label: "Venetian blinds", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "spot", label: "Spotlight", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "smoke", label: "Smoke", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "filmTint", label: "Print", type: "swatch", options: [
        { name: "Pure",       value: [1.00, 1.00, 1.00] },
        { name: "Silver",     value: [0.94, 0.97, 1.00] },
        { name: "Warm Print", value: [1.00, 0.93, 0.82] },
        { name: "Midnight",   value: [0.80, 0.88, 1.00] }
      ] }
    ],
    presets: [
      { id: "detective", name: "Detective", subtitle: "blind shadows across the desk", params: { punch: 0.55, blinds: 0.60, spot: 0.25, smoke: 0.0, filmTint: [1.00, 1.00, 1.00], noise: 0.08, vignette: 0.35 } },
      { id: "midnight", name: "Midnight", subtitle: "blue night, smoke drifting by", params: { punch: 0.50, blinds: 0.30, spot: 0.0, smoke: 0.40, filmTint: [0.80, 0.88, 1.00], noise: 0.10, vignette: 0.45, bright: 0.95 } },
      { id: "silverScreen", name: "Silver Screen", subtitle: "clean, grainy studio print", params: { punch: 0.35, blinds: 0.0, spot: 0.0, smoke: 0.0, filmTint: [0.94, 0.97, 1.00], noise: 0.12, vignette: 0.25 } },
      { id: "interrogation", name: "Interrogation", subtitle: "one hard light, the rest in shadow", params: { punch: 0.70, blinds: 0.0, spot: 0.80, smoke: 0.30, filmTint: [1.00, 1.00, 1.00], noise: 0.08, vignette: 0.50 } },
      { id: "hardBoiled", name: "Hard-Boiled", subtitle: "crushed blacks, warm pulp print", params: { punch: 0.85, blinds: 0.45, spot: 0.0, smoke: 0.0, filmTint: [1.00, 0.93, 0.82], noise: 0.14, vignette: 0.40 } }
    ]
  },
  {
    id: "thermal",
    name: "Thermal",
    subtitle: "Heat-camera false colour, brighter reads hotter",
    defaults: {
      palette: [[0.02, 0.00, 0.10], [0.40, 0.00, 0.55], [0.90, 0.20, 0.20], [1.00, 0.65, 0.05], [1.00, 1.00, 0.80]],
      heat: 0.5, soft: 0.4, outline: 0.2, shimmer: 0.0, hud: false
    },
    liveWhen: ["shimmer"],
    controls: [
      { key: "heat", label: "Sensitivity", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "soft", label: "Softness", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "outline", label: "Edge outline", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "shimmer", label: "Heat shimmer", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "palette", label: "Palette", type: "swatch", options: [
        { name: "Ironbow",   value: [[0.02, 0.00, 0.10], [0.40, 0.00, 0.55], [0.90, 0.20, 0.20], [1.00, 0.65, 0.05], [1.00, 1.00, 0.80]] },
        { name: "Rainbow",   value: [[0.05, 0.05, 0.60], [0.00, 0.75, 0.90], [0.20, 0.90, 0.20], [1.00, 0.90, 0.00], [1.00, 0.15, 0.05]] },
        { name: "Lava",      value: [[0.05, 0.00, 0.00], [0.45, 0.02, 0.00], [0.85, 0.20, 0.00], [1.00, 0.55, 0.05], [1.00, 0.90, 0.40]] },
        { name: "Arctic",    value: [[0.00, 0.02, 0.10], [0.00, 0.20, 0.50], [0.10, 0.60, 0.90], [0.60, 0.90, 1.00], [1.00, 1.00, 1.00]] },
        { name: "White Hot", value: [[0.00, 0.00, 0.00], [0.25, 0.25, 0.25], [0.50, 0.50, 0.50], [0.75, 0.75, 0.75], [1.00, 1.00, 1.00]] },
        { name: "Black Hot", value: [[1.00, 1.00, 1.00], [0.75, 0.75, 0.75], [0.50, 0.50, 0.50], [0.25, 0.25, 0.25], [0.00, 0.00, 0.00]] }
      ] },
      { key: "hud", label: "Camera HUD", type: "toggle" }
    ],
    presets: [
      { id: "ironbow", name: "Ironbow", subtitle: "the classic purple-to-white heat map", params: {
        palette: [[0.02, 0.00, 0.10], [0.40, 0.00, 0.55], [0.90, 0.20, 0.20], [1.00, 0.65, 0.05], [1.00, 1.00, 0.80]], heat: 0.50, soft: 0.40, outline: 0.20, shimmer: 0.0, hud: true } },
      { id: "hunter", name: "Hunter", subtitle: "rainbow heat, shimmering air", params: {
        palette: [[0.05, 0.05, 0.60], [0.00, 0.75, 0.90], [0.20, 0.90, 0.20], [1.00, 0.90, 0.00], [1.00, 0.15, 0.05]], heat: 0.55, soft: 0.25, outline: 0.45, shimmer: 0.35, hud: false, vignette: 0.30 } },
      { id: "whiteHot", name: "White Hot", subtitle: "grayscale, hot is bright", params: {
        palette: [[0.00, 0.00, 0.00], [0.25, 0.25, 0.25], [0.50, 0.50, 0.50], [0.75, 0.75, 0.75], [1.00, 1.00, 1.00]], heat: 0.45, soft: 0.35, outline: 0.30, shimmer: 0.0, hud: true, noise: 0.06 } },
      { id: "blackHot", name: "Black Hot", subtitle: "inverted, hot is dark", params: {
        palette: [[1.00, 1.00, 1.00], [0.75, 0.75, 0.75], [0.50, 0.50, 0.50], [0.25, 0.25, 0.25], [0.00, 0.00, 0.00]], heat: 0.45, soft: 0.35, outline: 0.25, shimmer: 0.0, hud: true, noise: 0.06 } },
      { id: "heatwave", name: "Heatwave", subtitle: "molten lava palette, rippling haze", params: {
        palette: [[0.05, 0.00, 0.00], [0.45, 0.02, 0.00], [0.85, 0.20, 0.00], [1.00, 0.55, 0.05], [1.00, 0.90, 0.40]], heat: 0.60, soft: 0.45, outline: 0.10, shimmer: 0.60, hud: false, vignette: 0.20 } }
    ]
  },
  {
    id: "comic",
    name: "Comic",
    subtitle: "Flat cel colour, ink lines and halftone dots",
    defaults: { levels: 4, ink: 0.7, halftone: 0.5, dotSize: 6, pop: 0.3, paper: [1.00, 1.00, 1.00] },
    liveWhen: [],
    controls: [
      { key: "levels", label: "Colour bands", type: "slider", min: 2, max: 8, step: 1, dec: 0 },
      { key: "ink", label: "Ink lines", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "halftone", label: "Halftone", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "dotSize", label: "Dot size", type: "slider", min: 3, max: 14, step: 1, dec: 0 },
      { key: "pop", label: "Colour pop", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "paper", label: "Paper", type: "swatch", options: [
        { name: "White",     value: [1.00, 1.00, 1.00] },
        { name: "Newsprint", value: [1.00, 0.96, 0.86] },
        { name: "Pulp",      value: [0.98, 0.90, 0.74] },
        { name: "Cool",      value: [0.92, 0.96, 1.00] }
      ] }
    ],
    presets: [
      { id: "sunday", name: "Sunday Funnies", subtitle: "newsprint, bold ink, big dots", params: { levels: 4, ink: 0.75, halftone: 0.55, dotSize: 7, pop: 0.35, paper: [1.00, 0.96, 0.86] } },
      { id: "anime", name: "Anime Cel", subtitle: "clean flat colour, thin lines, no dots", params: { levels: 5, ink: 0.55, halftone: 0.0, dotSize: 6, pop: 0.40, paper: [1.00, 1.00, 1.00], saturation: 1.10 } },
      { id: "popArt", name: "Pop Art", subtitle: "three loud bands, giant dots", params: { levels: 3, ink: 0.85, halftone: 0.75, dotSize: 11, pop: 0.80, paper: [1.00, 1.00, 1.00], contrast: 1.10 } },
      { id: "pulp", name: "Pulp Comic", subtitle: "yellowed paper, heavy ink", params: { levels: 4, ink: 0.90, halftone: 0.40, dotSize: 5, pop: 0.20, paper: [0.98, 0.90, 0.74], noise: 0.05, vignette: 0.20 } },
      { id: "graphicNovel", name: "Graphic Novel", subtitle: "muted bands, fine screen", params: { levels: 6, ink: 0.65, halftone: 0.35, dotSize: 4, pop: 0.0, paper: [0.92, 0.96, 1.00], saturation: 0.75, contrast: 1.10 } }
    ]
  },
  {
    id: "blueprint",
    name: "Blueprint",
    subtitle: "Drafting paper, white line art and a grid",
    defaults: { lines: 0.7, fill: 0.4, grid: 0.5, wear: 0.0, scheme: [[0.06, 0.24, 0.52], [0.92, 0.96, 1.00]] },
    liveWhen: [],
    controls: [
      { key: "lines", label: "Line weight", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "fill", label: "Fill", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "grid", label: "Grid", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "wear", label: "Paper wear", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scheme", label: "Paper", type: "swatch", options: [
        { name: "Classic",    value: [[0.06, 0.24, 0.52], [0.92, 0.96, 1.00]] },
        { name: "Cyanotype",  value: [[0.03, 0.18, 0.38], [0.85, 0.93, 1.00]] },
        { name: "Whiteprint", value: [[0.95, 0.96, 0.98], [0.10, 0.25, 0.60]] },
        { name: "Night Draft", value: [[0.03, 0.06, 0.12], [0.35, 0.85, 1.00]] },
        { name: "Sepia Plan", value: [[0.93, 0.87, 0.74], [0.35, 0.20, 0.10]] }
      ] }
    ],
    presets: [
      { id: "classic", name: "Classic", subtitle: "white lines on drafting blue", params: { lines: 0.70, fill: 0.40, grid: 0.50, wear: 0.0, scheme: [[0.06, 0.24, 0.52], [0.92, 0.96, 1.00]] } },
      { id: "cyanotype", name: "Cyanotype", subtitle: "deep prussian blue, worn paper", params: { lines: 0.65, fill: 0.50, grid: 0.25, wear: 0.50, scheme: [[0.03, 0.18, 0.38], [0.85, 0.93, 1.00]], vignette: 0.25 } },
      { id: "whiteprint", name: "Whiteprint", subtitle: "blue lines on white, like a diazo copy", params: { lines: 0.75, fill: 0.35, grid: 0.40, wear: 0.10, scheme: [[0.95, 0.96, 0.98], [0.10, 0.25, 0.60]] } },
      { id: "nightDraft", name: "Night Draft", subtitle: "glowing cyan lines on near-black", params: { lines: 0.80, fill: 0.30, grid: 0.35, wear: 0.0, scheme: [[0.03, 0.06, 0.12], [0.35, 0.85, 1.00]] } },
      { id: "patent", name: "Patent Office", subtitle: "brown ink on aged paper, no grid", params: { lines: 0.70, fill: 0.45, grid: 0.0, wear: 0.60, scheme: [[0.93, 0.87, 0.74], [0.35, 0.20, 0.10]], vignette: 0.20 } }
    ]
  },
  {
    id: "sepia",
    name: "Sepia Film",
    subtitle: "A 1920s silent-film print, flicker and all",
    defaults: { tone: 1.0, flicker: 0.0, weave: 0.0, burn: 0.3, scratch: 0.0, dust: 0.0, tint: [1.07, 0.88, 0.66] },
    liveWhen: ["flicker", "weave", "scratch", "dust"],
    controls: [
      { key: "tone", label: "Toning", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "flicker", label: "Projector flicker", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "weave", label: "Gate weave", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "burn", label: "Burned edges", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scratch", label: "Scratches", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "dust", label: "Dust", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tint", label: "Film stock", type: "swatch", options: [
        { name: "Sepia",    value: [1.07, 0.88, 0.66] },
        { name: "Selenium", value: [1.00, 0.94, 0.92] },
        { name: "Amber",    value: [1.12, 0.92, 0.55] },
        { name: "Night Tint", value: [0.70, 0.85, 1.10] },
        { name: "Rose",     value: [1.10, 0.85, 0.85] }
      ] }
    ],
    presets: [
      { id: "nickelodeon", name: "Nickelodeon", subtitle: "flickering, scratched, the full show", params: { tone: 1.0, flicker: 0.60, weave: 0.60, burn: 0.45, scratch: 0.50, dust: 0.50, tint: [1.07, 0.88, 0.66], noise: 0.12, contrast: 1.10 } },
      { id: "oldPhotograph", name: "Old Photograph", subtitle: "still sepia print, burned corners", params: { tone: 1.0, flicker: 0.0, weave: 0.0, burn: 0.55, scratch: 0.0, dust: 0.0, tint: [1.07, 0.88, 0.66], noise: 0.08 } },
      { id: "restored", name: "Restored Print", subtitle: "clean toning, a gentle flicker", params: { tone: 0.85, flicker: 0.25, weave: 0.20, burn: 0.15, scratch: 0.0, dust: 0.10, tint: [1.00, 0.94, 0.92], noise: 0.06 } },
      { id: "dayForNight", name: "Day for Night", subtitle: "blue-tinted night scene", params: { tone: 1.0, flicker: 0.35, weave: 0.30, burn: 0.35, scratch: 0.25, dust: 0.25, tint: [0.70, 0.85, 1.10], noise: 0.10, bright: 0.90 } },
      { id: "goldRush", name: "Gold Rush", subtitle: "amber stock, heavy wear", params: { tone: 1.0, flicker: 0.50, weave: 0.40, burn: 0.60, scratch: 0.70, dust: 0.70, tint: [1.12, 0.92, 0.55], noise: 0.14, vignette: 0.20 } }
    ]
  },
  {
    id: "infrared",
    name: "Infrared",
    subtitle: "False-colour IR film: pink foliage and glowing highlights",
    defaults: { swap: 1.0, foliage: 0.6, glow: 0.4, mono: 0.0, tint: [1.00, 0.92, 0.95] },
    liveWhen: [],
    controls: [
      { key: "swap", label: "Colour shift", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "foliage", label: "Foliage glow", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Halation", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "mono", label: "Black and white", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tint", label: "Mono tint", type: "swatch", options: [
        { name: "Blush",  value: [1.00, 0.92, 0.95] },
        { name: "Neutral", value: [1.00, 1.00, 1.00] },
        { name: "Ice",    value: [0.88, 0.96, 1.05] },
        { name: "Gold",   value: [1.08, 0.98, 0.80] },
        { name: "Violet", value: [0.95, 0.85, 1.08] }
      ] }
    ],
    presets: [
      { id: "aerochrome", name: "Aerochrome", subtitle: "hot pink foliage, deep cyan skies", params: { swap: 1.0, foliage: 0.70, glow: 0.40, mono: 0.0, saturation: 1.20 } },
      { id: "dreamland", name: "Dreamland", subtitle: "softer swap, strong halation", params: { swap: 0.75, foliage: 0.55, glow: 0.80, mono: 0.0, saturation: 1.05, bright: 1.05 } },
      { id: "woodEffect", name: "Wood Effect", subtitle: "black-and-white IR, white leaves", params: { swap: 1.0, foliage: 0.80, glow: 0.55, mono: 1.0, tint: [1.00, 1.00, 1.00], contrast: 1.15, vignette: 0.30 } },
      { id: "frost", name: "Frost", subtitle: "icy mono infrared", params: { swap: 1.0, foliage: 0.60, glow: 0.45, mono: 0.85, tint: [0.88, 0.96, 1.05], vignette: 0.20 } },
      { id: "surreal", name: "Surreal", subtitle: "full swap, violet glow", params: { swap: 1.0, foliage: 1.0, glow: 0.60, mono: 0.25, tint: [0.95, 0.85, 1.08], saturation: 1.35, contrast: 1.05 } }
    ]
  },
  {
    id: "golden",
    name: "Golden Hour",
    subtitle: "Low sun glowing in from the top, warm and soft",
    defaults: { warmth: 0.5, glow: 0.5, bloom: 0.3, haze: 0.2, flare: 0.0, sunX: 0.85, sky: [1.00, 0.62, 0.28] },
    liveWhen: [],
    controls: [
      { key: "warmth", label: "Warmth", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glow", label: "Sunlight", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "bloom", label: "Bloom", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "haze", label: "Haze", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "flare", label: "Lens flare", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "sunX", label: "Sun position", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "sky", label: "Sky", type: "swatch", options: [
        { name: "Sunset",  value: [1.00, 0.62, 0.28] },
        { name: "Golden",  value: [1.00, 0.78, 0.35] },
        { name: "Rose",    value: [1.00, 0.55, 0.55] },
        { name: "Dusk",    value: [0.85, 0.45, 0.80] },
        { name: "Desert",  value: [1.00, 0.45, 0.18] }
      ] }
    ],
    presets: [
      { id: "lateAfternoon", name: "Late Afternoon", subtitle: "warm light from the top right", params: { warmth: 0.45, glow: 0.45, bloom: 0.25, haze: 0.15, flare: 0.0, sunX: 0.85, sky: [1.00, 0.78, 0.35] } },
      { id: "sunset", name: "Sunset", subtitle: "orange glow, a touch of flare", params: { warmth: 0.60, glow: 0.65, bloom: 0.35, haze: 0.25, flare: 0.40, sunX: 0.80, sky: [1.00, 0.62, 0.28], vignette: 0.15 } },
      { id: "magicHour", name: "Magic Hour", subtitle: "pink and soft, from the left", params: { warmth: 0.40, glow: 0.55, bloom: 0.50, haze: 0.35, flare: 0.0, sunX: 0.12, sky: [1.00, 0.55, 0.55], saturation: 1.05 } },
      { id: "dusk", name: "Dusk", subtitle: "violet sky, sun almost gone", params: { warmth: 0.35, glow: 0.45, bloom: 0.20, haze: 0.40, flare: 0.0, sunX: 0.50, sky: [0.85, 0.45, 0.80], bright: 0.92, vignette: 0.30 } },
      { id: "desertSun", name: "Desert Sun", subtitle: "fierce, hazy, flaring", params: { warmth: 0.75, glow: 0.75, bloom: 0.45, haze: 0.50, flare: 0.65, sunX: 0.65, sky: [1.00, 0.45, 0.18], contrast: 1.05, saturation: 0.90 } }
    ]
  },
  {
    id: "hologram",
    name: "Hologram",
    subtitle: "See-through projection with scan bands and flicker",
    defaults: { holo: 0.8, scan: 0.0, flicker: 0.0, split: 0.3, glitch: 0.0, tint: [0.35, 0.90, 1.00] },
    liveWhen: ["scan", "flicker", "glitch"],
    controls: [
      { key: "holo", label: "Projection", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "scan", label: "Scan band", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "flicker", label: "Flicker", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "split", label: "Colour split", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "glitch", label: "Glitch", type: "slider", min: 0, max: 1, step: 0.01, dec: 2 },
      { key: "tint", label: "Beam", type: "swatch", options: [
        { name: "Cyan",    value: [0.35, 0.90, 1.00] },
        { name: "Blue",    value: [0.35, 0.60, 1.00] },
        { name: "Green",   value: [0.40, 1.00, 0.55] },
        { name: "Magenta", value: [1.00, 0.40, 0.90] },
        { name: "Amber",   value: [1.00, 0.70, 0.30] }
      ] }
    ],
    presets: [
      { id: "transmission", name: "Transmission", subtitle: "flickering blue message, rolling band", params: { holo: 0.85, scan: 0.60, flicker: 0.45, split: 0.40, glitch: 0.30, tint: [0.35, 0.60, 1.00], vignette: 0.25 } },
      { id: "starshipHud", name: "Starship HUD", subtitle: "steady cyan, a slow scan", params: { holo: 0.75, scan: 0.40, flicker: 0.0, split: 0.25, glitch: 0.0, tint: [0.35, 0.90, 1.00] } },
      { id: "staticHolo", name: "Still Projection", subtitle: "no motion, just the look", params: { holo: 0.80, scan: 0.0, flicker: 0.0, split: 0.35, glitch: 0.0, tint: [0.35, 0.90, 1.00] } },
      { id: "corrupted", name: "Corrupted", subtitle: "magenta, tearing and stuttering", params: { holo: 0.85, scan: 0.50, flicker: 0.70, split: 0.80, glitch: 0.85, tint: [1.00, 0.40, 0.90], noise: 0.10 } },
      { id: "greenGrid", name: "Green Grid", subtitle: "faint green overlay, keeps some colour", params: { holo: 0.55, scan: 0.30, flicker: 0.15, split: 0.20, glitch: 0.0, tint: [0.40, 1.00, 0.55] } }
    ]

  }
]

function familyById(id) {
  for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].id === id) return FAMILIES[i]
  return FAMILIES[0]
}

function isUserId(id) { return String(id || "").indexOf(USER_PREFIX) === 0 }

function presetById(family, id, userPresets) {
  var i
  if (userPresets) {
    for (i = 0; i < userPresets.length; i++)
      if (userPresets[i].id === id) return userPresets[i]
  }
  for (i = 0; i < family.presets.length; i++)
    if (family.presets[i].id === id) return family.presets[i]
  return family.presets[0]
}

// A family's declared defaults, layered onto the universal picture controls,
// then the preset's own params, then any live user overrides.
function resolve(familyId, presetId, overrides, userPresets) {
  var family = familyById(familyId)
  var preset = presetById(family, presetId, userPresets)
  var out = {}
  var k
  for (k in COMMON_DEFAULTS) out[k] = COMMON_DEFAULTS[k]
  for (k in family.defaults) out[k] = family.defaults[k]
  for (k in preset.params) out[k] = preset.params[k]
  if (overrides) for (k in overrides) if (overrides[k] !== undefined) out[k] = overrides[k]
  return out
}

function isLive(family, params) {
  if (!family.liveWhen || family.liveWhen.length === 0) return false
  for (var i = 0; i < family.liveWhen.length; i++) {
    var key = family.liveWhen[i]
    if (key === "__always") return true
    var v = params[key]
    if (v === true) return true
    if (typeof v === "number" && v > 0) return true
  }
  return false
}

function copyName(baseName, userPresets) {
  var want = "My " + baseName
  var taken = {}
  if (userPresets) for (var i = 0; i < userPresets.length; i++) taken[userPresets[i].name] = true
  if (!taken[want]) return want
  for (var n = 2; n < 100; n++) if (!taken[want + " " + n]) return want + " " + n
  return want + " " + Date.now()
}
