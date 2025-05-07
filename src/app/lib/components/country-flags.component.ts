import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'country-flag',
  imports: [],
  template: `
    @if(showFlag()) {
    <img [src]="flagIcon" (error)="imgError()" />
    }
  `
})
export class CountryFlagComponent {
  protected flagIcon: string;
  protected showFlag = signal<boolean>(true);

  public mmsi = input<number>();
  public host = input<string>('');

  constructor() {
    effect(() => {
      this.flagIcon = `${this.host()}/signalk/v2/api/resources/flags/mmsi/${this.mmsi().toString()}`;
    });
  }

  /**
   * Handle flag image error
   */
  imgError() {
    this.showFlag.set(false);
  }
}
