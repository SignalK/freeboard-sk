/** GLSL for the LiveDepth bathymetric surface.
 *
 * A full-screen quad covering the current viewport samples the depth field
 * (`uDepth`, an R32F texture, -1 = no coverage) through a view transform
 * (`uView`, `uField`, both in EPSG:3857 metres), shades discrete depth bands up
 * to `uShadeLimit` using a colour ramp (`uLut`), and draws an isobar wherever
 * the depth crosses a multiple of `uInterval`. Deeper than the shade limit (or
 * uncovered) is transparent, so the chart shows through; isobars are still
 * drawn over unshaded data.
 *
 * The field is built once per data fetch and sampled here, so the surface — and
 * therefore the absolute-depth isobars — does not change as the view is panned
 * or zoomed. The depth is interpolated by hand (bilinear) rather than relying
 * on a LINEAR filter: a float texture is only filterable with
 * OES_texture_float_linear, which many GPUs (e.g. Firefox on some hardware) do
 * not expose, and an unfilterable LINEAR texture is incomplete and samples as
 * nothing.
 */

export const DEPTH_VERT_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const DEPTH_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDepth;
uniform sampler2D uLut;
uniform vec2 uTexel;        // 1 / field size in texels
uniform vec4 uView;         // viewport: origin.xy, size.xy (metres)
uniform vec4 uField;        // field:    origin.xy, size.xy (metres)
uniform float uShadeLimit;
uniform int uLevels;
uniform float uInterval;
uniform float uLineWidth;
bool uncov(float v) { return v < 0.0; } // -1: no coverage
float sampleDepth(vec2 uv) {
  vec2 fc = uv / uTexel - 0.5;
  vec2 f = fract(fc);
  vec2 b = (floor(fc) + 0.5) * uTexel;
  float d00 = texture(uDepth, b).r;
  float d10 = texture(uDepth, b + vec2(uTexel.x, 0.0)).r;
  float d01 = texture(uDepth, b + vec2(0.0, uTexel.y)).r;
  float d11 = texture(uDepth, b + uTexel).r;
  if (uncov(d00) || uncov(d10) || uncov(d01) || uncov(d11)) {
    return texture(uDepth, uv).r; // near an edge/gap: no interpolation
  }
  return mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y);
}
void main() {
  // viewport pixel -> world metres -> field uv
  vec2 world = uView.xy + vUv * uView.zw;
  vec2 fuv = (world - uField.xy) / uField.zw;
  if (fuv.x < 0.0 || fuv.x > 1.0 || fuv.y < 0.0 || fuv.y > 1.0) { discard; }
  float d = sampleDepth(fuv);
  if (uncov(d)) { discard; }
  // Shading bands, only up to the shade limit; deeper water is left to the chart.
  bool shaded = d < uShadeLimit;
  vec3 fill = vec3(0.0);
  if (shaded) {
    float bandF = d / uShadeLimit * float(uLevels);
    float band = floor(bandF);
    float tCenter = (band + 0.5) / float(uLevels);
    fill = texture(uLut, vec2(clamp(tCenter, 0.0, 1.0), 0.5)).rgb;
  }
  // Isobars at every absolute multiple of the interval, over ALL data.
  float ci = d / uInterval;
  float dv = min(fract(ci), 1.0 - fract(ci));
  float px = dv / max(fwidth(ci), 1e-6);
  float line = 1.0 - smoothstep(uLineWidth, uLineWidth + 1.5, px);
  vec3 col = mix(fill, vec3(0.0), line);
  float alpha = max(line, shaded ? 1.0 : 0.0);
  fragColor = vec4(col, alpha);
}`;
