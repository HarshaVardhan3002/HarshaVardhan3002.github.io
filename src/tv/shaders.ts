import { CURVE } from "./warp";

export const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** The signal: the moving gradient, dimmed behind a project page. */
export const bgFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uDim;
  void main() {
    gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uDim, 1.0);
  }
`;

/** The painted picture (text, media) on top of the glass. */
export const contentFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  void main() {
    gl_FragColor = texture2D(uTex, vUv);
  }
`;

// Liquid glass after dashersw/liquid-glass-js (MIT): a rounded-rectangle
// distance field bends the live gradient most at the rim, with a blur, a tint,
// a split of colour at the rim, a specular edge and a soft shadow.
export const glassFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uView;
  uniform vec2 uSize;
  uniform vec2 uCenter;
  uniform float uMargin;
  uniform float uRadius;
  uniform float uBend;
  uniform float uFrost;
  uniform vec3 uTint;
  uniform float uTintAmt;
  uniform float uAlpha;
  uniform float uDim;

  float sdRound(vec2 p, vec2 b, float r) {
    r = min(r, min(b.x, b.y));
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec3 sampleAt(vec2 px) {
    return texture2D(uTex, clamp(px / uView, 0.001, 0.999)).rgb * uDim;
  }

  void main() {
    vec2 full = uSize + 2.0 * uMargin;
    vec2 p = (vUv - 0.5) * full;
    vec2 half_ = uSize * 0.5;
    float d = sdRound(p, half_, uRadius);

    if (d > 0.0) {
      float ds = sdRound(p - vec2(0.0, -10.0), half_, uRadius);
      float a = (1.0 - smoothstep(-8.0, uMargin, ds)) * 0.2;
      a *= smoothstep(0.0, 1.5, d);
      gl_FragColor = vec4(0.0, 0.0, 0.02, a * uAlpha);
      return;
    }

    vec2 e = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(
      sdRound(p + e.xy, half_, uRadius) - sdRound(p - e.xy, half_, uRadius),
      sdRound(p + e.yx, half_, uRadius) - sdRound(p - e.yx, half_, uRadius)
    ) + 1e-5);

    float bevel = min(26.0, min(uSize.x, uSize.y) * 0.35);
    float t = clamp(-d / bevel, 0.0, 1.0);
    float lens = pow(1.0 - t, 2.2);
    vec2 offset = -n * lens * uBend;
    vec2 px = uCenter + p + offset;

    vec3 col = vec3(0.0);
    float split = 1.0 + lens * 0.9;
    const int TAPS = 12;
    for (int i = 0; i < TAPS; i++) {
      float a = float(i) * 2.39996;
      float r = sqrt((float(i) + 0.5) / float(TAPS)) * uFrost;
      vec2 o = vec2(cos(a), sin(a)) * r;
      col.r += sampleAt(px + o + offset * (split - 1.0) * 0.6).r;
      col.g += sampleAt(px + o).g;
      col.b += sampleAt(px + o - offset * (split - 1.0) * 0.6).b;
    }
    col /= float(TAPS);

    col = mix(col, uTint, uTintAmt);
    col = col * 1.03 + 0.015;

    vec2 L = normalize(vec2(-0.55, 0.85));
    float rim = pow(1.0 - t, 6.0);
    float spec = pow(max(dot(n, L), 0.0), 2.0) * rim;
    float bounce = pow(max(dot(n, -L), 0.0), 2.0) * rim;
    col += spec * 0.5 + bounce * 0.16;
    col += (1.0 - smoothstep(0.0, 1.6, -d)) * 0.2;

    float alpha = 1.0 - smoothstep(-1.0, 0.0, d);
    gl_FragColor = vec4(col, alpha * uAlpha);
  }
