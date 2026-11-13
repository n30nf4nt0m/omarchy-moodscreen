.pragma library

// Generates the Hyprland screen shader for a resolved Moodscreen preset.
//
// Uniform names are matched by string in Hyprland's Shader.cpp, so they must
// be spelled exactly: tex, fullSize, time. `time` is only declared when the
// family is actually live (see Presets.isLive) — merely declaring it forces
// Hyprland to disable damage tracking, which it warns "massively increases
// GPU utilization", so a static preset never pays for it.
//
// Every family samples `tex` at (or very near) the true texture coordinate.
// A couple of families nudge the sample point by a few texels for a visual
// wobble (glass ripple, VHS jitter) — Hyprland never warps input hit-testing,
// so any sample offset big enough to matter is a click that lands on the
// wrong thing. Offsets here are capped in the low single-digit texels.

function clamp(v, lo, hi) {
  v = Number(v)
  if (isNaN(v)) return lo
  return Math.max(lo, Math.min(hi, v))
}

function f(v) { return Number(v).toFixed(5) }
function vec3(c) { return "vec3(" + f(c[0]) + ", " + f(c[1]) + ", " + f(c[2]) + ")" }

function sanitizeCommon(p) {
  return {
    bright: clamp(p.bright === undefined ? 1.0 : p.bright, 0.4, 2.2),
    contrast: clamp(p.contrast === undefined ? 1.0 : p.contrast, 0.4, 1.8),
    saturation: clamp(p.saturation === undefined ? 1.0 : p.saturation, 0.0, 2.0),
    vignette: clamp(p.vignette === undefined ? 0.0 : p.vignette, 0.0, 1.0),
    noise: clamp(p.noise === undefined ? 0.0 : p.noise, 0.0, 0.5)
  }
}

var HEADER =
  "vec3 mLuma(vec3 c) { return vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))); }\n" +
  "float luma1(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }\n\n"

// ---- family effects --------------------------------------------------------
// Each returns { consts, body }. `body` sets `vec3 col` from `tex`, using
// uv0 (base texcoord), res, texel, aspect, and — only when `timed` — `time`.

function glassEffect(p, timed) {
  var blur = clamp(p.blur, 0.0, 1.0)
  var refract = clamp(p.refract, 0.0, 1.0)
  var streak = clamp(p.streak, 0.0, 1.0)
  var tintStrength = clamp(p.tintStrength, 0.0, 0.6)
  var tint = p.tint || [0.8, 0.88, 1.0]
  var animate = !!p.animate && timed

  var consts = ""
  consts += "const float BLUR   = " + f(blur) + ";\n"
  consts += "const float REFRACT= " + f(refract) + ";\n"
  consts += "const float STREAK = " + f(streak) + ";\n"
  consts += "const float TINT_STRENGTH = " + f(tintStrength) + ";\n"
  consts += "const vec3  TINT   = " + vec3(tint) + ";\n"

  var body = ""
  body += "  vec2 ruv = uv0;\n"
  if (refract > 0.0) {
    var tphase = animate ? "time * 0.6" : "0.0"
    var tphase2 = animate ? "time * 0.5" : "0.0"
    body += "  float gph = " + tphase + ";\n"
    body += "  float gph2 = " + tphase2 + ";\n"
    body += "  float n = sin(uv0.y * 40.0 + gph) * cos(uv0.x * 37.0 - gph2);\n"
    body += "  ruv += REFRACT * 0.012 * vec2(n, n * 0.6);\n"
  }
  body += "  vec3 col = texture(tex, ruv).rgb;\n"
  if (blur > 0.0) {
    body += "  vec2 br = BLUR * 2.2 * texel;\n"
    body += "  vec3 gblur = texture(tex, ruv + vec2(br.x, 0.0)).rgb + texture(tex, ruv - vec2(br.x, 0.0)).rgb\n"
    body += "             + texture(tex, ruv + vec2(0.0, br.y)).rgb + texture(tex, ruv - vec2(0.0, br.y)).rgb;\n"
    body += "  gblur *= 0.25;\n"
    body += "  col = mix(col, gblur, min(BLUR, 0.9));\n"
  }
  if (tintStrength > 0.0) body += "  col = mix(col, TINT, TINT_STRENGTH);\n"
  if (streak > 0.0) {
    body += "  float sdiag = fract((ruv.x + ruv.y) * 1.3 - 0.15);\n"
    body += "  float streakM = smoothstep(0.06, 0.0, abs(sdiag - 0.5));\n"
    body += "  col += STREAK * 0.35 * streakM;\n"
  }
  return { consts: consts, body: body }
}

function neonEffect(p, timed) {
  var glow = clamp(p.glow, 0.0, 1.0)
  var scan = clamp(p.scan, 0.0, 1.0)
  var pulse = clamp(p.pulse, 0.0, 1.0)
  var hue = p.hue || [1.0, 0.2, 0.8]

  var consts = ""
  consts += "const float GLOW  = " + f(glow) + ";\n"
  consts += "const float SCAN  = " + f(scan) + ";\n"
  consts += "const float PULSE = " + f(pulse) + ";\n"
  consts += "const vec3  HUE   = " + vec3(hue) + ";\n"

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  vec2 eo = texel * 1.5;\n"
  body += "  float lx = luma1(texture(tex, uv0 + vec2(eo.x, 0.0)).rgb) - luma1(texture(tex, uv0 - vec2(eo.x, 0.0)).rgb);\n"
  body += "  float ly = luma1(texture(tex, uv0 + vec2(0.0, eo.y)).rgb) - luma1(texture(tex, uv0 - vec2(0.0, eo.y)).rgb);\n"
  body += "  float edge = clamp(length(vec2(lx, ly)) * 3.0, 0.0, 1.0);\n"
  body += "  vec3 col = base + HUE * edge * GLOW * 1.6;\n"
  if (timed && scan > 0.0) {
    body += "  float sweep = fract(time * 0.15);\n"
    body += "  float band = smoothstep(0.02, 0.0, abs(uv0.y - sweep));\n"
    body += "  col += HUE * band * SCAN * 0.8;\n"
  }
  if (timed && pulse > 0.0) {
    body += "  float pl = 0.5 + 0.5 * sin(time * 3.0);\n"
    body += "  col *= 1.0 + PULSE * 0.25 * pl;\n"
  }
  return { consts: consts, body: body }
}

function gameboyEffect(p, timed) {
  var dotGrid = clamp(p.dotGrid, 0.0, 1.0)
  var ghost = clamp(p.ghost, 0.0, 0.5)
  var pal = p.palette || [[0.06, 0.13, 0.06], [0.19, 0.38, 0.19], [0.55, 0.67, 0.06], [0.68, 0.78, 0.31]]

  var consts = ""
  consts += "const float DOTGRID = " + f(dotGrid) + ";\n"
  consts += "const float GHOST   = " + f(ghost) + ";\n"
  consts += "const vec3  PAL0 = " + vec3(pal[0]) + ";\n"
  consts += "const vec3  PAL1 = " + vec3(pal[1]) + ";\n"
  consts += "const vec3  PAL2 = " + vec3(pal[2]) + ";\n"
  consts += "const vec3  PAL3 = " + vec3(pal[3]) + ";\n"

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  float lv = clamp(luma1(base), 0.0, 0.999);\n"
  body += "  float idx = floor(lv * 4.0);\n"
  body += "  vec3 col = idx < 1.0 ? PAL0 : (idx < 2.0 ? PAL1 : (idx < 3.0 ? PAL2 : PAL3));\n"
  if (ghost > 0.0) {
    body += "  vec2 gb = 1.5 * texel;\n"
    body += "  vec3 gblur = (texture(tex, uv0 + vec2(gb.x, 0.0)).rgb + texture(tex, uv0 - vec2(gb.x, 0.0)).rgb) * 0.5;\n"
    body += "  float glv = clamp(luma1(gblur), 0.0, 0.999);\n"
    body += "  float gidx = floor(glv * 4.0);\n"
    body += "  vec3 gcol = gidx < 1.0 ? PAL0 : (gidx < 2.0 ? PAL1 : (gidx < 3.0 ? PAL2 : PAL3));\n"
    body += "  col = mix(col, gcol, GHOST);\n"
  }
  if (dotGrid > 0.0) {
    body += "  float gridX = step(1.0, mod(gl_FragCoord.x, 3.0));\n"
    body += "  float gridY = step(1.0, mod(gl_FragCoord.y, 3.0));\n"
    body += "  col *= mix(1.0, gridX * gridY, DOTGRID);\n"
  }
  return { consts: consts, body: body }
}

function vhsEffect(p, timed) {
  var chroma = clamp(p.chroma, 0.0, 3.0)
  var tracking = clamp(p.trackingNoise, 0.0, 1.0)
  var scanRoll = clamp(p.scanRoll, 0.0, 1.0)
  var wash = p.wash || [0.9, 0.6, 1.0]
  var washStrength = clamp(p.washStrength, 0.0, 0.6)

  var consts = ""
  consts += "const float CHROMA   = " + f(chroma) + ";\n"
  consts += "const float TRACKING = " + f(tracking) + ";\n"
  consts += "const float SCANROLL = " + f(scanRoll) + ";\n"
  consts += "const vec3  WASH     = " + vec3(wash) + ";\n"
  consts += "const float WASH_STRENGTH = " + f(washStrength) + ";\n"

  var body = ""
  body += "  vec2 uv = uv0;\n"
  if (timed && tracking > 0.0) {
    body += "  float row = floor(gl_FragCoord.y * 0.5);\n"
    body += "  float jitter = fract(sin(row * 12.9898 + floor(time * 20.0) * 78.233) * 43758.5453) - 0.5;\n"
    body += "  uv.x += jitter * TRACKING * 0.012;\n"
  }
  body += "  vec3 col;\n"
  body += "  col.r = texture(tex, uv + vec2(CHROMA * texel.x, 0.0)).r;\n"
  body += "  col.g = texture(tex, uv).g;\n"
  body += "  col.b = texture(tex, uv - vec2(CHROMA * texel.x, 0.0)).b;\n"
  if (washStrength > 0.0) body += "  col = mix(col, WASH, WASH_STRENGTH);\n"
  if (timed && scanRoll > 0.0) {
    body += "  float rollPos = fract(time * 0.06);\n"
    body += "  float rollBand = smoothstep(0.5, 0.0, abs(fract(uv0.y - rollPos) - 0.5) * 40.0);\n"
    body += "  col += rollBand * SCANROLL * 0.4;\n"
  }
  return { consts: consts, body: body }
}

