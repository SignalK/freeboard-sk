/// <reference lib="webworker" />

import { RadarRenderDef } from './radar-render.service';
import { RadarMessage } from './RadarMessage';
import { fromString } from 'ol/color';

let vHeading = 0;
const spokePointSize = 2.0;

addEventListener('message', (event) => {
  if (event.data.heading !== undefined) {
    vHeading = event.data.heading;
  }
  if (event.data.canvas) {
    const radarOnScreenCanvas = event.data.canvas;
    const radarCanvas = radarOnScreenCanvas;
    if (radarCanvas === null) {
      console.error('Error creating offscreencanvas radar');
      return;
    }
    const radar = event.data.radar as RadarRenderDef;

    const maxColorIndex =
      Math.max(...Object.keys(radar.legend).map(Number)) + 1;
    const colorLookup = new Float32Array(maxColorIndex * 4);
    Object.keys(radar.legend).forEach((n) => {
      const idx = parseInt(n);
      const c = fromString(radar.legend[n].color);
      colorLookup[idx * 4 + 0] = c[0] / 255;
      colorLookup[idx * 4 + 1] = c[1] / 255;
      colorLookup[idx * 4 + 2] = c[2] / 255;
      colorLookup[idx * 4 + 3] = c[3];
    });

    const radarContext = radarOnScreenCanvas.getContext('webgl2', {
      preserveDrawingBuffer: true
    });
    if (radarContext === null) {
      console.error('Error creating Webgl2 context for radar');
      return;
    }
    const vertexBuffer = radarContext.createBuffer();
    if (vertexBuffer === null) {
      console.error('Error creating vertexbuffer');
      return;
    }
    const colorBuffer = radarContext.createBuffer();
    if (colorBuffer === null) {
      console.error('Error creating colorBuffer');
      return;
    }

    radarContext.viewport(0, 0, radarCanvas.width, radarCanvas.height);

    /*=========================Shaders========================*/

    // vertex shader source code
    const vertCode = `
      attribute vec3 coordinates;
      attribute vec4 color;
      varying vec4 vColor;
      uniform float u_BasePointSize;
      void main(void) {
        gl_Position = vec4(coordinates, 1.0);
        vColor = color;
        gl_PointSize = u_BasePointSize;
      }
    `;

    // Create a vertex shader object
    const vertShader = radarContext.createShader(radarContext.VERTEX_SHADER);

    // Attach vertex shader source code
    radarContext.shaderSource(vertShader, vertCode);

    // Compile the vertex shader
    radarContext.compileShader(vertShader);
    if (
      !radarContext.getShaderParameter(vertShader, radarContext.COMPILE_STATUS)
    ) {
      console.error(radarContext.getShaderInfoLog(vertShader));
    }
    // fragment shader source code
    const fragCode = `
      precision mediump float;
      varying vec4 vColor;
      void main(void) {
        gl_FragColor = vColor;
      }
    `;

    // Create fragment shader object
    const fragShader = radarContext.createShader(radarContext.FRAGMENT_SHADER);

    // Attach fragment shader source code
    radarContext.shaderSource(fragShader, fragCode);

    // Compile the fragment shader
    radarContext.compileShader(fragShader);
    if (
      !radarContext.getShaderParameter(fragShader, radarContext.COMPILE_STATUS)
    ) {
      console.error(radarContext.getShaderInfoLog(fragShader));
    }

    // Create a shader program object to store
    // the combined shader program
    const shaderProgram = radarContext.createProgram();

    // Attach and link vertex & fragment shaders
    radarContext.attachShader(shaderProgram, vertShader);
    radarContext.attachShader(shaderProgram, fragShader);
    radarContext.linkProgram(shaderProgram);
    if (
      !radarContext.getProgramParameter(shaderProgram, radarContext.LINK_STATUS)
    ) {
      console.error(radarContext.getProgramInfoLog(shaderProgram));
    }

    // Use the combined shader program object
    radarContext.useProgram(shaderProgram);
    // Set point size
    const u_BasePointSize = radarContext.getUniformLocation(
      shaderProgram,
      'u_BasePointSize'
    );
    radarContext.uniform1f(u_BasePointSize, spokePointSize);

    /*======== Associating shaders to buffer objects ========*/

    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);
    const coordAttr = radarContext.getAttribLocation(
      shaderProgram,
      'coordinates'
    );
    // Point an attribute to the currently bound VBO
    radarContext.vertexAttribPointer(
      coordAttr,
      3,
      radarContext.FLOAT,
      false,
      0,
      0
    );
    radarContext.enableVertexAttribArray(coordAttr);

    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);
    const colorAttr = radarContext.getAttribLocation(shaderProgram, 'color');
    // point attribute to the color buffer object
    radarContext.vertexAttribPointer(
      colorAttr,
      4,
      radarContext.FLOAT,
      false,
      0,
      0
    );
    radarContext.enableVertexAttribArray(colorAttr);
    radarContext.clearColor(0.0, 0.0, 0.0, 0.0);
    radarContext.clear(radarContext.COLOR_BUFFER_BIT);

    const maxVertices = radar.spokesPerRevolution * radar.maxSpokeLen;
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);
    radarContext.bufferData(
      radarContext.ARRAY_BUFFER,
      maxVertices * 3 * Float32Array.BYTES_PER_ELEMENT,
      radarContext.DYNAMIC_DRAW
    );
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);
    radarContext.bufferData(
      radarContext.ARRAY_BUFFER,
      maxVertices * 4 * Float32Array.BYTES_PER_ELEMENT,
      radarContext.DYNAMIC_DRAW
    );
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, null);

    /*======== Build positions ========*/
    const x = new Float32Array(radar.spokesPerRevolution * radar.maxSpokeLen);
    const y = new Float32Array(radar.spokesPerRevolution * radar.maxSpokeLen);
    const cx = 0;
    const cy = 0;
    const maxRadius = 1;
    const angleShift = (2 * Math.PI) / radar.spokesPerRevolution / 2;
    const radiusShift = 0.0; // (1 / radar.maxSpokeLen)/2

    for (let a = 0; a < radar.spokesPerRevolution; a++) {
      for (let r = 0; r < radar.maxSpokeLen; r++) {
        const angle =
          a * ((2 * Math.PI) / radar.spokesPerRevolution) + angleShift;
        const radius = r * (maxRadius / radar.maxSpokeLen);
        const x1 = cx + (radius + radiusShift) * Math.cos(angle);
        const y1 = cy + (radius + radiusShift) * Math.sin(angle);
        x[a * radar.maxSpokeLen + r] = x1;
        y[a * radar.maxSpokeLen + r] = -y1;
      }
    }

    function toBearing(angle: number): number {
      let h = vHeading - 90;
      if (h < 0) {
        h += 360;
      }
      angle += Math.round(h / (360 / radar.spokesPerRevolution));
      angle = angle % radar.spokesPerRevolution;
      return angle;
    }

    const vertices = new Float32Array(maxVertices * 3);
    const verticeColors = new Float32Array(maxVertices * 4);

    function connect() {
      let lastRange = 0;

      const socket = new WebSocket(radar.streamUrl);
      socket.binaryType = 'arraybuffer';

      socket.onmessage = (event) => {
        let message = RadarMessage.deserialize(event.data);
        let vertexCount = 0;
        let colorCount = 0;

        for (let si = 0; si < message.spokes.length; si++) {
          let spoke = message.spokes[si];

          if (lastRange !== spoke.range) {
            radarContext.clear(radarContext.COLOR_BUFFER_BIT);
            lastRange = spoke.range;
            postMessage({ range: spoke.range });
          }

          // Convert angle value to bearing & draw current spoke
          const spokeBearing = toBearing(spoke.angle);
          const spokeOffset = spokeBearing * radar.maxSpokeLen;

          for (let i = 0; i < spoke.data.length; i++) {
            vertices[vertexCount++] = x[spokeOffset + i];
            vertices[vertexCount++] = y[spokeOffset + i];
            vertices[vertexCount++] = 0.0;
            const ci = spoke.data[i] * 4;
            if (ci < colorLookup.length) {
              verticeColors[colorCount++] = colorLookup[ci];
              verticeColors[colorCount++] = colorLookup[ci + 1];
              verticeColors[colorCount++] = colorLookup[ci + 2];
              verticeColors[colorCount++] = colorLookup[ci + 3];
            } else {
              verticeColors[colorCount++] = 1.0;
              verticeColors[colorCount++] = 1.0;
              verticeColors[colorCount++] = 1.0;
              verticeColors[colorCount++] = 0;
            }
          }
        }

        // Draw buffer
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);
        radarContext.bufferSubData(
          radarContext.ARRAY_BUFFER,
          0,
          vertices.subarray(0, vertexCount)
        );
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);
        radarContext.bufferSubData(
          radarContext.ARRAY_BUFFER,
          0,
          verticeColors.subarray(0, colorCount)
        );
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, null);
        radarContext.drawArrays(radarContext.POINTS, 0, vertexCount / 3);
        postMessage({ redraw: true });
      };

      socket.onopen = (event) => {
        postMessage({ msg: `Radar ${radar.name} connected` });
      };

      socket.onclose = (event) => {
        postMessage({
          msg: `Radar ${radar.name} disconnected retry in 3 seconds`
        });
        radarContext.clear(radarContext.COLOR_BUFFER_BIT);
        setTimeout(function () {
          connect();
        }, 3000);
      };

      socket.onerror = (event) => {
        radarContext.clear(radarContext.COLOR_BUFFER_BIT);
        postMessage({
          redraw: true,
          msg: `Error on radar ${radar.name} stopping`
        });
      };
    }

    connect();
  }
});
