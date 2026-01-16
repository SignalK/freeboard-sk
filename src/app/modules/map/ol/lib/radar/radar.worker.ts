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
    const radarOnScreenContext = radarOnScreenCanvas.getContext('2d');
    const radarCanvas = new OffscreenCanvas(
      radarOnScreenCanvas.width,
      radarOnScreenCanvas.height
    );
    const radar = event.data.radar as SKRadar;
    colors.clear();
    Object.keys(radar.legend).forEach((n) => {
      colors.set(parseInt(n), fromString(radar.legend[n].color));
    });
    const radarContext = radarCanvas.getContext('2d'); // as CanvasRenderingContext2D;

    const pixel = radarContext.createImageData(1, 1);
    const pixelData = pixel.data;
    pixelData[0] = 0;
    pixelData[1] = 0;
    pixelData[2] = 0;
    pixelData[3] = 255;

    let x: number[] = [];
    let y: number[] = [];

    const cx = radarCanvas.width / 2;
    const cy = radarCanvas.height / 2;

    for (let a = 0; a < radar.spokes; a++) {
      for (let r = 0; r < radar.maxSpokeLen; r++) {
        const angle = a * ((2 * Math.PI) / radar.spokes);
        const radius = r * (radarCanvas.width / 2 / radar.maxSpokeLen);
        const x1 = Math.round(cx + radius * Math.cos(angle));
        const y1 = Math.round(cy + radius * Math.sin(angle));
        x[a * radar.maxSpokeLen + r] = x1;
        y[a * radar.maxSpokeLen + r] = y1;
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
            if (shift > 800) {
              // drop old packets
              return;
            }
          }
        }
        let clearangle1 = ToBearing(message.spokes[0].angle % radar.spokes);
        let clearangle2 = ToBearing(
          message.spokes[message.spokes.length - 1].angle % radar.spokes
        );
        radarContext.save();
        radarContext.beginPath();
        radarContext.strokeStyle = '#00000000';
        radarContext.moveTo(x[0], y[0]);
        radarContext.lineTo(
          x[clearangle1 * radar.maxSpokeLen + radar.maxSpokeLen - 1],
          y[clearangle1 * radar.maxSpokeLen + radar.maxSpokeLen - 1]
        );
        radarContext.lineTo(
          x[clearangle2 * radar.maxSpokeLen + radar.maxSpokeLen - 1],
          y[clearangle2 * radar.maxSpokeLen + radar.maxSpokeLen - 1]
        );
        radarContext.closePath();
        radarContext.stroke();
        radarContext.clip();
        radarContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        radarContext.restore();
        let spokeImageData = radarContext.getImageData(
          0,
          0,
          radarCanvas.width,
          radarCanvas.height
        );
        for (let si = 0; si < message.spokes.length; si++) {
          let spoke = message.spokes[si];

          if (lastRange != spoke.range) {
            radarContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
            spokeImageData = radarContext.getImageData(
              0,
              0,
              radarCanvas.width,
              radarCanvas.height
            );
            lastRange = spoke.range;
            postMessage({ range: spoke.range });
          }

          let spokeBearing = ToBearing(spoke.angle);
          if (spoke.has_bearing) {
            spokeBearing = spoke.bearing;
          }

          // 2D context based draw implementation maybe to webgl context

          // draw current spoke

          for (let i = 0; i < spoke.data.length; i++) {
            let x1 = x[spokeBearing * radar.maxSpokeLen + i];
            let y1 = y[spokeBearing * radar.maxSpokeLen + i];
            let index = y1 * spokeImageData.width + x1;
            index = index * 4;
            let color = colors.get(spoke.data[i]);
            if (color) {
              spokeImageData.data[index] = color[0];
              spokeImageData.data[index + 1] = color[1];
              spokeImageData.data[index + 2] = color[2];
              spokeImageData.data[index + 3] = color[3] * 255;
            } else {
              spokeImageData.data[index + 3] = 0;
            }
          }
        }
        radarContext.putImageData(spokeImageData, 0, 0);
        radarOnScreenContext.clearRect(
          0,
          0,
          radarCanvas.width,
          radarCanvas.height
        );
        radarOnScreenContext.drawImage(radarCanvas, 0, 0);
        postMessage({ redraw: true });
      };

      socket.onopen = (event) => {
        console.log(`Radar ${radar.name} connected`);
      };

      socket.onclose = (event) => {
        console.log(`Radar ${radar.name} disconnected retry in 3 seconds`);
        radarContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        radarOnScreenContext.clearRect(
          0,
          0,
          radarCanvas.width,
          radarCanvas.height
        );

        setTimeout(function () {
          connect();
        }, 3000);
      };

      socket.onerror = (event) => {
        radarContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        radarOnScreenContext.clearRect(
          0,
          0,
          radarCanvas.width,
          radarCanvas.height
        );
        postMessage({ redraw: true });
        console.error(`Error on radar ${radar.name} stopping`);
      };
    }
    connect();
  }
});
