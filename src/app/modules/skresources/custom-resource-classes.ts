// **** CUSTOM RESOURCE CLASSES **********
import { ResourceSet, CustomStyles, InfoLayerResource } from 'src/app/types';

// ** Freeboard / SK ResourceSet
export class SKResourceSet {
  id: string;
  name: string;
  description: string;
  values;
  styles: CustomStyles;
  type = 'ResourceSet';

  constructor(resSet?: ResourceSet) {
    if (resSet) {
      this.id = resSet.id ? resSet.id : null;
      this.name = resSet.name ? resSet.name : null;
      this.description = resSet.description ? resSet.description : null;
      this.styles = resSet.styles ? resSet.styles : {};
      this.values = resSet.values ?? {
        type: 'FeatureCollection',
        features: []
      };
    }
  }
}

// ** Freeboard / SK Information Layer
export class SKInfoLayer {
  id: string;
  name: string;
  description: string;
  values: any = {
    url: null,
    sourceType: null,
    layers: [],
    time: {
      current: null,
      min: null,
      max: null,
      values: []
    },
    opacity: 1,
    minZoom: 1,
    maxZoom: 24,
    refreshInterval: 0
  };
  type = 'InfoLayer';

  constructor(info?: InfoLayerResource) {
    if (info) {
      this.id = info.id ? info.id : null;
      this.name = info.name ? info.name : null;
      this.description = info.description ? info.description : null;
      this.values = info.values ?? this.values;
    }
  }
}
