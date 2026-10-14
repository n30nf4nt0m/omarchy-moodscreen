# Moodscreen

A plugin for the [Omarchy](https://omarchy.org/) shell that lays a
full-screen mood shader over the whole desktop. It has twelve families, each
with its own presets and sliders:

- **Glass**: frosted, rippled or stained glass
- **Neon**: glowing, tinted edges with a scan sweep and pulse
- **Game Boy**: four-shade dot-matrix palettes (DMG, Pocket, Virtual Boy…)
- **VHS / Vaporwave**: chroma split, tracking noise, pastel wash
- **Fireplace**: warm, flickering firelight
- **Computer**: dithered, low-colour Amiga, Mac, C64, DOS and Teletext looks
- **Scanlines**: a CRT tube with curvature, an aperture mask and roll
- **Water**: rain on glass, an aquarium (with a fish), or a sheet of ice
- **Toxic**: radioactive tint, glowing edges, bubbling ooze rising from below
- **Post-Apocalypse**: faded, dusty, grimy, with dust storms and film scratches
- **Matrix**: phosphor-tinted desktop behind falling code
- **Security Camera**: grainy CCTV with scan lines, interference, `REC` and a running timecode

## Install

```bash
omarchy plugin add https://github.com/n30nf4nt0m/omarchy-moodscreen.git --enable
```

The 🎨 icon lands in the right section of the bar. Moving it is the usual
`omarchy bar move io.github.phillipelwood1.moodscreen --section <left|center|right>`.

### Developing locally

If you're working on this repo directly instead of installing the git clone:

```bash
ln -s /path/to/omarchy-moodscreen ~/.config/omarchy/plugins/io.github.phillipelwood1.moodscreen
omarchy-shell shell rescanPlugins
omarchy plugin enable io.github.phillipelwood1.moodscreen
```

Editing the QML/JS and saving hot-reloads it in the running shell.

## Using it

- **Left-click** the bar icon to open the panel: pick a family, a preset,
  then fine-tune with the sliders, swatches and toggles.
- **Right-click** the bar icon to switch the shader on or off.
- **Save a copy** keeps your tweaks as your own preset under that family;
  **Reset to stock** drops them.

Your family, preset, tweaks and saved copies are remembered in
`~/.local/state/moodscreen/state.json`.

From a terminal or keybinding:

```bash
omarchy-shell moodscreen toggle              # or enable / disable
omarchy-shell moodscreen family matrix
omarchy-shell moodscreen preset digitalRain
omarchy-shell moodscreen set rain 0.5        # override one param
omarchy-shell moodscreen status
```

## How it works

`ShaderBuilder.js` turns the resolved preset (`Presets.js`) into a GLSL file
at `~/.local/state/moodscreen/current.frag` and points Hyprland's
`decoration:screen_shader` at it.

- **Animation costs extra GPU.** Animated looks (rain, flicker, code rain,
  interference) use Hyprland's `time` uniform, which turns off damage tracking
  and so redraws every frame. Still presets never declare `time`, so they stay
  cheap. Each family's `liveWhen` decides which settings count as animated.
- **No warping.** Hyprland doesn't remap mouse clicks through the shader, so
  effects only move pixels by a few at most. Otherwise you'd click on the
  wrong thing.

## Adding a family

1. Add an entry to `FAMILIES` in `Presets.js`: `defaults`, `liveWhen`,
   `controls` (slider / toggle / swatch) and a few `presets`.
2. Add an effect function to `ShaderBuilder.js` that returns
   `{ consts, body }`. `body` must set `vec3 col`. Then register it in
   `EFFECTS`.
3. Mention it in `manifest.json` (description and aliases).