function fireplaceEffect(p, timed) {
  var warmth = clamp(p.warmth, 0.0, 1.0)
  var flicker = clamp(p.flicker, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var glowColor = p.glowColor || [1.0, 0.45, 0.12]

  var consts = ""
  consts += "const float WARMTH = " + f(warmth) + ";\n"
  consts += "const float FLICKERAMT = " + f(flicker) + ";\n"
  consts += "const float GLOWAMT = " + f(glow) + ";\n"
  consts += "const vec3  GLOWCOLOR = " + vec3(glowColor) + ";\n"

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  vec3 warmShift = vec3(1.0 + WARMTH * 0.35, 1.0 + WARMTH * 0.05, 1.0 - WARMTH * 0.35);\n"
  body += "  vec3 col = base * warmShift;\n"
  if (timed) {
    body += "  float n1 = fract(sin(floor(time * 14.0) * 12.9898) * 43758.5453);\n"
    body += "  float n2 = fract(sin(floor(time * 5.0) * 78.233 + 11.0) * 43758.5453);\n"
    body += "  float fl = mix(n1, n2, 0.5);\n"
    body += "  col *= 1.0 - FLICKERAMT * 0.22 * (fl - 0.5);\n"
    body += "  float dist = distance(uv0, vec2(0.5, 1.15));\n"
    body += "  float glowMask = smoothstep(0.9, 0.15, dist);\n"
    body += "  col += GLOWCOLOR * glowMask * GLOWAMT * (0.6 + 0.4 * fl);\n"
  } else {
    body += "  float dist = distance(uv0, vec2(0.5, 1.15));\n"
    body += "  float glowMask = smoothstep(0.9, 0.15, dist);\n"
    body += "  col += GLOWCOLOR * glowMask * GLOWAMT * 0.6;\n"
  }
  return { consts: consts, body: body }
}

function computerEffect(p, timed) {
  var pixelSize = clamp(p.pixelSize, 0.0, 1.0)
  var levels = clamp(p.levels, 2.0, 8.0)
  var dither = clamp(p.dither, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var tint = p.tint || [1.0, 1.0, 1.0]

  var consts = ""
  consts += "const float PIXELSIZE = " + f(pixelSize) + ";\n"
  consts += "const float LEVELS = " + f(levels) + ";\n"
  consts += "const float DITHERAMT = " + f(dither) + ";\n"
  consts += "const float GLOWAMT = " + f(glow) + ";\n"
  consts += "const vec3  TINT = " + vec3(tint) + ";\n"

  var body = ""
  body += "  vec2 block = max(texel * mix(1.0, 9.0, PIXELSIZE), texel);\n"
  body += "  vec2 puv = (floor(uv0 / block) + 0.5) * block;\n"
  body += "  vec3 base = texture(tex, puv).rgb * TINT;\n"
  body += "  float dith = fract(sin(dot(floor(gl_FragCoord.xy * 0.5), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;\n"
  body += "  vec3 col = base + DITHERAMT * dith * (1.0 / LEVELS);\n"
  body += "  col = floor(col * LEVELS + 0.5) / LEVELS;\n"
  if (glow > 0.0) body += "  col += GLOWAMT * 0.18 * base;\n"
  return { consts: consts, body: body }
}

function scanlinesEffect(p, timed) {
  var lineStrength = clamp(p.lineStrength, 0.0, 1.0)
  var curvature = clamp(p.curvature, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var mask = clamp(p.mask, 0.0, 1.0)
  var roll = clamp(p.roll, 0.0, 1.0)
  var rolling = roll > 0.0 && timed

  var consts = ""
  consts += "const float LINESTRENGTH = " + f(lineStrength) + ";\n"
  consts += "const float CURVATURE = " + f(curvature) + ";\n"
  consts += "const float GLOWAMT = " + f(glow) + ";\n"
  consts += "const float MASKAMT = " + f(mask) + ";\n"
  consts += "const float ROLLAMT = " + f(roll) + ";\n"

  var body = ""
  body += "  vec2 cuv = uv0 * 2.0 - 1.0;\n"
  body += "  vec2 warped = cuv * (1.0 + CURVATURE * 0.20 * vec2(dot(cuv, cuv)));\n"
  body += "  vec2 suv = warped * 0.5 + 0.5;\n"
  if (rolling) body += "  suv.y = fract(suv.y + time * 0.04 * ROLLAMT);\n"
  body += "  float inb = (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) ? 1.0 : 0.0;\n"
  body += "  vec3 base = texture(tex, clamp(suv, 0.001, 0.999)).rgb;\n"
  body += "  vec3 col = base * inb;\n"
  body += "  float line = sin(suv.y * res.y * 3.14159265);\n"
  body += "  col *= mix(1.0, 0.6 + 0.4 * (line * 0.5 + 0.5), LINESTRENGTH);\n"
  body += "  float colIdx = mod(gl_FragCoord.x, 3.0);\n"
  body += "  vec3 maskColor = colIdx < 1.0 ? vec3(1.0, 0.65, 0.65) : (colIdx < 2.0 ? vec3(0.65, 1.0, 0.65) : vec3(0.65, 0.65, 1.0));\n"
  body += "  col = mix(col, col * maskColor, MASKAMT);\n"
  if (glow > 0.0) body += "  col += GLOWAMT * 0.15 * base;\n"
  return { consts: consts, body: body }
}

function waterEffect(p, timed) {
  var drop = clamp(p.dropAmount, 0.0, 1.0)
  var caustic = clamp(p.caustic, 0.0, 1.0)
  var frost = clamp(p.frost, 0.0, 1.0)
  var fish = clamp(p.fish, 0.0, 1.0)
  var tint = p.tint || [0.75, 0.88, 0.95]

  var liveRain = drop > 0.0 && timed
  var liveCaustic = caustic > 0.0 && timed
  var liveFish = fish > 0.0 && timed

  var consts = ""
  consts += "const float DROP = " + f(drop) + ";\n"
  consts += "const float CAUSTIC = " + f(caustic) + ";\n"
  consts += "const float FROST = " + f(frost) + ";\n"
  consts += "const float FISH = " + f(fish) + ";\n"
  consts += "const vec3  WTINT = " + vec3(tint) + ";\n"

  var body = ""
  body += "  vec2 wuv = uv0;\n"

  if (drop > 0.0) {
    var rtime = liveRain ? "time" : "0.0"
    body += "  float rcol = floor(uv0.x * 80.0);\n"
    body += "  float rrand = fract(sin(rcol * 91.345) * 47453.7);\n"
    body += "  float rphase = fract(uv0.y * 3.0 - " + rtime + " * (0.5 + rrand * 1.5) - rrand * 10.0);\n"
    body += "  float rstreak = smoothstep(0.08, 0.0, rphase) * (1.0 - uv0.y * 0.3);\n"
    body += "  wuv.x += DROP * 0.003 * sin(uv0.y * 40.0 + rrand * 20.0);\n"
  }

  body += "  vec3 col = texture(tex, wuv).rgb * WTINT;\n"

  if (drop > 0.0) {
    body += "  col = mix(col, col * 0.55, rstreak * DROP);\n"
    body += "  col += vec3(0.65, 0.75, 0.85) * rstreak * DROP * 0.35;\n"
  }

  if (caustic > 0.0) {
    var ctime = liveCaustic ? "time" : "0.0"
    body += "  float c1 = sin(uv0.x * 9.0 + " + ctime + " * 0.6) * sin(uv0.y * 9.0 - " + ctime + " * 0.4);\n"
    body += "  float c2 = sin(uv0.x * 5.0 - " + ctime + " * 0.3 + uv0.y * 5.0);\n"
    body += "  float causticLight = smoothstep(0.3, 1.0, c1 * 0.5 + c2 * 0.5 + 0.5);\n"
    body += "  col += CAUSTIC * 0.30 * causticLight * vec3(0.6, 0.9, 0.9);\n"
  }

  if (frost > 0.0) {
    body += "  float fx = uv0.x * 18.0 + sin(uv0.y * 9.0) * 1.5;\n"
    body += "  float fyv = uv0.y * 18.0 + sin(uv0.x * 7.0) * 1.5;\n"
    body += "  float crystal = smoothstep(0.15, 0.9, abs(sin(fx)) * abs(sin(fyv)));\n"
    body += "  col = mix(col, vec3(0.85, 0.93, 1.0), FROST * 0.5);\n"
    body += "  col += FROST * 0.22 * (1.0 - crystal) * vec3(0.7, 0.85, 1.0);\n"
  }

  if (fish > 0.0) {
    var ftime = liveFish ? "time" : "0.0"
    body += "  float swimX = fract(" + ftime + " * 0.06);\n"
    body += "  float fishX = mix(-0.15, 1.15, swimX);\n"
    body += "  float fishY = 0.5 + 0.12 * sin(" + ftime + " * 0.9);\n"
    body += "  vec2 fp = uv0 - vec2(fishX, fishY);\n"
    body += "  fp.x *= aspect;\n"
    // Chubby round body (a cute silhouette reads better than an elongated one).
    body += "  float bodyR = 0.055;\n"
    body += "  float bodyD = length(fp / vec2(1.5, 1.15)) - bodyR;\n"
    body += "  float bodyMask = 1.0 - smoothstep(0.0, 0.008, bodyD);\n"
    // Tail fin: a narrow peduncle at the body that flares OUT to a wide tip,
    // the opposite taper from a dart shape — a fin that's wide at the body
    // and narrows to a point reads as pointing the wrong way.
    body += "  vec2 tp = fp - vec2(-bodyR * 1.4, 0.0);\n"
    if (liveFish) body += "  tp.y += bodyR * 0.22 * sin(time * 7.0);\n"
    body += "  float tailLen = 0.10;\n"
    body += "  float tailTip = bodyR * 1.35;\n"
    body += "  float txp = clamp(-tp.x / tailLen, 0.0, 1.0);\n"
    body += "  float allowedY = mix(bodyR * 0.12, tailTip, txp);\n"
    body += "  float inTailX = step(0.0, -tp.x) * step(-tp.x, tailLen);\n"
    body += "  float tailMask = inTailX * smoothstep(0.0, 0.012, allowedY - abs(tp.y));\n"
    // Small dorsal fin for a friendlier silhouette.
    body += "  vec2 dp = fp - vec2(-bodyR * 0.25, -bodyR * 0.75);\n"
    body += "  float finLen = bodyR * 0.6;\n"
    body += "  float finBase = bodyR * 0.5;\n"
    body += "  float dyp = clamp(-dp.y / finLen, 0.0, 1.0);\n"
    body += "  float finAllowedX = finBase * (1.0 - dyp);\n"
    body += "  float dorsalMask = step(dp.y, 0.0) * step(-finLen, dp.y) * step(abs(dp.x), finAllowedX);\n"
    body += "  float fishMask = max(max(bodyMask, tailMask), dorsalMask);\n"
    // Soft top-to-bottom shading plus a big googly eye for a cuter look.
    body += "  float shade = clamp(0.5 - fp.y / bodyR * 0.5, 0.0, 1.0);\n"
    body += "  vec3 fishColor = mix(vec3(0.88, 0.42, 0.06), vec3(1.00, 0.74, 0.34), shade);\n"
    body += "  vec2 ep = fp - vec2(bodyR * 0.80, -0.010);\n"
    body += "  float eyeWhite = 1.0 - smoothstep(0.0, 0.005, length(ep) - 0.016);\n"
    body += "  float eyePupil = 1.0 - smoothstep(0.0, 0.003, length(ep - vec2(0.004, -0.003)) - 0.008);\n"
    body += "  float eyeGlint = 1.0 - smoothstep(0.0, 0.002, length(ep - vec2(-0.003, -0.007)) - 0.003);\n"
    body += "  col = mix(col, fishColor, fishMask * FISH);\n"
    body += "  col = mix(col, vec3(1.0), eyeWhite * bodyMask * FISH);\n"
    body += "  col = mix(col, vec3(0.05, 0.05, 0.08), eyePupil * bodyMask * FISH);\n"
    body += "  col = mix(col, vec3(1.0), eyeGlint * bodyMask * FISH);\n"
  }

  return { consts: consts, body: body }
}

// Shared helpers for the newer families. Emitted into the effect's consts
// block (global scope, ahead of main) only by families that use them.
var NOISE_FNS =
  "float mHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n" +
  "float mNoise(vec2 p) {\n" +
  "  vec2 i = floor(p); vec2 fr = fract(p);\n" +
  "  vec2 u = fr * fr * (3.0 - 2.0 * fr);\n" +
  "  return mix(mix(mHash(i), mHash(i + vec2(1.0, 0.0)), u.x),\n" +
  "             mix(mHash(i + vec2(0.0, 1.0)), mHash(i + vec2(1.0, 1.0)), u.x), u.y);\n" +
  "}\n"

// Edge strength from a luma gradient, as the Neon family does it.
var EDGE_BODY =
  "  vec2 eo = texel * 1.5;\n" +
  "  float lx = luma1(texture(tex, uv0 + vec2(eo.x, 0.0)).rgb) - luma1(texture(tex, uv0 - vec2(eo.x, 0.0)).rgb);\n" +
  "  float ly = luma1(texture(tex, uv0 + vec2(0.0, eo.y)).rgb) - luma1(texture(tex, uv0 - vec2(0.0, eo.y)).rgb);\n" +
  "  float edge = clamp(length(vec2(lx, ly)) * 3.0, 0.0, 1.0);\n"

// Seven-segment glyphs for the on-screen text. Bits: a=1 b=2 c=4 d=8
// e=16 f=32 g=64; a glyph cell is 1 wide by 2 tall, y pointing down.
// Code 0 is a blank, -1 a colon.
var SEG_FNS =
  "const int SEG_DIGITS[10] = int[10](63, 6, 91, 79, 102, 109, 125, 7, 127, 111);\n" +
  "float segH(vec2 q, float y, float w) { return step(abs(q.y - y), w) * step(w, q.x) * step(q.x, 1.0 - w); }\n" +
  "float segV(vec2 q, float x, float y0, float w) { return step(abs(q.x - x), w) * step(y0 + w, q.y) * step(q.y, y0 + 1.0 - w); }\n" +
  "float segGlyph(vec2 q, int m) {\n" +
  "  if (m == 0 || q.x < -0.2 || q.x > 1.2 || q.y < -0.2 || q.y > 2.2) return 0.0;\n" +
  "  if (m < 0) return max(step(length(q - vec2(0.5, 0.6)), 0.16), step(length(q - vec2(0.5, 1.4)), 0.16));\n" +
  "  float w = 0.17;\n" +
  "  float o = 0.0;\n" +
  "  if ((m & 1) != 0) o = max(o, segH(q, 0.0, w));\n" +
  "  if ((m & 2) != 0) o = max(o, segV(q, 1.0, 0.0, w));\n" +
  "  if ((m & 4) != 0) o = max(o, segV(q, 1.0, 1.0, w));\n" +
  "  if ((m & 8) != 0) o = max(o, segH(q, 2.0, w));\n" +
  "  if ((m & 16) != 0) o = max(o, segV(q, 0.0, 1.0, w));\n" +
  "  if ((m & 32) != 0) o = max(o, segV(q, 0.0, 0.0, w));\n" +
  "  if ((m & 64) != 0) o = max(o, segH(q, 1.0, w));\n" +
  "  return o;\n" +
  "}\n" +
  // segText: up to 8 glyphs left to right from `origin`, `u` px per unit.
  "float segText(vec2 px, vec2 origin, float u, int codes[8]) {\n" +
  "  vec2 q = (px - origin) / u;\n" +
  "  float slot = floor(q.x / 1.6);\n" +
  "  if (slot < 0.0 || slot > 7.0 || q.y < -0.3 || q.y > 2.3) return 0.0;\n" +
  "  return segGlyph(vec2(q.x - slot * 1.6, q.y), codes[int(slot)]);\n" +
  "}\n"

function toxicEffect(p, timed) {
  var toxicity = clamp(p.toxicity, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var ooze = clamp(p.ooze, 0.0, 1.0)
  var pulse = clamp(p.pulse, 0.0, 1.0)
  var toxin = p.toxin || [0.45, 1.0, 0.15]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float TOXICITY = " + f(toxicity) + ";\n"
  consts += "const float GLOWAMT = " + f(glow) + ";\n"
  consts += "const float OOZE = " + f(ooze) + ";\n"
  consts += "const float PULSE = " + f(pulse) + ";\n"
  consts += "const vec3  TOXIN = " + vec3(toxin) + ";\n"
  consts += NOISE_FNS

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  float lv = luma1(base);\n"
  // Duotone from near-black toxin to full toxin, with hot highlights going white.
  body += "  vec3 duo = mix(TOXIN * 0.06, TOXIN, smoothstep(0.0, 1.0, lv)) + vec3(pow(lv, 3.0)) * 0.35;\n"
  body += "  vec3 col = mix(base, duo, TOXICITY);\n"
  body += "  float pl = 1.0;\n"
  if (timed && pulse > 0.0) body += "  pl = 1.0 + PULSE * 0.6 * sin(time * 2.2);\n"
  if (glow > 0.0) {
    body += EDGE_BODY
    body += "  col += TOXIN * edge * GLOWAMT * 1.4 * pl;\n"
  }
  if (ooze > 0.0) {
    // Wavy glowing surface rising from the bottom edge, with bubbles in it.
    body += "  float ot = " + t + ";\n"
    body += "  float wave = 0.08 * sin(uv0.x * 11.0 + ot * 0.7) + 0.05 * sin(uv0.x * 23.0 - ot * 1.1) + 0.03 * sin(uv0.x * 47.0 + ot * 1.9);\n"
    body += "  float level = 1.0 - OOZE * 0.35 + wave * OOZE;\n"
    body += "  float fog = smoothstep(level - 0.15, level + 0.05, uv0.y);\n"
    body += "  col += TOXIN * fog * OOZE * 0.55 * pl;\n"
    body += "  float surface = smoothstep(0.012, 0.0, abs(uv0.y - level - 0.02));\n"
    body += "  col += TOXIN * surface * OOZE * 0.8;\n"
    body += "  vec2 bc = vec2(uv0.x * aspect * 14.0, uv0.y * 14.0 + ot * 0.8);\n"
    body += "  vec2 bcell = floor(bc);\n"
    body += "  float br = mHash(bcell);\n"
    body += "  vec2 bp = fract(bc) - 0.5 - (vec2(mHash(bcell + 1.3), mHash(bcell + 7.1)) - 0.5) * 0.5;\n"
    body += "  float bubble = smoothstep(0.035, 0.0, abs(length(bp) - 0.18 * br)) * step(0.55, br) * fog;\n"
    body += "  col += TOXIN * bubble * OOZE * 0.7;\n"
  }
  if (timed && pulse > 0.0) body += "  col *= 1.0 + PULSE * 0.10 * sin(time * 2.2);\n"
  return { consts: consts, body: body }
}

function wastelandEffect(p, timed) {
  var fade = clamp(p.fade, 0.0, 1.0)
  var dust = clamp(p.dust, 0.0, 1.0)
  var grime = clamp(p.grime, 0.0, 1.0)
  var storm = clamp(p.storm, 0.0, 1.0)
  var scratches = clamp(p.scratches, 0.0, 1.0)
  var dustColor = p.dustColor || [0.82, 0.62, 0.38]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float FADE = " + f(fade) + ";\n"
  consts += "const float DUST = " + f(dust) + ";\n"
  consts += "const float GRIME = " + f(grime) + ";\n"
  consts += "const float STORM = " + f(storm) + ";\n"
  consts += "const float SCRATCHES = " + f(scratches) + ";\n"
  consts += "const vec3  DUSTCOL = " + vec3(dustColor) + ";\n"
  consts += NOISE_FNS

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  vec3 col = mix(base, mLuma(base), FADE * 0.8);\n"
  // Bleached: lifted blacks, everything pulled toward the sky colour.
  body += "  col = col * (1.0 - FADE * 0.15) + DUSTCOL * FADE * 0.08;\n"
  body += "  col = mix(col, col * DUSTCOL * 1.3, DUST);\n"
  body += "  col = mix(col, DUSTCOL, DUST * 0.22 * smoothstep(0.6, 0.0, uv0.y));\n"
  body += "  vec2 nuv = uv0 * vec2(aspect, 1.0);\n"
  if (grime > 0.0) {
    body += "  float gn = mNoise(nuv * 5.0) * 0.6 + mNoise(nuv * 13.0) * 0.3 + mNoise(nuv * 31.0) * 0.1;\n"
    body += "  float blot = smoothstep(0.55, 0.85, gn);\n"
    body += "  vec2 ec = uv0 * 2.0 - 1.0;\n"
    body += "  float edgeDirt = smoothstep(0.5, 1.2, max(abs(ec.x), abs(ec.y)) + (gn - 0.5) * 0.6);\n"
    body += "  col *= 1.0 - GRIME * 0.45 * max(blot, edgeDirt);\n"
  }
  if (storm > 0.0) {
    body += "  float st = " + t + ";\n"
    body += "  vec2 sp = vec2(nuv.x * 3.0 - st * 0.6, nuv.y * 10.0 + sin(nuv.x * 2.0 + st * 0.3));\n"
    body += "  float sn = mNoise(sp) * 0.65 + mNoise(sp * 2.3 + vec2(st * 0.8, 0.0)) * 0.35;\n"
    body += "  col = mix(col, DUSTCOL * 1.1, STORM * 0.65 * smoothstep(0.35, 0.9, sn));\n"
    body += "  float grit = step(0.997 - STORM * 0.004, mHash(floor(uv0 * res * 0.5) + floor(st * 24.0)));\n"
    body += "  col = mix(col, DUSTCOL * 1.3, grit * 0.6);\n"
  }
  if (scratches > 0.0 && timed) {
    // Film reel damage: a few vertical scratches and flecks per frame tick.
    body += "  float frm = floor(time * 18.0);\n"
    body += "  float scr = 0.0;\n"
    body += "  for (int i = 0; i < 3; i++) {\n"
    body += "    float fi = float(i);\n"
    body += "    float sx = mHash(vec2(frm, fi * 7.3));\n"
    body += "    float show = step(mHash(vec2(fi * 3.1, floor(time * 2.0) + fi)), SCRATCHES * 0.8);\n"
    body += "    scr = max(scr, show * smoothstep(1.5 * texel.x, 0.0, abs(uv0.x - sx)) * (0.6 + 0.4 * mNoise(vec2(fi, uv0.y * 40.0))));\n"
    body += "  }\n"
    body += "  float fleck = step(1.0 - SCRATCHES * 0.0015, mHash(floor(uv0 * res / 3.0) + frm * 1.7));\n"
    body += "  col = mix(col, vec3(0.92, 0.88, 0.78), scr * 0.55);\n"
    body += "  col = mix(col, vec3(0.05), fleck * 0.8);\n"
  }
  return { consts: consts, body: body }
}

function matrixEffect(p, timed) {
  var rain = clamp(p.rain, 0.0, 1.0)
  var density = clamp(p.density, 0.0, 1.0)
  var speed = clamp(p.speed, 0.0, 1.0)
  var mono = clamp(p.mono, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var code = p.code || [0.25, 1.0, 0.35]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float RAIN = " + f(rain) + ";\n"
  consts += "const float DENSITY = " + f(density) + ";\n"
  consts += "const float SPEED = " + f(speed) + ";\n"
  consts += "const float MONO = " + f(mono) + ";\n"
  consts += "const float GLOWAMT = " + f(glow) + ";\n"
  consts += "const vec3  CODE = " + vec3(code) + ";\n"
  consts += NOISE_FNS

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  float lv = luma1(base);\n"
  body += "  vec3 col = mix(base, CODE * lv * 1.15 + vec3(pow(lv, 4.0)) * 0.25, MONO);\n"
  if (glow > 0.0) {
    body += "  vec2 go = texel * 2.5;\n"
    body += "  float gl = (luma1(texture(tex, uv0 + vec2(go.x, 0.0)).rgb) + luma1(texture(tex, uv0 - vec2(go.x, 0.0)).rgb)\n"
    body += "           + luma1(texture(tex, uv0 + vec2(0.0, go.y)).rgb) + luma1(texture(tex, uv0 - vec2(0.0, go.y)).rgb)) * 0.25;\n"
    body += "  col += CODE * gl * GLOWAMT * 0.30;\n"
  }
  if (rain > 0.0) {
    // Columns of procedural 5x7 glyphs; each active column has a falling
    // bright head with a fading trail, and glyphs reshuffle as they fall.
    body += "  float mt = " + t + ";\n"
    body += "  float sc = max(1.0, floor(res.y / 1080.0 + 0.5));\n"
    body += "  vec2 cellSz = vec2(12.0, 18.0) * sc;\n"
    body += "  vec2 gpx = uv0 * res;\n"
    body += "  vec2 cell = floor(gpx / cellSz);\n"
    body += "  vec2 inCell = fract(gpx / cellSz);\n"
    body += "  float rows = res.y / cellSz.y;\n"
    body += "  float colOn = step(mHash(vec2(cell.x, 3.7)), DENSITY);\n"
    body += "  float spd = mix(0.08, 0.30, mHash(vec2(cell.x, 1.9))) * mix(0.4, 1.8, SPEED);\n"
    body += "  float trailLen = rows * mix(0.25, 0.6, mHash(vec2(cell.x, 8.2)));\n"
    body += "  float headY = fract(mt * spd + mHash(vec2(cell.x, 5.3))) * (rows + trailLen);\n"
    body += "  float d = headY - cell.y;\n"
    body += "  float trail = step(0.0, d) * exp(-d / max(trailLen * 0.35, 1.0)) * step(d, trailLen);\n"
    body += "  float isHead = step(0.0, d) * step(d, 1.0);\n"
    body += "  vec2 g = floor(inCell * vec2(7.0, 9.0)) - 1.0;\n"
    body += "  float inGlyph = step(0.0, g.x) * step(g.x, 4.0) * step(0.0, g.y) * step(g.y, 6.0);\n"
    body += "  float seed = floor(mt * mix(0.5, 6.0, mHash(cell)) + mHash(cell + 4.4) * 10.0);\n"
    body += "  vec2 gm = vec2(mHash(cell + seed) < 0.5 ? min(g.x, 4.0 - g.x) : g.x, g.y);\n"
    body += "  float bit = step(0.48, mHash(gm * 0.37 + cell * 1.31 + seed * 0.71));\n"
    body += "  float glyph = bit * inGlyph * colOn;\n"
    body += "  col += CODE * glyph * trail * RAIN * 1.2;\n"
    body += "  col += vec3(0.75, 1.0, 0.85) * glyph * isHead * RAIN;\n"
  }
  return { consts: consts, body: body }
}

function cctvEffect(p, timed) {
  var mono = clamp(p.mono, 0.0, 1.0)
  var lines = clamp(p.lines, 0.0, 1.0)
  var soft = clamp(p.soft, 0.0, 1.0)
  var interference = clamp(p.interference, 0.0, 1.0)
  var overlay = p.overlay === undefined ? true : !!p.overlay
  var clock = !!p.clock && timed
  var camTint = p.camTint || [0.92, 1.0, 0.95]

  var consts = ""
  consts += "const float MONO = " + f(mono) + ";\n"
  consts += "const float LINES = " + f(lines) + ";\n"
  consts += "const float SOFT = " + f(soft) + ";\n"
  consts += "const float INTERFERENCE = " + f(interference) + ";\n"
  consts += "const vec3  CAMTINT = " + vec3(camTint) + ";\n"
  consts += NOISE_FNS
  if (overlay) consts += SEG_FNS

  var body = ""
  body += "  vec2 cuv = uv0;\n"
  if (timed && interference > 0.0) {
    // Tearing: occasional rows shift sideways, capped at 3 texels.
    body += "  float tearRow = floor(uv0.y * 90.0);\n"
    body += "  float tearOn = step(1.0 - INTERFERENCE * 0.12, mHash(vec2(tearRow, floor(time * 12.0))));\n"
    body += "  cuv.x += tearOn * (mHash(vec2(tearRow, floor(time * 12.0) + 0.5)) - 0.5) * 6.0 * texel.x;\n"
  }
  body += "  vec3 base = texture(tex, cuv).rgb;\n"
  if (soft > 0.0) {
    body += "  vec2 so = SOFT * 1.6 * texel;\n"
    body += "  vec3 sblur = (texture(tex, cuv + vec2(so.x, 0.0)).rgb + texture(tex, cuv - vec2(so.x, 0.0)).rgb\n"
    body += "             + texture(tex, cuv + vec2(0.0, so.y)).rgb + texture(tex, cuv - vec2(0.0, so.y)).rgb) * 0.25;\n"
    body += "  base = mix(base, sblur, min(SOFT, 0.85));\n"
  }
  body += "  vec3 col = mix(base * CAMTINT, mLuma(base) * CAMTINT, MONO);\n"
  if (lines > 0.0) {
    body += "  float sl = 0.5 + 0.5 * sin(uv0.y * res.y * 1.5708);\n"
    body += "  col *= 1.0 - LINES * 0.35 * sl;\n"
  }
  if (timed && interference > 0.0) {
    body += "  float barPos = fract(time * 0.07);\n"
    body += "  float bar = smoothstep(0.08, 0.0, abs(fract(uv0.y - barPos + 0.5) - 0.5));\n"
    body += "  col += bar * INTERFERENCE * 0.18;\n"
    body += "  float burst = step(1.0 - INTERFERENCE * 0.03, mHash(vec2(floor(time * 8.0), 2.7)));\n"
    body += "  col = mix(col, vec3(mHash(floor(uv0 * res * 0.5) + fract(time) * 91.0)), burst * 0.35);\n"
  }
  if (overlay) {
    body += "  vec2 opx = uv0 * res;\n"
    body += "  float osc = max(1.0, res.y / 1080.0);\n"
    body += "  float u = 13.0 * osc;\n"
    body += "  vec3 ink = mix(vec3(1.0), CAMTINT, 0.4);\n"
    // Corner brackets framing the feed.
    body += "  vec2 dc = min(opx, res - opx) - vec2(48.0 * osc);\n"
    body += "  float bth = 2.5 * osc;\n"
    body += "  float blen = 60.0 * osc;\n"
    body += "  float brk = step(abs(dc.x), bth) * step(-bth, dc.y) * step(dc.y, blen) + step(abs(dc.y), bth) * step(-bth, dc.x) * step(dc.x, blen);\n"
    body += "  col = mix(col, ink, clamp(brk, 0.0, 1.0) * 0.85);\n"
    // Overlay text gets a dark drop shadow so it reads on light windows too.
    var text = function (origin, codes) {
      return "  col = mix(col, vec3(0.0), segText(opx - vec2(2.0 * osc), " + origin + ", u, " + codes + ") * 0.6);\n" +
             "  col = mix(col, ink, segText(opx, " + origin + ", u, " + codes + ") * 0.9);\n"
    }
    // CH01, top left.
    body += text("vec2(80.0, 72.0) * osc", "int[8](57, 118, 0, 63, 6, 0, 0, 0)")
    // Red dot and REC, top right; the dot blinks when live.
    var blink = timed ? "step(0.5, fract(time * 0.8))" : "1.0"
    body += "  vec2 recO = vec2(res.x - 190.0 * osc, 72.0 * osc);\n"
    body += "  float recDot = step(length(opx - recO - vec2(-10.0 * osc, u)), 9.0 * osc) * " + blink + ";\n"
    body += "  col = mix(col, vec3(1.0, 0.12, 0.10), recDot);\n"
    body += text("recO + vec2(14.0 * osc, 0.0)", "int[8](80, 121, 57, 0, 0, 0, 0, 0)")
    if (clock) {
      // Hyprland's `time` restarts whenever a shader is loaded, so this is a
      // running timecode from when the look was switched on, not a wall clock.
      body += "  float secs = mod(time, 86400.0);\n"
      body += "  int hh = int(secs / 3600.0);\n"
      body += "  int mm = int(mod(secs, 3600.0) / 60.0);\n"
      body += "  int ss = int(mod(secs, 60.0));\n"
      body += "  int clk[8] = int[8](SEG_DIGITS[hh / 10], SEG_DIGITS[hh % 10], -1, SEG_DIGITS[mm / 10], SEG_DIGITS[mm % 10], -1, SEG_DIGITS[ss / 10], SEG_DIGITS[ss % 10]);\n"
      body += text("vec2(80.0 * osc, res.y - 72.0 * osc - 2.0 * u)", "clk")
    }
  }
  return { consts: consts, body: body }
}

function noirEffect(p, timed) {
  var punch = clamp(p.punch, 0.0, 1.0)
  var blinds = clamp(p.blinds, 0.0, 1.0)
  var spot = clamp(p.spot, 0.0, 1.0)
  var smoke = clamp(p.smoke, 0.0, 1.0)
  var filmTint = p.filmTint || [1.0, 1.0, 1.0]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float PUNCH = " + f(punch) + ";\n"
  consts += "const float BLINDS = " + f(blinds) + ";\n"
  consts += "const float SPOT = " + f(spot) + ";\n"
  consts += "const float SMOKE = " + f(smoke) + ";\n"
  consts += "const vec3  FILMTINT = " + vec3(filmTint) + ";\n"
  if (smoke > 0.0) consts += NOISE_FNS

  var body = ""
  body += "  float lv = luma1(texture(tex, uv0).rgb);\n"
  // Steeper S-curve: blacks crush, whites bloom.
  body += "  float pc = clamp((lv - 0.5) * (1.0 + PUNCH * 1.2) + 0.5, 0.0, 1.0);\n"
  body += "  lv = mix(lv, pc * pc * (3.0 - 2.0 * pc), PUNCH);\n"
  if (blinds > 0.0) {
    // Slatted window light slanting in from the top left.
    body += "  float slat = fract((uv0.y + uv0.x * 0.35) * 11.0);\n"
    body += "  float lit = smoothstep(0.0, 0.06, slat) * smoothstep(0.62, 0.54, slat);\n"
    body += "  float fall = smoothstep(1.5, 0.2, length(uv0 * vec2(aspect, 1.0)));\n"
    body += "  lv *= 1.0 - BLINDS * 0.6 * (1.0 - lit) * mix(0.35, 1.0, fall);\n"
    body += "  lv += BLINDS * 0.08 * lit * fall;\n"
  }
  if (spot > 0.0) {
    body += "  float sd = length((uv0 - vec2(0.45, 0.40)) * vec2(aspect, 1.0));\n"
    body += "  lv *= mix(1.0, 1.15 - smoothstep(0.15, 0.95, sd) * 0.85, SPOT);\n"
  }
  if (smoke > 0.0) {
    body += "  float st = " + t + ";\n"
    body += "  vec2 sp = uv0 * vec2(aspect, 1.0) * 2.5 + vec2(st * 0.04, -st * 0.07);\n"
    body += "  float sn = mNoise(sp) * 0.6 + mNoise(sp * 2.1 + vec2(-st * 0.05, 0.0)) * 0.3 + mNoise(sp * 4.3) * 0.1;\n"
    body += "  lv = mix(lv, 0.75, SMOKE * 0.35 * smoothstep(0.45, 0.95, sn));\n"
  }
  body += "  vec3 col = vec3(lv) * FILMTINT;\n"
  return { consts: consts, body: body }
}

function thermalEffect(p, timed) {
  var heat = clamp(p.heat, 0.0, 1.0)
  var soft = clamp(p.soft, 0.0, 1.0)
  var outline = clamp(p.outline, 0.0, 1.0)
  var shimmer = clamp(p.shimmer, 0.0, 1.0)
  var hud = !!p.hud
  var pal = p.palette || [[0.02, 0.0, 0.1], [0.4, 0.0, 0.55], [0.9, 0.2, 0.2], [1.0, 0.65, 0.05], [1.0, 1.0, 0.8]]

  var consts = ""
  consts += "const float HEAT = " + f(heat) + ";\n"
  consts += "const float SOFT = " + f(soft) + ";\n"
  consts += "const float OUTLINE = " + f(outline) + ";\n"
  consts += "const float SHIMMER = " + f(shimmer) + ";\n"
  for (var i = 0; i < 5; i++) consts += "const vec3  PAL" + i + " = " + vec3(pal[Math.min(i, pal.length - 1)]) + ";\n"
  // Heat proxy: brightness, nudged up for warm colours and down for cool ones.
  consts += "float heatOf(vec3 c) { return clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)) * 0.85 + (c.r - c.b) * 0.2 + 0.05, 0.0, 1.0); }\n"
  consts += "float heatCurve(float h) { return clamp((h - 0.5) * (0.6 + HEAT * 1.6) + 0.5, 0.0, 1.0); }\n"
  consts += "vec3 thermalPal(float h) {\n"
  consts += "  float x = clamp(h, 0.0, 1.0) * 4.0;\n"
  consts += "  if (x < 1.0) return mix(PAL0, PAL1, x);\n"
  consts += "  if (x < 2.0) return mix(PAL1, PAL2, x - 1.0);\n"
  consts += "  if (x < 3.0) return mix(PAL2, PAL3, x - 2.0);\n"
  consts += "  return mix(PAL3, PAL4, x - 3.0);\n"
  consts += "}\n"
  if (shimmer > 0.0) consts += NOISE_FNS
  if (hud) consts += SEG_FNS

  var body = ""
  body += "  float h = heatOf(texture(tex, uv0).rgb);\n"
  if (soft > 0.0 || outline > 0.0) {
    // Neighbourhood heat: blurs the image when soft, and tells the outline
    // what the surrounding background is.
    body += "  vec2 so = max(SOFT * 2.0, 1.5) * texel;\n"
    body += "  float hb = (heatOf(texture(tex, uv0 + vec2(so.x, 0.0)).rgb) + heatOf(texture(tex, uv0 - vec2(so.x, 0.0)).rgb)\n"
    body += "           + heatOf(texture(tex, uv0 + vec2(0.0, so.y)).rgb) + heatOf(texture(tex, uv0 - vec2(0.0, so.y)).rgb)) * 0.25;\n"
  }
  if (soft > 0.0) body += "  h = mix(h, hb, min(SOFT, 0.85));\n"
  body += "  h = heatCurve(h);\n"
  if (shimmer > 0.0) {
    // Rising heat haze. It wobbles the heat value, never the sample point.
    var st = timed ? "time" : "0.0"
    body += "  h += SHIMMER * 0.10 * (mNoise(uv0 * vec2(aspect, 1.0) * 7.0 + vec2(0.0, " + st + " * 0.8)) - 0.5);\n"
  }
  body += "  vec3 col = thermalPal(h);\n"
  if (outline > 0.0) {
    body += EDGE_BODY
    // Outline in the opposite end of the palette from the surrounding area,
    // so edges and text stand out: cold lines on hot backgrounds and back.
    body += "  col = mix(col, heatCurve(hb) > 0.5 ? PAL0 : PAL4, edge * OUTLINE * 0.9);\n"
  }
  if (hud) {
    body += "  vec2 hpx = uv0 * res;\n"
    body += "  float osc = max(1.0, res.y / 1080.0);\n"
    body += "  vec2 hc = res * 0.5;\n"
    // Crosshair with a gap in the middle.
    body += "  vec2 dd = abs(hpx - hc);\n"
    body += "  float crossHair = step(dd.y, osc) * step(8.0 * osc, dd.x) * step(dd.x, 28.0 * osc) + step(dd.x, osc) * step(8.0 * osc, dd.y) * step(dd.y, 28.0 * osc);\n"
    body += "  col = mix(col, vec3(1.0), clamp(crossHair, 0.0, 1.0));\n"
    // Spot reading for the pixel under the crosshair, shown in degrees C.
    body += "  int tC = int(15.0 + heatCurve(heatOf(texture(tex, vec2(0.5)).rgb)) * 30.0 + 0.5);\n"
    body += "  int reading[8] = int[8](SEG_DIGITS[tC / 10], SEG_DIGITS[tC % 10], 99, 57, 0, 0, 0, 0);\n"
    body += "  float u = 12.0 * osc;\n"
    body += "  vec2 ro = hc + vec2(36.0 * osc, -2.0 * u - 12.0 * osc);\n"
    body += "  col = mix(col, vec3(0.0), segText(hpx - vec2(2.0 * osc), ro, u, reading) * 0.6);\n"
    body += "  col = mix(col, vec3(1.0), segText(hpx, ro, u, reading));\n"
    // Palette scale bar on the right edge, hot at the top.
    body += "  vec2 b0 = vec2(res.x - 64.0 * osc, res.y * 0.3);\n"
    body += "  vec2 b1 = vec2(res.x - 48.0 * osc, res.y * 0.7);\n"
    body += "  float inBar = step(b0.x, hpx.x) * step(hpx.x, b1.x) * step(b0.y, hpx.y) * step(hpx.y, b1.y);\n"
    body += "  float inFrame = step(b0.x - 2.0 * osc, hpx.x) * step(hpx.x, b1.x + 2.0 * osc) * step(b0.y - 2.0 * osc, hpx.y) * step(hpx.y, b1.y + 2.0 * osc);\n"
    body += "  col = mix(col, vec3(1.0), inFrame * (1.0 - inBar));\n"
    body += "  col = mix(col, thermalPal(1.0 - (hpx.y - b0.y) / (b1.y - b0.y)), inBar);\n"
  }
  return { consts: consts, body: body }
}

// Comic / Cel: flat posterized colour, halftone dots in the shadows, ink lines.
function comicEffect(p, timed) {
  var levels = Math.round(clamp(p.levels, 2, 8))
  var ink = clamp(p.ink, 0.0, 1.0)
  var halftone = clamp(p.halftone, 0.0, 1.0)
  var dotSize = clamp(p.dotSize, 3, 14)
  var pop = clamp(p.pop, 0.0, 1.0)
  var paper = p.paper || [1.0, 1.0, 1.0]

  var consts = ""
  consts += "const float LEVELS = " + f(levels) + ";\n"
  consts += "const float INK = " + f(ink) + ";\n"
  consts += "const float HALFTONE = " + f(halftone) + ";\n"
  consts += "const float DOT = " + f(dotSize) + ";\n"
  consts += "const float POP = " + f(pop) + ";\n"
  consts += "const vec3  PAPER = " + vec3(paper) + ";\n"
  consts += "const vec3  INKCOL = vec3(0.05, 0.04, 0.07);\n"

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  float lv = luma1(base);\n"
  body += "  vec3 popped = clamp(mix(vec3(lv), base, 1.0 + POP), 0.0, 1.0);\n"
  // Band the brightness, not each channel: per-channel rounding tints near-greys
  // (a dark terminal turns teal). A little of the original survives so dim
  // text never lands in the same band as its background.
  body += "  float ql = floor(lv * LEVELS + 0.5) / LEVELS;\n"
  body += "  vec3 col = clamp(popped * (ql / max(lv, 0.02)), 0.0, 1.0);\n"
  body += "  col = mix(col, popped, 0.18);\n"
  body += "  col *= PAPER;\n"
  if (halftone > 0.0) {
    // Dots on a 45-degree screen, growing as the picture darkens; whites stay clean.
    body += "  float osc = max(1.0, res.y / 1080.0);\n"
    body += "  vec2 hp = uv0 * res;\n"
    body += "  vec2 rp = vec2(hp.x + hp.y, hp.y - hp.x) * 0.70711;\n"
    body += "  vec2 cell = fract(rp / (DOT * osc)) - 0.5;\n"
    body += "  float dr = sqrt(clamp(1.0 - lv, 0.0, 1.0)) * 0.62;\n"
    body += "  float dotm = smoothstep(dr + 0.07, dr - 0.07, length(cell));\n"
    body += "  col *= 1.0 - HALFTONE * 0.5 * dotm * smoothstep(0.88, 0.30, lv);\n"
  }
  if (ink > 0.0) {
    body += EDGE_BODY
    // Ink goes on the darker side of an edge, so light text on a dark
    // background keeps its strokes and gains an outline instead of losing them.
    body += "  float nbl = (luma1(texture(tex, uv0 + vec2(eo.x, 0.0)).rgb) + luma1(texture(tex, uv0 - vec2(eo.x, 0.0)).rgb)\n"
    body += "            + luma1(texture(tex, uv0 + vec2(0.0, eo.y)).rgb) + luma1(texture(tex, uv0 - vec2(0.0, eo.y)).rgb)) * 0.25;\n"
    body += "  float darkSide = lv <= nbl + 0.01 ? 1.0 : 0.3;\n"
    body += "  col = mix(col, INKCOL, smoothstep(0.15, 0.50, edge) * darkSide * INK);\n"
  }
  return { consts: consts, body: body }
}

// Blueprint: drafting paper in a single ink, line art from the picture's edges, a grid.
function blueprintEffect(p, timed) {
  var lines = clamp(p.lines, 0.0, 1.0)
  var fill = clamp(p.fill, 0.0, 1.0)
  var grid = clamp(p.grid, 0.0, 1.0)
  var wear = clamp(p.wear, 0.0, 1.0)
  var scheme = p.scheme || [[0.06, 0.24, 0.52], [0.92, 0.96, 1.00]]

  var consts = ""
  consts += "const float LINES = " + f(lines) + ";\n"
  consts += "const float FILL = " + f(fill) + ";\n"
  consts += "const float GRID = " + f(grid) + ";\n"
  consts += "const float WEAR = " + f(wear) + ";\n"
  consts += "const vec3  BPAPER = " + vec3(scheme[0]) + ";\n"
  consts += "const vec3  BLINE = " + vec3(scheme[scheme.length - 1]) + ";\n"
  if (wear > 0.0) consts += NOISE_FNS

  var body = ""
  body += "  vec3 base = texture(tex, uv0).rgb;\n"
  body += "  float lv = luma1(base);\n"
  body += EDGE_BODY
  body += "  float osc = max(1.0, res.y / 1080.0);\n"
  body += "  vec2 px = uv0 * res;\n"
  body += "  vec3 col = BPAPER;\n"
  // Dark content is drawn in, faintly; edges are the linework.
  body += "  col = mix(col, BLINE, FILL * 0.45 * (1.0 - lv));\n"
  if (grid > 0.0) {
    body += "  float gs = 24.0 * osc;\n"
    body += "  vec2 gm = abs(fract(px / gs + 0.5) - 0.5) * gs;\n"
    body += "  vec2 gM = abs(fract(px / (gs * 5.0) + 0.5) - 0.5) * gs * 5.0;\n"
    body += "  float minor = 1.0 - smoothstep(0.4 * osc, 0.9 * osc, min(gm.x, gm.y));\n"
    body += "  float major = 1.0 - smoothstep(0.7 * osc, 1.3 * osc, min(gM.x, gM.y));\n"
    body += "  col = mix(col, BLINE, GRID * max(minor * 0.16, major * 0.32));\n"
  }
  if (wear > 0.0) {
    body += "  float blot = mNoise(px / (170.0 * osc)) * 0.7 + mNoise(px / (60.0 * osc)) * 0.3;\n"
    body += "  col = mix(col, col * 0.82 + BLINE * 0.06, WEAR * smoothstep(0.45, 0.9, blot));\n"
    body += "  col += WEAR * 0.05 * (mHash(floor(px / osc)) - 0.5);\n"
  }
  body += "  col = mix(col, BLINE, clamp(smoothstep(0.06, 0.40, edge) * (0.35 + LINES * 0.75), 0.0, 1.0));\n"
  return { consts: consts, body: body }
}

// Sepia Film: a 1920s print — toned monochrome, projector flicker, gate weave,
// scratches, dust and a burned, uneven vignette.
function sepiaEffect(p, timed) {
  var tone = clamp(p.tone, 0.0, 1.0)
  var flicker = clamp(p.flicker, 0.0, 1.0)
  var weave = clamp(p.weave, 0.0, 1.0)
  var burn = clamp(p.burn, 0.0, 1.0)
  var scratch = clamp(p.scratch, 0.0, 1.0)
  var dust = clamp(p.dust, 0.0, 1.0)
  var tint = p.tint || [1.07, 0.88, 0.66]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float TONE = " + f(tone) + ";\n"
  consts += "const float FLICKER = " + f(flicker) + ";\n"
  consts += "const float WEAVE = " + f(weave) + ";\n"
  consts += "const float BURN = " + f(burn) + ";\n"
  consts += "const float SCRATCH = " + f(scratch) + ";\n"
  consts += "const float DUST = " + f(dust) + ";\n"
  consts += "const vec3  STINT = " + vec3(tint) + ";\n"
  consts += NOISE_FNS

  var body = ""
  body += "  float st = " + t + ";\n"
  body += "  float osc = max(1.0, res.y / 1080.0);\n"
  body += "  vec2 suv = uv0;\n"
  if (weave > 0.0 && timed) {
    // Gate weave: the frame drifts by under two texels.
    body += "  suv += texel * WEAVE * vec2(sin(st * 7.3) * 0.9 + sin(st * 13.1) * 0.4, sin(st * 5.7) * 0.6);\n"
  }
  body += "  vec3 base = texture(tex, suv).rgb;\n"
  body += "  float lv = luma1(base);\n"
  body += "  vec3 col = mix(base, clamp(vec3(lv) * STINT, 0.0, 1.0), TONE);\n"
  if (flicker > 0.0 && timed) {
    body += "  col *= 1.0 + FLICKER * 0.14 * (mHash(vec2(floor(st * 18.0), 3.1)) - 0.5);\n"
  }
  if (burn > 0.0) {
    body += "  vec2 bc = uv0 * 2.0 - 1.0;\n"
    body += "  float bn = mNoise(uv0 * vec2(aspect, 1.0) * 3.5) * 0.7 + mNoise(uv0 * vec2(aspect, 1.0) * 9.0) * 0.3;\n"
    body += "  float bm = smoothstep(0.80, 1.45, length(bc * vec2(0.92, 1.0)) + (bn - 0.5) * 0.45);\n"
    body += "  col = mix(col, col * vec3(0.45, 0.28, 0.14), BURN * bm);\n"
    body += "  col *= 1.0 - BURN * 0.55 * bm * bm;\n"
  }
  if (scratch > 0.0) {
    // A few vertical scratches that jump every few frames.
    body += "  float sseed = floor(st * 6.0);\n"
    body += "  for (int i = 0; i < 3; i++) {\n"
    body += "    float fi = float(i);\n"
    body += "    float xs = mHash(vec2(fi * 7.7, sseed + 1.3));\n"
    body += "    float on = step(0.45, mHash(vec2(sseed * 1.7, fi + 7.0)));\n"
    body += "    float sd = abs(uv0.x - xs) * res.x;\n"
    body += "    float along = 0.6 + 0.4 * mNoise(vec2(fi * 3.0, uv0.y * 9.0 + sseed));\n"
    body += "    col = mix(col, vec3(0.95, 0.90, 0.80), SCRATCH * 0.55 * on * along * smoothstep(1.3 * osc, 0.0, sd));\n"
    body += "  }\n"
  }
  if (dust > 0.0) {
    body += "  float dseed = floor(st * 12.0);\n"
    body += "  vec2 dp = uv0 * vec2(aspect, 1.0) * 28.0;\n"
    body += "  vec2 di = floor(dp);\n"
    body += "  float dh = mHash(di + vec2(dseed * 1.7, dseed * 0.3));\n"
    body += "  float dd = length(fract(dp) - vec2(mHash(di + 3.1 + dseed), mHash(di + 5.3 + dseed)));\n"
    body += "  float speck = step(0.982, dh) * smoothstep(0.09, 0.03, dd);\n"
    body += "  col = mix(col, vec3(0.07, 0.05, 0.03), speck * DUST);\n"
  }
  return { consts: consts, body: body }
}

// Infrared: false-colour IR film (Aerochrome) — foliage turns pink and red, with
// a halation glow round the highlights, or black-and-white IR with white foliage.
function infraredEffect(p, timed) {
  var swap = clamp(p.swap, 0.0, 1.0)
  var foliage = clamp(p.foliage, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var mono = clamp(p.mono, 0.0, 1.0)
  var tint = p.tint || [1.0, 0.92, 0.95]

  var consts = ""
  consts += "const float SWAP = " + f(swap) + ";\n"
  consts += "const float FOLIAGE = " + f(foliage) + ";\n"
  consts += "const float IRGLOW = " + f(glow) + ";\n"
  consts += "const float MONO = " + f(mono) + ";\n"
  consts += "const vec3  IRTINT = " + vec3(tint) + ";\n"
  // Infrared proxy: green things (leaves) reflect IR strongly, blue barely.
  // Normalised so a neutral grey keeps its own brightness: only colour casts move.
  consts += "float irOf(vec3 c) { return clamp((c.g * (0.85 + FOLIAGE * 0.8) + dot(c, vec3(0.2126, 0.7152, 0.0722)) * 0.25 - c.b * 0.25 * FOLIAGE)\n"
  consts += "  / (1.10 + FOLIAGE * 0.55), 0.0, 1.0); }\n"

  var body = ""
  body += "  vec3 c0 = texture(tex, uv0).rgb;\n"
  body += "  float ir = irOf(c0);\n"
  // The film's layer shift: IR records as red, red as green, green as blue.
  body += "  vec3 col = mix(c0, vec3(ir, c0.r, c0.g), SWAP);\n"
  if (mono > 0.0) body += "  col = mix(col, vec3(clamp(ir * 1.1, 0.0, 1.0)) * IRTINT, MONO);\n"
  if (glow > 0.0) {
    body += "  vec2 go = texel * 2.5;\n"
    body += "  float gir = (irOf(texture(tex, uv0 + vec2(go.x, go.y)).rgb) + irOf(texture(tex, uv0 + vec2(-go.x, go.y)).rgb)\n"
    body += "            + irOf(texture(tex, uv0 + vec2(go.x, -go.y)).rgb) + irOf(texture(tex, uv0 - go).rgb)) * 0.25;\n"
    body += "  vec3 halo = mix(vec3(1.0, 0.55, 0.65), IRTINT, MONO);\n"
    body += "  col += IRGLOW * 0.55 * halo * pow(max(gir - 0.55, 0.0) * 2.2, 1.4);\n"
  }
  return { consts: consts, body: body }
}

// Golden Hour: low sun glowing in from the top edge, warm grade, soft bloom,
// a little lens flare. Entirely static.
function goldenEffect(p, timed) {
  var warmth = clamp(p.warmth, 0.0, 1.0)
  var glow = clamp(p.glow, 0.0, 1.0)
  var bloom = clamp(p.bloom, 0.0, 1.0)
  var haze = clamp(p.haze, 0.0, 1.0)
  var flare = clamp(p.flare, 0.0, 1.0)
  var sunX = clamp(p.sunX, 0.0, 1.0)
  var sky = p.sky || [1.00, 0.62, 0.28]

  var consts = ""
  consts += "const float WARMTH = " + f(warmth) + ";\n"
  consts += "const float GLOW = " + f(glow) + ";\n"
  consts += "const float BLOOM = " + f(bloom) + ";\n"
  consts += "const float HAZE = " + f(haze) + ";\n"
  consts += "const float FLARE = " + f(flare) + ";\n"
  consts += "const vec2  SUN = vec2(" + f(sunX) + ", -0.06);\n"
  consts += "const vec3  SKY = " + vec3(sky) + ";\n"

  var body = ""
  body += "  vec3 col = texture(tex, uv0).rgb;\n"
  if (bloom > 0.0) {
    body += "  vec2 bo = texel * 2.5;\n"
    body += "  vec3 bb = (texture(tex, uv0 + vec2(bo.x, 0.0)).rgb + texture(tex, uv0 - vec2(bo.x, 0.0)).rgb\n"
    body += "          + texture(tex, uv0 + vec2(0.0, bo.y)).rgb + texture(tex, uv0 - vec2(0.0, bo.y)).rgb\n"
    body += "          + texture(tex, uv0 + bo).rgb + texture(tex, uv0 - bo).rgb\n"
    body += "          + texture(tex, uv0 + vec2(bo.x, -bo.y)).rgb + texture(tex, uv0 + vec2(-bo.x, bo.y)).rgb) * 0.125;\n"
    body += "  col += BLOOM * 0.5 * mix(vec3(1.0), SKY, 0.6) * max(bb - 0.6, 0.0) * 2.5;\n"
  }
  body += "  float lv = luma1(col);\n"
  // Warm highlights, faintly violet shadows.
  body += "  col = mix(col, col * vec3(1.10, 0.97, 0.80), WARMTH);\n"
  body += "  col += WARMTH * 0.05 * vec3(0.30, 0.05, 0.28) * (1.0 - lv);\n"
  body += "  float sd = length((uv0 - SUN) * vec2(aspect, 1.0));\n"
  body += "  float sg = smoothstep(1.7, 0.0, sd);\n"
  body += "  sg *= sg;\n"
  // Screen-blend the sunlight in, so it lifts the picture rather than covering it.
  body += "  col = 1.0 - (1.0 - col) * (1.0 - SKY * GLOW * 0.8 * sg);\n"
  if (haze > 0.0) body += "  col = max(col, SKY * HAZE * (0.08 + 0.10 * sg));\n"
  if (flare > 0.0) {
    body += "  vec2 fdir = vec2(0.5, 0.5) - SUN;\n"
    body += "  float fl = 0.0;\n"
    body += "  fl += smoothstep(0.10, 0.06, length((uv0 - (SUN + fdir * 0.70)) * vec2(aspect, 1.0)));\n"
    body += "  fl += 0.6 * smoothstep(0.05, 0.02, length((uv0 - (SUN + fdir * 1.15)) * vec2(aspect, 1.0)));\n"
    body += "  fl += 0.8 * smoothstep(0.16, 0.12, length((uv0 - (SUN + fdir * 1.55)) * vec2(aspect, 1.0)));\n"
    body += "  col += FLARE * 0.07 * SKY * fl;\n"
  }
  return { consts: consts, body: body }
}

// Hologram: the desktop as a see-through projection in one colour — scan lines,
// a rolling scan band, flicker, a slight colour split and the odd tear.
function hologramEffect(p, timed) {
  var holo = clamp(p.holo, 0.0, 1.0)
  var scan = clamp(p.scan, 0.0, 1.0)
  var flicker = clamp(p.flicker, 0.0, 1.0)
  var split = clamp(p.split, 0.0, 1.0)
  var glitch = clamp(p.glitch, 0.0, 1.0)
  var tint = p.tint || [0.35, 0.90, 1.00]
  var t = timed ? "time" : "0.0"

  var consts = ""
  consts += "const float HOLO = " + f(holo) + ";\n"
  consts += "const float HSCAN = " + f(scan) + ";\n"
  consts += "const float HFLICKER = " + f(flicker) + ";\n"
  consts += "const float SPLIT = " + f(split) + ";\n"
  consts += "const float GLITCH = " + f(glitch) + ";\n"
  consts += "const vec3  HTINT = " + vec3(tint) + ";\n"
  consts += NOISE_FNS

  var body = ""
  body += "  float ht = " + t + ";\n"
  body += "  float osc = max(1.0, res.y / 1080.0);\n"
  body += "  vec2 suv = uv0;\n"
  if (glitch > 0.0 && timed) {
    // Now and then a band tears sideways by up to three texels.
    body += "  float gseed = floor(ht * 8.0);\n"
    body += "  float gband = floor(uv0.y * 24.0);\n"
    body += "  float tear = step(0.93, mHash(vec2(gband, gseed))) * GLITCH;\n"
    body += "  suv.x += tear * (mHash(vec2(gseed, gband + 1.0)) - 0.5) * 6.0 * texel.x;\n"
  }
  body += "  vec3 c0 = texture(tex, suv).rgb;\n"
  body += "  float lv = luma1(c0);\n"
  body += EDGE_BODY
  // Edges glow only where the surroundings are dark: on a light window the glow
  // would wash out dark text rather than outline it.
  body += "  float nbl = (luma1(texture(tex, uv0 + vec2(eo.x, 0.0)).rgb) + luma1(texture(tex, uv0 - vec2(eo.x, 0.0)).rgb)\n"
  body += "            + luma1(texture(tex, uv0 + vec2(0.0, eo.y)).rgb) + luma1(texture(tex, uv0 - vec2(0.0, eo.y)).rgb)) * 0.25;\n"
  body += "  vec3 hc = HTINT * (0.12 + lv * 0.95) + HTINT * edge * 0.7 * smoothstep(0.65, 0.25, nbl) + vec3(pow(lv, 4.0) * 0.25);\n"
  if (split > 0.0) {
    body += "  vec2 so = vec2(SPLIT * 2.0 * texel.x, 0.0);\n"
    body += "  float lr = luma1(texture(tex, suv + so).rgb);\n"
    body += "  float lb = luma1(texture(tex, suv - so).rgb);\n"
    body += "  hc += vec3(1.0, 0.25, 0.45) * max(lr - lv, 0.0) * SPLIT + vec3(0.25, 0.55, 1.0) * max(lb - lv, 0.0) * SPLIT;\n"
  }
  // Fine projector lines, every other pixel row.
  body += "  hc *= 1.0 - 0.16 * (0.5 + 0.5 * sin(uv0.y * res.y * 3.14159 / osc));\n"
  if (scan > 0.0) {
    body += "  float sb = fract(uv0.y * 0.8 - ht * 0.12);\n"
    body += "  hc += HTINT * HSCAN * (0.28 * smoothstep(0.035, 0.0, abs(sb - 0.5)) + 0.06 * smoothstep(0.25, 0.0, abs(sb - 0.5)));\n"
  }
  if (flicker > 0.0 && timed) {
    body += "  hc *= 1.0 - HFLICKER * (0.18 * step(0.92, mHash(vec2(floor(ht * 20.0), 1.0))) + 0.04 * sin(ht * 47.0));\n"
  }
  body += "  vec3 col = mix(c0, hc, HOLO);\n"
  return { consts: consts, body: body }
}

var EFFECTS = {
  glass: glassEffect,
  neon: neonEffect,
  gameboy: gameboyEffect,
  vhs: vhsEffect,
  fireplace: fireplaceEffect,
  computer: computerEffect,
  scanlines: scanlinesEffect,
  water: waterEffect,
  toxic: toxicEffect,
  wasteland: wastelandEffect,
  matrix: matrixEffect,
  cctv: cctvEffect,
  noir: noirEffect,
  thermal: thermalEffect,
  comic: comicEffect,
  blueprint: blueprintEffect,
  sepia: sepiaEffect,
  infrared: infraredEffect,
  golden: goldenEffect,
  hologram: hologramEffect
}

// mode: "static" | "live". Live declares `time`; static never does (see
// header note above) — callers pick mode from Presets.isLive(family, params).
function build(familyId, params, opts) {
  opts = opts || {}
  var mode = opts.mode || "static"
  var timed = mode === "live"
  var c = sanitizeCommon(params)
  var effect = (EFFECTS[familyId] || EFFECTS.glass)(params, timed)

  var s = ""
  s += "#version 300 es\n"
  s += "precision highp float;\n\n"
  s += "// Generated by Moodscreen. Edits here are overwritten on the next change.\n"
  s += "in vec2 v_texcoord;\n"
  s += "uniform sampler2D tex;\n"
  s += "uniform vec2 fullSize;\n"
  if (timed) s += "uniform float time;\n"
  s += "\nlayout(location = 0) out vec4 fragColor;\n\n"

  s += "const float BRIGHT = " + f(c.bright) + ";\n"
  s += "const float CONTRAST = " + f(c.contrast) + ";\n"
  s += "const float SAT = " + f(c.saturation) + ";\n"
  s += "const float VIGNETTE = " + f(c.vignette) + ";\n"
  if (c.noise > 0.0) s += "const float NOISEAMT = " + f(c.noise) + ";\n"
  s += "\n"
  s += effect.consts
  s += "\n"
  s += HEADER

  s += "void main() {\n"
  s += "  vec2 res = max(fullSize, vec2(1.0));\n"
  s += "  vec2 texel = 1.0 / res;\n"
  s += "  float aspect = res.x / res.y;\n"
  s += "  vec2 uv0 = v_texcoord;\n\n"

  s += effect.body
  s += "\n"

  s += "  // ---- universal picture controls, applied after the effect ----\n"
  s += "  col = mix(mLuma(col), col, SAT);\n"
  s += "  col = max((col - 0.5) * CONTRAST + 0.5, 0.0);\n"
  s += "  col *= BRIGHT;\n"
  s += "  vec2 cc = uv0 * 2.0 - 1.0;\n"
  s += "  col *= clamp(1.0 - VIGNETTE * dot(cc, cc), 0.0, 1.0);\n"
  if (c.noise > 0.0) {
    if (timed) s += "  float gr = fract(sin(dot(gl_FragCoord.xy + vec2(mod(time, 61.0) * 97.0), vec2(12.9898, 78.233))) * 43758.5453);\n"
    else s += "  float gr = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);\n"
    s += "  col *= 1.0 - NOISEAMT * (gr - 0.5);\n"
  }
  s += "\n  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n"
  s += "}\n"
  return s
}
