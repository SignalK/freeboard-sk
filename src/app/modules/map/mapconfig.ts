// ** Freeboard Map configuration **

import { Style, Icon, Text, Stroke, Fill, Circle } from 'ol/style';

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

export const raceCourseStyles = {
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
      src: './assets/img/startboat.png',
      rotateWithView: false,
      scale: 0.15,
      anchor: [24, 160],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    }),
    text: new Text({
      text: '',
      offsetY: 10
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

export const routeStyles = {
  default: new Style({
    stroke: new Stroke({
      color: 'green',
      width: 2,
      lineDash: [20, 5, 5, 5]
    }),
    text: new Text({
      text: '',
      offsetY: 10
    })
  }),
  active: new Style({
    stroke: new Stroke({
      color: 'blue',
      width: 4
    })
  })
};

export const waypointStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/waypoints/marker-yellow.png',
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
      src: './assets/img/waypoints/marker-blue.png',
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
  pseudoaton: new Style({
    image: new Icon({
      src: './assets/img/waypoints/marker-red.png',
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
  whale: new Style({
    image: new Icon({
      src: './assets/img/waypoints/whale.svg',
      rotateWithView: false,
      scale: 0.15,
      anchor: [65, 188],
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

const aisScale = 1.0;
const aisIconAnchor = [17, 16];

const aisFocus = new Icon({
  src: './assets/img/ais_self.png',
  rotateWithView: true,
  rotation: 0,
  anchor: [9.5, 22.5],
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels',
  size: [50, 50],
  scale: 0.75
});
const aisActive = new Icon({
  src: './assets/img/ais_active.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const aisInactive = new Icon({
  src: './assets/img/ais_inactive.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais40 = new Icon({
  src: './assets/img/ais_highspeed.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais50 = new Icon({
  src: './assets/img/ais_special.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais60 = new Icon({
  src: './assets/img/ais_passenger.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais70 = new Icon({
  src: './assets/img/ais_cargo.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais80 = new Icon({
  src: './assets/img/ais_tanker.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const ais90 = new Icon({
  src: './assets/img/ais_other.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});
const aisBuddy = new Icon({
  src: './assets/img/ais_buddy.svg',
  rotateWithView: true,
  rotation: 0,
  scale: aisScale,
  anchor: aisIconAnchor,
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels'
});

const aisTextOffset = 22;
const aisMooredTextOffset = 12;
export const aisVesselStyles = {
  default: new Style({
    image: aisActive,
    text: new Text({
      text: '',
      offsetY: aisTextOffset
    })
  }),
  inactive: new Style({
    image: aisInactive,
    text: new Text({
      text: '',
      offsetY: aisTextOffset
    })
  }),
  focus: new Style({
    image: aisFocus,
    text: new Text({
      text: '',
      offsetY: aisTextOffset
    }),
    zIndex: 500
  }),
  buddy: new Style({
    image: aisBuddy,
    text: new Text({
      text: '',
      offsetY: aisTextOffset
    })
  }),
  // vessel state
  moored: new Style({
    // moored state
    image: new Circle({
      radius: 5,
      stroke: new Stroke({
        width: 2,
        color: 'white'
      }),
      fill: new Fill({
        color: '#FF00FF'
      })
    }),
    text: new Text({
      text: '',
      offsetY: aisMooredTextOffset
    })
  }),
  // vessel type & state
  40: {
    // high-speed
    default: new Style({
      image: ais40,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#7F6A00'
        }),
        fill: new Fill({
          color: '#FFE97F'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  },
  50: {
    // special
    default: new Style({
      image: ais50,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#000000'
        }),
        fill: new Fill({
          color: '#00ffff'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  },
  60: {
    // passenger
    default: new Style({
      image: ais60,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#0026FF'
        }),
        fill: new Fill({
          color: '#0026FF'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  },
  70: {
    // cargo
    default: new Style({
      image: ais70,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#000000'
        }),
        fill: new Fill({
          color: '#009931'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  },
  80: {
    // tanker
    default: new Style({
      image: ais80,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#7F0000'
        }),
        fill: new Fill({
          color: '#FF0000'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  },
  90: {
    // other
    default: new Style({
      image: ais90,
      text: new Text({
        text: '',
        offsetY: aisTextOffset
      })
    }),
    moored: new Style({
      // moored state
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: '#000000'
        }),
        fill: new Fill({
          color: '#808080'
        })
      }),
      text: new Text({
        text: '',
        offsetY: aisMooredTextOffset
      })
    })
  }
};

export const atonStyles = {
  default: new Style({
    image: new Icon({
      src: './assets/img/aton.png',
      rotateWithView: false,
      rotation: 0,
      anchor: [12.5, 12.5],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      scale: 0.75
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
      anchorYUnits: 'pixels',
      scale: 0.75
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
      anchorYUnits: 'pixels',
      scale: 0.75
    }),
    text: new Text({
      text: '',
      offsetY: -30
    })
  })
};

export const laylineStyles = {
  port: new Style({
    fill: new Fill({ color: 'green' }),
    stroke: new Stroke({
      color: 'green',
      width: 1,
      lineDash: [5, 5]
    })
  }),
  starboard: new Style({
    fill: new Fill({ color: 'red' }),
    stroke: new Stroke({
      color: 'red',
      width: 1,
      lineDash: [5, 5]
    })
  })
};

export const targetAngleStyle = new Style({
  fill: new Fill({ color: 'green' }),
  stroke: new Stroke({
    color: 'gray',
    width: 1,
    lineDash: [15, 5, 3, 5]
  })
});

export const drawStyles = {
  default: undefined,
  measure: [
    new Style({
      stroke: new Stroke({
        color: 'white',
        width: 5,
        lineDash: [5, 5]
      })
    }),
    new Style({
      image: new Circle({
        radius: 6,
        stroke: new Stroke({
          width: 2,
          color: 'white'
        }),
        fill: new Fill({
          color: '#3399CC'
        })
      }),
      fill: new Fill({
        color: '#3399CC'
      }),
      stroke: new Stroke({
        color: '#3399CC',
        width: 3,
        lineDash: [5, 5]
      })
    })
  ],
  route: [
    new Style({
      stroke: new Stroke({
        color: 'white',
        width: 5
      })
    }),
    new Style({
      image: new Circle({
        radius: 6,
        stroke: new Stroke({
          width: 2,
          color: 'white'
        }),
        fill: new Fill({
          color: 'green'
        })
      }),
      stroke: new Stroke({
        color: 'green',
        width: 3
      })
    })
  ],
  region: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(255,255,255,0.4)',
        width: 5
      }),
      fill: new Fill({
        color: 'rgba(255,255,255,0.4)'
      })
    }),
    new Style({
      stroke: new Stroke({
        color: 'purple',
        width: 2
      }),
      image: new Circle({
        radius: 6,
        stroke: new Stroke({
          width: 2,
          color: 'white'
        }),
        fill: new Fill({
          color: 'purple'
        })
      })
    })
  ]
};
