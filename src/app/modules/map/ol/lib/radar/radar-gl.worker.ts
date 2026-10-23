/// <reference lib="webworker" />

import { RadarRenderDef } from './radar-render.service';
import { RadarMessage } from './RadarMessage';
import { RadarPolarBuffer } from './radar-polar-buffer';
import { fromString } from 'ol/color';

let vHeading = 0;
// Spokes arrive hundreds of times a second; the picture is redrawn at most
// this often, which is also how often the map takes a new frame.
const FRAME_INTERVAL_MS = 33;

// Each pixel looks up its bearing and distance in the polar texture, so
// every pixel inside the range circle is drawn whatever the spacing of the
// spokes.
const vertCode = `#version 300 es
  in vec2 a_position;
  out vec2 v_position;
  void main() {
    v_position = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragCode = `#version 300 es
  precision highp float;
  precision highp int;
  precision highp usampler2D;
  in vec2 v_position;
  uniform usampler2D u_polar;
  uniform sampler2D u_colors;
  uniform int u_colorCount;
  out vec4 color;
  const float TWO_PI = 6.28318530718;
  void main() {
    float r = length(v_position);
    if (r >= 1.0) {
      discard;
    }
    float bearing = atan(v_position.x, v_position.y);
    if (bearing < 0.0) {
      bearing += TWO_PI;
    }
    ivec2 size = textureSize(u_polar, 0);
    int row = min(int(bearing / TWO_PI * float(size.y)), size.y - 1);
    int bin = min(int(r * float(size.x)), size.x - 1);
    int index = int(texelFetch(u_polar, ivec2(bin, row), 0).r);
    if (index >= u_colorCount) {
      discard;
    }
    vec4 c = texelFetch(u_colors, ivec2(index, 0), 0);
    color = vec4(c.rgb * c.a, c.a);
  }
`;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

addEventListener('message', (event) => {
  if (event.data.heading !== undefined) {
    vHeading = event.data.heading;
  }
  if (event.data.canvas) {
    const radarCanvas = event.data.canvas as OffscreenCanvas;
    const radar = event.data.radar as RadarRenderDef;

    const context = radarCanvas.getContext('webgl2', {
      preserveDrawingBuffer: true
    });
    if (context === null) {
      console.error('Error creating Webgl2 context for radar');
      return;
    }
    const gl: WebGL2RenderingContext = context;
    const vertShader = compile(gl, gl.VERTEX_SHADER, vertCode);
    const fragShader = compile(gl, gl.FRAGMENT_SHADER, fragCode);
    const program = gl.createProgram();
    if (vertShader === null || fragShader === null || program === null) {
      console.error('Error creating the radar shaders');
      return;
    }
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    gl.viewport(0, 0, radarCanvas.width, radarCanvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // One quad over the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const positionAttr = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);

    // Spoke samples are legend indices, so the texture holds them as
    // integers and the colour comes from a lookup texture.
    const colorCount = Math.max(...Object.keys(radar.legend).map(Number)) + 1;
    const colors = new Uint8Array(colorCount * 4);
    Object.keys(radar.legend).forEach((n) => {
      const idx = parseInt(n);
      const c = fromString(radar.legend[n].color);
      colors[idx * 4 + 0] = c[0];
      colors[idx * 4 + 1] = c[1];
      colors[idx * 4 + 2] = c[2];
      colors[idx * 4 + 3] = Math.round(c[3] * 255);
    });
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      colorCount,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      colors
    );
    gl.uniform1i(gl.getUniformLocation(program, 'u_colors'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'u_colorCount'), colorCount);

    const polar = new RadarPolarBuffer(
      radar.spokesPerRevolution,
      radar.maxSpokeLen,
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      radar.hasSparseSpokes
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8UI,
      polar.samples,
      polar.rows,
      0,
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      polar.data
    );
    gl.uniform1i(gl.getUniformLocation(program, 'u_polar'), 0);

    let frameScheduled = false;
    function drawFrame() {
      frameScheduled = false;
      for (const [first, end] of polar.takeDirtyRows()) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          first,
          polar.samples,
          end - first,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          polar.data.subarray(first * polar.samples, end * polar.samples)
        );
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      postMessage({ redraw: true });
    }
    function scheduleFrame() {
      if (!frameScheduled) {
        frameScheduled = true;
        setTimeout(drawFrame, FRAME_INTERVAL_MS);
      }
    }

    // The spoke angle counts from the bow; the picture is north up.
    function toBearing(angle: number): number {
      const headingSpokes = Math.round(
        vHeading / (360 / radar.spokesPerRevolution)
      );
      return (angle + headingSpokes) % radar.spokesPerRevolution;
    }

    // The stream opens every time the radar starts transmitting, so only a
    // reconnect after a lost connection is worth telling the user about.
    let connectionLost = false;

    function connect() {
      let lastRange = 0;

      const socket = new WebSocket(radar.streamUrl);
      socket.binaryType = 'arraybuffer';

      socket.onmessage = (event) => {
        const message = RadarMessage.deserialize(event.data);
        for (const spoke of message.spokes) {
          if (lastRange !== spoke.range) {
            polar.clear();
            lastRange = spoke.range;
            postMessage({ range: spoke.range });
          }
          polar.write(toBearing(spoke.angle), spoke.data);
        }
        scheduleFrame();
      };

      socket.onopen = () => {
        if (connectionLost) {
          connectionLost = false;
          postMessage({ msg: `Radar ${radar.name} connected` });
        }
      };

      socket.onclose = () => {
        connectionLost = true;
        postMessage({
          msg: `Radar ${radar.name} disconnected retry in 3 seconds`
        });
        polar.clear();
        scheduleFrame();
        setTimeout(function () {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        polar.clear();
        scheduleFrame();
        postMessage({
          msg: `Error on radar ${radar.name} stopping`
        });
      };
    }

    connect();
  }
});
