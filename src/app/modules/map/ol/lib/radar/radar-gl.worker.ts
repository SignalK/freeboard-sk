/// <reference lib="webworker" />

import { SKRadar } from 'src/app/modules/radar/radar-api.service';
import { RadarMessage } from './RadarMessage';
import { fromString } from 'ol/color';

let Heading = 0;
const colors: Map<number, number[]> = new Map<number, number[]>();

addEventListener('message', (event) => {
  if (event.data.heading) {
    Heading = event.data.heading;
  }
  if (event.data.canvas) {
    const radarOnScreenCanvas = event.data.canvas;
    const radarCanvas = radarOnScreenCanvas; //new OffscreenCanvas(radarOnScreenCanvas.width, radarOnScreenCanvas.height)
    if (radarCanvas == null) {
      console.error('Error creating offscreencanvas radar');
      return;
    }
    const radar = event.data.radar as SKRadar;
    colors.clear();
    Object.keys(radar.legend).forEach((n) => {
      colors.set(parseInt(n), fromString(radar.legend[n].color));
    });
    const radarContext = radarOnScreenCanvas.getContext('webgl2', {
      preserveDrawingBuffer: true
    });
    if (radarContext == null) {
      console.error('Error creating Webgl2 context for radar');
      return;
    }
    const vertexBuffer = radarContext.createBuffer();
    if (vertexBuffer == null) {
      console.error('Error creating vertexbuffer');
      return;
    }
    const colorBuffer = radarContext.createBuffer();
    if (colorBuffer == null) {
      console.error('Error creating colorBuffer');
      return;
    }
    radarContext.viewport(0, 0, radarCanvas.width, radarCanvas.height);

    /*=========================Shaders========================*/

    // vertex shader source code
    var vertCode =
      'attribute vec3 coordinates;' +
      'attribute vec4 color;' +
      'varying vec4 vColor;' +
      'void main(void) {' +
      ' gl_Position = vec4(coordinates, 1.0);' +
      'vColor = color;' +
      // 'gl_PointSize = 1.0;' +
      '}';

    // Create a vertex shader object
    var vertShader = radarContext.createShader(radarContext.VERTEX_SHADER);

    // Attach vertex shader source code
    radarContext.shaderSource(vertShader, vertCode);

    // Compile the vertex shader
    radarContext.compileShader(vertShader);
    if (
      !radarContext.getShaderParameter(vertShader, radarContext.COMPILE_STATUS)
    )
      console.error(radarContext.getShaderInfoLog(vertShader));

    // fragment shader source code
    var fragCode =
      'precision mediump float;' +
      'varying vec4 vColor;' +
      'void main(void) {' +
      'gl_FragColor = vColor;' +
      '}';

    // Create fragment shader object
    var fragShader = radarContext.createShader(radarContext.FRAGMENT_SHADER);

    // Attach fragment shader source code
    radarContext.shaderSource(fragShader, fragCode);

    // Compile the fragment shader
    radarContext.compileShader(fragShader);
    if (
      !radarContext.getShaderParameter(fragShader, radarContext.COMPILE_STATUS)
    )
      console.error(radarContext.getShaderInfoLog(fragShader));

    // Create a shader program object to store
    // the combined shader program
    var shaderProgram = radarContext.createProgram();

    // Attach a vertex shader
    radarContext.attachShader(shaderProgram, vertShader);

    // Attach a fragment shader
    radarContext.attachShader(shaderProgram, fragShader);

    // Link both programs
    radarContext.linkProgram(shaderProgram);
    if (
      !radarContext.getProgramParameter(shaderProgram, radarContext.LINK_STATUS)
    )
      console.error(radarContext.getProgramInfoLog(shaderProgram));

    // Use the combined shader program object
    radarContext.useProgram(shaderProgram);

    /*======== Associating shaders to buffer objects ========*/

    // Bind vertex buffer object
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);

    // Get the attribute location
    var coordAttr = radarContext.getAttribLocation(
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

    // Enable the attribute
    radarContext.enableVertexAttribArray(coordAttr);

    // bind the color buffer
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);

    // get the attribute location
    var colorAttr = radarContext.getAttribLocation(shaderProgram, 'color');

    // point attribute to the color buffer object
    radarContext.vertexAttribPointer(
      colorAttr,
      4,
      radarContext.FLOAT,
      false,
      0,
      0
    );

    // enable the color attribute
    radarContext.enableVertexAttribArray(colorAttr);

    radarContext.clearColor(0.0, 0.0, 0.0, 0.0);

    radarContext.clear(radarContext.COLOR_BUFFER_BIT);

    //build positions

    let x: number[] = [];
    let y: number[] = [];

    const cx = 0;
    const cy = 0;
    const maxRadius = 1;
    const angleShift = (2 * Math.PI) / radar.spokes / 2;
    const radiusShift = 0.0; // (1 / radar.maxSpokeLen)/2

    for (let a = 0; a < radar.spokes; a++) {
      for (let r = 0; r < radar.maxSpokeLen; r++) {
        const angle = a * ((2 * Math.PI) / radar.spokes) + angleShift;
        const radius = r * (maxRadius / radar.maxSpokeLen);
        const x1 = cx + (radius + radiusShift) * Math.cos(angle);
        const y1 = cy + (radius + radiusShift) * Math.sin(angle);
        x[a * radar.maxSpokeLen + r] = x1;
        y[a * radar.maxSpokeLen + r] = -y1;
      }
    }

    function ToBearing(angle: number): number {
      let h = Heading - 90;
      if (h < 0) {
        h += 360;
      }
      angle += Math.round(h / (360 / radar.spokes)); // add heading
      angle = angle % radar.spokes;
      return angle;
    }

    function connect() {
      const socket = new WebSocket(radar.streamUrl);
      socket.binaryType = 'arraybuffer';

      let lastRange = 0;

      socket.onmessage = (event) => {
        let message = RadarMessage.deserialize(event.data);
        if (message.spokes.length > 0) {
          if (message.spokes[0].has_time) {
            let shift = Date.now() - message.spokes[0].time;
            /*if (shift > 800) {
              // drop old packets
              return;
            }*/
          }
        }

        const vertices = [];
        const verticeColors = [];

        for (let si = 0; si < message.spokes.length; si++) {
          let spoke = message.spokes[si];

          if (lastRange !== spoke.range) {
            radarContext.clear(radarContext.COLOR_BUFFER_BIT);
            lastRange = spoke.range;
            postMessage({ range: spoke.range });
          }

          let spokeBearing = ToBearing(spoke.angle);
          if (spoke.has_bearing) {
            spokeBearing = spoke.bearing;
          }
          let ba = spokeBearing + 1;
          if (ba > radar.spokes - 1) {
            ba = 0;
          }

          // draw current spoke

          for (let i = 0; i < spoke.data.length; i++) {
            vertices.push(x[spokeBearing * radar.maxSpokeLen + i]);
            vertices.push(y[spokeBearing * radar.maxSpokeLen + i]);
            vertices.push(0.0);
            vertices.push(x[ba * radar.maxSpokeLen + i]);
            vertices.push(y[ba * radar.maxSpokeLen + i]);
            vertices.push(0.0);
            let color = colors.get(spoke.data[i]);
            if (color) {
              verticeColors.push(color[0] / 255);
              verticeColors.push(color[1] / 255);
              verticeColors.push(color[2] / 255);
              verticeColors.push(color[3]);
              verticeColors.push(color[0] / 255);
              verticeColors.push(color[1] / 255);
              verticeColors.push(color[2] / 255);
              verticeColors.push(color[3]);
            } else {
              verticeColors.push(1.0);
              verticeColors.push(1.0);
              verticeColors.push(1.0);
              verticeColors.push(0);
              verticeColors.push(1.0);
              verticeColors.push(1.0);
              verticeColors.push(1.0);
              verticeColors.push(0);
            }
          }
        }
        // Draw buffer

        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);
        radarContext.bufferData(
          radarContext.ARRAY_BUFFER,
          new Float32Array(vertices),
          radarContext.STATIC_DRAW
        );
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);
        radarContext.bufferData(
          radarContext.ARRAY_BUFFER,
          new Float32Array(verticeColors),
          radarContext.STATIC_DRAW
        );
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, null);
        radarContext.drawArrays(radarContext.LINES, 0, vertices.length / 3);

        //radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        //radarOnScreenContext.drawImage(radarCanvas, 0, 0)
        postMessage({ redraw: true });
      };

      socket.onopen = (event) => {
        console.log(`Radar ${radar.name} connected`);
      };

      socket.onclose = (event) => {
        console.log(`Radar ${radar.name} disconnected retry in 3 seconds`);
        radarContext.clear(radarContext.COLOR_BUFFER_BIT);
        //radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);

        setTimeout(function () {
          connect();
        }, 3000);
      };

      socket.onerror = (event) => {
        radarContext.clear(radarContext.COLOR_BUFFER_BIT);
        //radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        postMessage({ redraw: true });
        console.error(`Error on radar ${radar.name} stopping`);
      };
    }
    connect();
  }
});
