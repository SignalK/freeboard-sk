/*****************************
 * Utilities Module
 *****************************/
import { NgModule } from '@angular/core';

import { CoordsPipe } from './coords.pipe';
import { ReversePipe } from './reverse.pipe';

@NgModule({
  imports: [],
  declarations: [CoordsPipe, ReversePipe],
  exports: [CoordsPipe, ReversePipe],
  providers: []
})
export class PipesModule {}
