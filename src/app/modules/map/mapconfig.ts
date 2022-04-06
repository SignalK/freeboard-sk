// ** Freeboard Map configuration **

import { Style, Icon, Text, Stroke, Fill, RegularShape } from 'ol/style';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';
import { Units as ScaleLineUnits } from 'ol/control/ScaleLine';

export const mapInteractions = [
  { name: 'dragpan' },
  { name: 'dragzoom' },
  { name: 'keyboardpan' },
  { name: 'keyboardzoom' },
  { name: 'mousewheelzoom' },
  { name: 'pinchzoom' }
];

export const mapControls = [
  //{name: 'fullscreen'},
  //{name: 'rotate'},
  {
    name: 'scaleline',
    options: {
      className: 'ol-scale-line',
      bar: true,
      steps: 2,
      text: false,
      minWidth: 64,
      units: ScaleLineUnits.NAUTICAL
    }
  }
  //{name: 'zoom'},
  //{name: 'zoomslider'},
  //{name: 'zoomtoextent'},
  //{name: 'attribution'},
];

export const vesselStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/ship_red.png',
      anchor: [9.5, 22.5],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS,
      size: [50, 50],
      scale: 0.75,
      rotateWithView: true
    })
  }),
  inactive: new Style({
    image: new Icon({
      src: './assets/img/ship_blur.png',
      anchor: [9.5, 22.5],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS,
      size: [50, 50],
      scale: 0.75,
      rotateWithView: true
    })
  })
};

export const waypointStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/marker-gold.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS
    }),
    text: new Text({
      text: '',
      offsetY: -27
    })
  }),
  active: new Style({
    image: new Icon({
      src: './assets/img/marker-blue.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS
    }),
    text: new Text({
      text: '',
      offsetY: -27
    })
  }),
  pseudoAtoN: new Style({
    image: new Icon({
      src: './assets/img/marker-red.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS
    }),
    text: new Text({
      text: '',
      offsetY: -27
    })
  })
};

export const noteStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/note.png',
      rotateWithView: false
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  })
};

export const anchorStyles = {
  line: new Style({
    fill: new Fill({ color: 'green' }),
    stroke: new Stroke({
      color: 'black',
      width: 2,
      lineDash: [5, 5]
    })
  }),
  circle: new Style({
    fill: new Fill({ color: 'rgba(0, 255, 0, .3)' }),
    stroke: new Stroke({
      color: 'red',
      width: 2,
      lineDash: [5, 5]
    })
  }),
  anchor: new Style({
    image: new Icon({
      src: './assets/img/anchor.png',
      size: [26, 26],
      scale: 0.75,
      anchor: [13, 1],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS,
      rotateWithView: false
    })
  })
};

export const destinationStyles = {
  marker: new Style({
    image: new Icon({
      src: './assets/img/marker-blue.png',
      anchor: [10.5, 25],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS,
      rotateWithView: false
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  })
};

export const aisVesselStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/ais_active.png',
      rotateWithView: true,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  }),
  inactive: new Style({
    image: new Icon({
      src: './assets/img/ais_inactive.png',
      rotateWithView: true,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  }),
  focus: new Style({
    image: new Icon({
      src: './assets/img/ais_self.png',
      rotateWithView: true,
      rotation: 0,
      anchor: [9.5, 22.5],
      anchorXUnits: IconAnchorUnits.PIXELS,
      anchorYUnits: IconAnchorUnits.PIXELS,
      size: [50, 50],
      scale: 0.75
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  }),
  buddy: new Style({
    image: new Icon({
      src: './assets/img/ais_buddy.png',
      rotateWithView: true,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  })
};

export const atonStyles = {
  default: new Style({
    image: new RegularShape({
      points: 4, //(id.indexOf('basestation')!=-1) ? 3 : 4,
      radius: 10,
      stroke: new Stroke({
        color: `black`,
        width: 1
      }),
      fill: new Fill({ color: 'transparent' }),
      rotateWithView: false
    }),
    text: new Text({
      text: '',
      offsetX: 0,
      offsetY: -12
    })
  })
};

export const basestationStyles = {
  default: new Style({
    image: new RegularShape({
      points: 3,
      radius: 10,
      stroke: new Stroke({
        color: `black`,
        width: 1
      }),
      fill: new Fill({ color: 'transparent' }),
      rotateWithView: false
    }),
    text: new Text({
      text: '',
      offsetX: 0,
      offsetY: -12
    })
  })
};

export const aircraftStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/aircraft_active.png',
      rotateWithView: true,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  }),
  inactive: new Style({
    image: new Icon({
      src: './assets/img/aircraft_inactive.png',
      rotateWithView: true,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -12
    })
  })
};

export const sarStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/sar_active.png',
      rotateWithView: false,
      rotation: 0
    }),
    text: new Text({
      text: '',
      offsetY: -18
    })
  })
};
