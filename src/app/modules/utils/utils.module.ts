/*****************************
 * Utilities Module
 *****************************/
import { NgModule } from '@angular/core';

import  { CoordsPipe } from './coords.pipe'

@NgModule({
    imports: [],    
    declarations: [ CoordsPipe ],
    exports: [ CoordsPipe ],
    entryComponents: [ ], 
    providers: []  
})
export class UtilitiesModule {}
