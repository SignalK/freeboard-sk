/*****************************
 * Utilities Module
 *****************************/
import { NgModule } from '@angular/core';

import  { CoordsPipe } from './coords.pipe'
import  { ReversePipe } from './reverse.pipe'

@NgModule({
    imports: [],    
    declarations: [ CoordsPipe, ReversePipe ],
    exports: [ CoordsPipe, ReversePipe ],
    entryComponents: [ ], 
    providers: []  
})
export class UtilitiesModule {}
