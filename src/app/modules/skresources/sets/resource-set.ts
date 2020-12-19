// **** RESOURCE CLASSES **********

// ** Signal K Resource Set
export class SKResourceSet {
    id: string;
    name: string;
    description: string;
    values= { 
        type: 'FeatureCollection',
        features: []
    };
    styles= {};
    type: string= 'ResourceSet';

    constructor(resSet?) {
        if(resSet) {
            this.id= (resSet.id) ? resSet.id : null;
            this.name= (resSet.name) ? resSet.name : null;
            this.description= (resSet.description) ? resSet.description : null;
            this.styles= (resSet.styles) ? resSet.styles : {};
            this.values= (resSet.values) ? resSet.values : {};
        }
    }
}

