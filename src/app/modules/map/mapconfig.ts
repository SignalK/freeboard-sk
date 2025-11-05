// ** Freeboard Map configuration **

import { Style, Icon, Text, Stroke, Fill, Circle } from 'ol/style';

export const mapControls = [
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
  //{name: 'fullscreen'},
  //{name: 'rotate'},
  //{name: 'zoom'},
  //{name: 'zoomslider'},
  //{name: 'zoomtoextent'},
  //{name: 'attribution'},
];

export const raceCourseStyles = {
  startLine: new Style({
    stroke: new Stroke({
      color: 'black',
      width: 2,
      lineDash: [4, 4]
    }),
    text: new Text({
      text: 'START',
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

// ***********

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

// ***********
export const regionStyles = {
  'notice-to-mariners': new Style({
    stroke: new Stroke({
      color: 'rgb(206, 107, 132)',
      lineDash: [5, 5],
      width: 2
    }),
    fill: new Fill({
      color: 'rgba(206, 107, 132, 0.2)'
    }),
    text: new Text({
      text: '',
      offsetY: 0
    })
  }),
  hazard: new Style({
    stroke: new Stroke({
      color: 'rgba(241, 60, 60, 1)',
      lineDash: [5, 5, 2],
      width: 2
    }),
    fill: new Fill({
      color: 'rgba(241, 60, 60, 0.5)'
    }),
    text: new Text({
      text: '',
      offsetY: 0,
      stroke: new Stroke({ color: 'silver' }),
      padding: [2, 2, 2, 2],
      backgroundFill: new Fill({
        color: 'white'
      }),
      backgroundStroke: new Stroke({
        color: 'rgba(241, 60, 60, 1)'
      })
    })
  })
};

// ***********

export const alarmStyles = {
  mob: new Style({
    image: new Icon({
      src: './assets/img/alarms/mob.svg',
      rotateWithView: false,
      rotation: 0,
      scale: 1,
      anchor: [12, 12],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels'
    })
  })
};

export const destinationStyles = {
  marker: new Style({
    image: new Icon({
      src: './assets/img/waypoints/marker-green.png',
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

// ***********

const baseStationIcon = new Icon({
  src: './assets/img/atons/basestation.svg',
  scale: 0.4,
  anchor: [23, 49],
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels',
  rotateWithView: false,
  rotation: 0
});

export const basestationStyles = {
  default: new Style({
    image: baseStationIcon,
    text: new Text({
      text: '',
      offsetX: 0,
      offsetY: -20
    })
  })
};

// ***********
const aircraftActiveIcon = new Icon({
  src: './assets/img/aircraft_active.png',
  rotateWithView: true,
  rotation: 0
});

const aircraftInactiveIcon = new Icon({
  src: './assets/img/aircraft_inactive.png',
  rotateWithView: true,
  rotation: 0
});

export const aircraftStyles = {
  default: new Style({
    image: aircraftActiveIcon,
    text: new Text({
      text: '',
      offsetY: -12
    })
  }),
  inactive: new Style({
    image: aircraftInactiveIcon,
    text: new Text({
      text: '',
      offsetY: -12
    })
  })
};

// ***********
const sarIcon = new Icon({
  src: './assets/img/sar_active.png',
  rotateWithView: false,
  rotation: 0
});

export const sarStyles = {
  default: new Style({
    image: sarIcon,
    text: new Text({
      text: '',
      offsetY: -18
    })
  })
};

// ***********
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
  ],
  radius: [
    new Style({
      image: new Circle({
        radius: 6,
        stroke: new Stroke({
          width: 2,
          color: 'white'
        }),
        fill: new Fill({
          color: 'rgba(25, 183, 211, 0.4)'
        })
      })
    }),
    new Style({
      fill: new Fill({
        color: 'rgba(25, 183, 211, 0.4)'
      }),
      stroke: new Stroke({
        color: 'white',
        width: 3,
        lineDash: [5, 5]
      })
    })
  ]
};
