'use strict';

var go = module.exports = {
    size :  250
  , min  :  0
  , max  :  100 
  , transitionDuration : 500

  , label                      :  'label.text'
  , minorTicks                 :  4
  , majorTicks                 :  5
  , needleWidthRatio           :  0.6
  , needleContainerRadiusRatio :  0.7

  , zones: [
      { clazz: 'yellow-zone', from: 0.73, to: 0.9 }
    , { clazz: 'red-zone', from: 0.9, to: 1.0 }
    ]
};
