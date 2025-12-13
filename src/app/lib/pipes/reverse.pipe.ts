import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reverse'
})
export class ReversePipe implements PipeTransform {
  //constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public transform(value: Array<any>): Array<any> {
    return value.slice().reverse();
  }
}
