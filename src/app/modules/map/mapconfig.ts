// ** Freeboard Map configuration **

import { Style, Icon, Text, Stroke, Fill } from 'ol/style';

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
      units: 'nautical'
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
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      size: [50, 50],
      scale: 0.75,
      rotateWithView: true
    })
  }),
  inactive: new Style({
    image: new Icon({
      src: './assets/img/ship_blur.png',
      anchor: [9.5, 22.5],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      size: [50, 50],
      scale: 0.75,
      rotateWithView: true
    })
  }),
  fixed: new Style({
    image: new Icon({
      src: './assets/img/fixed_location.png',
      anchor: [22.5, 50],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      size: [50, 50],
      scale: 0.5,
      rotateWithView: false
    })
  })
};

export const routeStyles = {
  default: new Style({
    stroke: new Stroke({
      color: 'green',
      width: 2,
      lineDash: [20, 5, 5, 5]
    })
  }),
  active: new Style({
    stroke: new Stroke({
      color: 'blue',
      width: 4
    })
  }),
  startPin: new Style({
    image: new Icon({
      src: './assets/img/startflag.png',
      rotateWithView: false,
      scale: 0.5,
      anchor: [22.5, 45],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: 10
    })
  }),
  startBoat: new Style({
    image: new Icon({
      src: './assets/img/startflag.png',
      rotateWithView: false,
      scale: 0.5,
      anchor: [22.5, 45],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: 20
    })
  }),
  startLine: new Style({
    stroke: new Stroke({
      color: 'black',
      width: 1,
      lineDash: [4, 4]
    }),
    text: new Text({
      text: 'Start',
      offsetY: 10
    })
  }),
  finishLine: new Style({
    stroke: new Stroke({
      color: 'black',
      width: 1,
      lineDash: [4, 4]
    }),
    text: new Text({
      text: 'Finish',
      offsetY: -10
    })
  }),
  finishPin: new Style({
    image: new Icon({
      src: './assets/img/finishflag.png',
      rotateWithView: false,
      scale: 0.25,
      anchor: [1, 59],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: 10
    })
  })
};

export const waypointStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/marker-yellow.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  }),
  active: new Style({
    image: new Icon({
      src: './assets/img/marker-blue.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  }),
  pseudoAtoN: new Style({
    image: new Icon({
      src: './assets/img/marker-red.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [10.5, 25],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  })
};

export const noteStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/note.png',
      rotateWithView: false,
      size: [25, 25],
      anchor: [5, 3],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
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
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      rotateWithView: false
    })
  })
};

export const alarmStyles = {
  mob: new Style({
    image: new Icon({
      src: './assets/img/alarms/mob_map.png',
      scale: 1,
      anchor: [13, 13],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      rotateWithView: false
    })
  })
};

export const destinationStyles = {
  marker: new Style({
    image: new Icon({
      src: './assets/img/marker-blue.png',
      anchor: [10.5, 25],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
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
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
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
    image: new Icon({
      src: './assets/img/aton.png',
      rotateWithView: false,
      rotation: 0,
      anchor: [12.5, 12.5],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetX: 0,
      offsetY: -18
    })
  })
};

export const basestationStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/aton_basestation.png',
      rotateWithView: false,
      rotation: 0,
      anchor: [12.5, 14.5],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetX: 0,
      offsetY: -20
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

export const meteoStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/weather_station.png',
      rotateWithView: false,
      rotation: 0,
      size: [35, 25],
      anchor: [1, 25],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  })
};