`;

/**
 * The tube. Curves the whole frame, then adds scanlines, an aperture grille,
 * phosphor glow, analogue noise, static and vertical roll for channel changes,
 * the power-on line, a glass sheen and the plastic bezel round the edge.
 */
export const crtFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform float uDpr;
  uniform float uTime;
  uniform float uCurve;
  uniform float uPower;
  uniform float uStatic;
  uniform float uRoll;
  uniform float uSplit;
  uniform float uFlash;
  uniform float uMotion;

  #define KX ${CURVE.kx.toFixed(4)}
  #define KY ${CURVE.ky.toFixed(4)}
  #define INSET ${CURVE.inset.toFixed(4)}

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  float sdBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec2 warp(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    p *= vec2(1.0 + p.y * p.y * KX * uCurve, 1.0 + p.x * p.x * KY * uCurve);
    p *= 1.0 + INSET * uCurve;
    return p * 0.5 + 0.5;
  }

  vec3 pic(vec2 uv) {
    return texture2D(uTex, uv).rgb;
  }

  // A thin line of interference drifting down the tube.
  float band(float y, float speed, float off, float w) {
    float d = abs(fract(y + uTime * speed + off) - 0.5);
    return 1.0 - smoothstep(0.0, w, d);
  }

  void main() {
    vec2 uv = warp(vUv);

    // Power-on: the picture grows out of a bright horizontal line.
    float py = clamp(uPower * 1.7, 0.004, 1.0);
    float px = clamp(uPower * 5.0, 0.0, 1.0);
    vec2 pv = vec2(0.5 + (uv.x - 0.5) / max(px, 0.001), 0.5 + (uv.y - 0.5) / py);

    // Vertical roll with a black blanking bar at the seam.
    float ry = pv.y + uRoll;
    float rolling = step(0.0005, abs(fract(uRoll + 0.5) - 0.5));
    float bar = rolling * (1.0 - step(0.045, fract(ry)));
    vec2 s = vec2(pv.x, mix(pv.y, fract(ry), rolling));

    // Line tearing while the tuner hunts for the signal.
    float row = floor(s.y * uRes.y / (3.0 * uDpr));
    s.x += (hash(vec2(row, floor(uTime * 40.0))) - 0.5) * 0.035 * uStatic * uMotion;

    // Weak-signal interference on a clean picture: a slow line always drifting,
    // a second pair now and then, a fast streak in some moments.
    float amb = uCurve * uMotion;
    float slot = floor(uTime * 0.25);
    float iA = band(uv.y, 0.055, 0.0, 0.014);
    float iB = (band(uv.y, 0.12, 0.41, 0.006) + band(uv.y, 0.12, 0.445, 0.004)) * step(0.35, hash(vec2(slot, 1.7)));
    float iC = band(uv.y, 0.42, 0.73, 0.009) * step(0.6, hash(vec2(slot, 5.3)));
    float ib = clamp(iA * 0.8 + iB * 0.7 + iC, 0.0, 1.0) * amb;
    s.x += (hash(vec2(row, floor(uTime * 24.0))) - 0.5) * 0.007 * ib;

    // Colour fringe: a little at the edges, more while switching.
    vec2 c = s - 0.5;
    vec2 fr = c * 0.0018 * uCurve + vec2(uSplit, 0.0);
    vec3 col = vec3(pic(s + fr).r, pic(s).g, pic(s - fr).b);

    // Phosphor glow around bright parts.
    vec2 o = vec2(2.5 * uDpr) / uRes;
    vec2 o2 = o * 2.6;
    vec3 g = pic(s + vec2(o.x, 0.0)) + pic(s - vec2(o.x, 0.0)) + pic(s + vec2(0.0, o.y)) + pic(s - vec2(0.0, o.y));
    g += pic(s + o2) + pic(s - o2) + pic(s + vec2(o2.x, -o2.y)) + pic(s + vec2(-o2.x, o2.y));
    g /= 8.0;
    col += max(g - 0.3, 0.0) * 0.32 * (0.35 + 0.65 * uCurve);

    float inPic = step(0.0, pv.x) * step(pv.x, 1.0) * step(0.0, pv.y) * step(pv.y, 1.0);
    col *= inPic * (1.0 - bar);

    // Scanlines that follow the curve of the tube, and an aperture grille.
    float lines = uv.y * uRes.y / (3.0 * uDpr);
    float scan = 0.5 - 0.5 * cos(lines * 6.2831853);
    col *= 1.0 - 0.22 * uCurve * scan;
    float m = mod(gl_FragCoord.x, 3.0);
    vec3 grille = vec3(m < 1.0 ? 1.0 : 0.92, (m >= 1.0 && m < 2.0) ? 1.0 : 0.92, m >= 2.0 ? 1.0 : 0.92);
    col *= mix(vec3(1.0), grille, uCurve);
    col *= 1.0 + 0.13 * uCurve;

    // Static between channels, and faint noise on a clean picture.
    float n = hash(floor(gl_FragCoord.xy / (1.5 * uDpr)) + fract(uTime * 13.0) * 97.0);
    col = mix(col, vec3(n * 0.95), clamp(uStatic, 0.0, 1.0));
    col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.06 * amb;

    // The interference lines themselves: broken dashes of snow.
    float rowN = floor(gl_FragCoord.y / (2.0 * uDpr));
    float dash = hash(vec2(floor(gl_FragCoord.x / (14.0 * uDpr)) + rowN * 7.0, floor(uTime * 30.0)));
    float sn = hash(gl_FragCoord.xy * 0.37 + fract(uTime * 7.0) * 53.0);
    col += ib * (0.04 + 0.2 * step(0.55, dash) * sn);
    col = mix(col, vec3(sn), ib * 0.14);

    // Hum bars: a bright one drifting up, a dark one drifting slower.
    float hb = fract(uv.y * 0.55 - uTime * 0.06);
    col *= 1.0 + 0.07 * amb * smoothstep(0.0, 0.1, hb) * (1.0 - smoothstep(0.1, 0.28, hb));
    float hd = fract(uv.y * 0.35 - uTime * 0.025 + 0.5);
    col *= 1.0 - 0.06 * amb * smoothstep(0.0, 0.15, hd) * (1.0 - smoothstep(0.15, 0.4, hd));
    // A faint flicker, like mains hum.
    col *= 1.0 + 0.012 * amb * sin(uTime * 113.0);

    col += uFlash;

    // Edge of the tube: rounded corners, inner shadow, vignette.
    vec2 q = (uv - 0.5) * uRes;
    float edge = sdBox(q, uRes * 0.5, 34.0 * uDpr);
    float vig = smoothstep(1.4, 0.2, length((uv - 0.5) * vec2(1.55, 1.75)));
    col *= mix(1.0, mix(0.66, 1.0, vig), uCurve);
    col *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 30.0 * uDpr, -edge)), uCurve);

    // Glass sheen from a lamp at the top left.
    col += smoothstep(0.6, 0.0, length((vUv - vec2(0.18, 0.88)) * vec2(1.0, 2.3))) * 0.05 * uCurve;

    // Power-on glare line.
    float line = (1.0 - smoothstep(0.0, 0.006 / py, abs(uv.y - 0.5)));
    line *= (1.0 - smoothstep(0.35, 0.6, uPower)) * step(abs(uv.x - 0.5), 0.5 * px + 0.01) * step(0.001, uPower);
    col += vec3(0.9, 0.95, 1.0) * line;

    // The plastic bezel, lit faintly by the picture.
    float out_ = max(edge, 0.0) / uDpr;
    vec3 bezel = vec3(0.045, 0.044, 0.047) + vec3(0.025) * vUv.y;
    bezel += pic(clamp(uv, 0.004, 0.996)) * 0.2 * exp(-out_ / 12.0) * uPower;
    bezel += 0.05 * (1.0 - smoothstep(1.0, 3.0, out_)) * step(0.5, out_);
    float inside = 1.0 - smoothstep(-1.0 * uDpr, 0.5 * uDpr, edge);
    gl_FragColor = vec4(mix(bezel, col, inside), 1.0);
  }
`;
