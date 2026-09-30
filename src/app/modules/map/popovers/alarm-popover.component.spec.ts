import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AlarmPopoverComponent } from './alarm-popover.component';
import { AppFacade } from 'src/app/app.facade';

/**
 * The close button follows the "Popovers close with button" setting, which
 * the map passes as `canClose`.
 */
describe('AlarmPopoverComponent — close button', () => {
  const render = (canClose: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: { units: { positionFormat: 'XY' } },
            hostDef: { url: '' }
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(AlarmPopoverComponent);
    fixture.componentRef.setInput('alarm', {
      path: 'notifications.mob',
      type: 'mob',
      icon: { class: 'icon-warn', name: 'warning' },
      message: 'Person overboard',
      properties: { position: { latitude: 60.15, longitude: 24.95 } }
    });
    fixture.componentRef.setInput('canClose', canClose);
    fixture.detectChanges();
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-icon')
    ).some((i) => (i.textContent ?? '').trim() === 'close');
  };

  it('has no close button when the setting is off', () => {
    expect(render(false)).toBe(false);
  });

  it('has a close button when the setting is on', () => {
    expect(render(true)).toBe(true);
  });
});
