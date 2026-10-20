// **** CUSTOM RESOURCE CLASSES **********
import { ResourceSet, CustomStyles } from 'src/app/types';

// ** Freeboard / SK ResourceSet
export class SKResourceSet {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  values: ResourceSet['values'] = { type: 'FeatureCollection', features: [] };
  styles?: CustomStyles;
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
