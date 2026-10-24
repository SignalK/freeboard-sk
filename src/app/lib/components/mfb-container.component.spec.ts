import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MFBContainerComponent } from './mfb-container.component';
import { ToolbarItem } from './map-toolbar/map-toolbar';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';

describe('MFBContainerComponent — extension button', () => {
  let fixture: ComponentFixture<MFBContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MFBContainerComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AppFacade, useValue: {} },
        { provide: RadarAPIService, useValue: {} },
        {
          provide: PlotterExtensionService,
          useValue: { actionButtonLift: signal(0) }
        }
      ]
    });
    fixture = TestBed.createComponent(MFBContainerComponent);
  });

  const render = (item?: ToolbarItem) => {
    fixture.componentRef.setInput('action', 'ext:poi/search');
    fixture.componentRef.setInput('extensionButton', item);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-action-button="extension"]'
    );
  };

  it('draws the button with its icon, title and decoration, and runs it', () => {
    const action = vi.fn();
    const button = render({
      id: 'ext:poi/search',
      icon: 'travel_explore',
      tooltip: 'POI Search',
      tone: 'warning',
      colors: { bg: '#ffd600' },
      badge: 3,
      action
    });

    expect(button).toBeTruthy();
    expect(button!.textContent).toContain('travel_explore');
    expect(button!.getAttribute('aria-label')).toBe('POI Search (3)');
    expect(button!.classList).toContain('button-accent');
    expect(button!.classList).toContain('custom-bg');
    expect(button!.style.getPropertyValue('--toolbar-button-bg')).toBe(
      '#ffd600'
    );

    button!.click();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('leaves the corner empty while the chosen button is not available', () => {
    expect(render(undefined)).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button')
    ).toBeNull();
  });
});
