// **** RESOURCE CLASSES **********
import { ResourceSet, CustomStyles } from 'src/app/types';

// ** Signal K Resource Set
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
