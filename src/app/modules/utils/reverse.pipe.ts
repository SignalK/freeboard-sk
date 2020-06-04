import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'reverse' })
export class ReversePipe implements PipeTransform {

    constructor() {}
 
    public transform(value: Array<any>): Array<any> {
        return value.slice().reverse();
    }

}
