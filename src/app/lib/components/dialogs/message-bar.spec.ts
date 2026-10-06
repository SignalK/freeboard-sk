import { TestBed } from '@angular/core/testing';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef
} from '@angular/material/snack-bar';
import { describe, expect, it, vi } from 'vitest';

import { MessageBarComponent } from './common-dialogs';

/** A message at the bottom of the screen can offer one action, which
 * dismisses it so the caller's onAction() runs. */
describe('MessageBarComponent', () => {
  const render = (action?: string) => {
    const dismissWithAction = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MessageBarComponent],
      providers: [
        {
          provide: MAT_SNACK_BAR_DATA,
          useValue: { message: 'Your buddy Mako is near', sound: false, action }
        },
        { provide: MatSnackBarRef, useValue: { dismissWithAction } }
      ]
    });
    const fixture = TestBed.createComponent(MessageBarComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { el, dismissWithAction };
  };

  it('shows the message alone when there is no action', () => {
    const { el } = render();
    expect(el.textContent).toContain('Your buddy Mako is near');
    expect(el.querySelector('button')).toBeNull();
  });

  it('offers the action and dismisses with it when pressed', () => {
    const { el, dismissWithAction } = render('LOCATE');
    const button = el.querySelector('button') as HTMLButtonElement;
    expect(button.textContent.trim()).toBe('LOCATE');

    button.click();

    expect(dismissWithAction).toHaveBeenCalledOnce();
  });
});
