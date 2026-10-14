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

var EFFECTS = {
  glass: glassEffect,
  neon: neonEffect,
  gameboy: gameboyEffect,
  vhs: vhsEffect,
  fireplace: fireplaceEffect,
  computer: computerEffect,
  scanlines: scanlinesEffect,
  water: waterEffect
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
