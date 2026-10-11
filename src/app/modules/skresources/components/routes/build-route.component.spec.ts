import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatTooltip } from '@angular/material/tooltip';
import { describe, it, expect, beforeEach } from 'vitest';

import { BuildRouteComponent } from './build-route.component';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../../resources.service';

/**
 * A swipe over either Build Route list has to scroll it. A `cdkDrag` without a
 * live handle starts a drag from anywhere on it and claims the gesture, so on a
 * touchscreen a swipe over a list picked up a waypoint (or moved the whole
 * popup) and waypoints below the fold could not be reached. The popup may move
 * only by its title bar, and a waypoint only by its drag indicator.
 */
describe('BuildRouteComponent — drag handles', () => {
  const waypoint = (n: number) => [
    `wpt-${n}`,
    {
      name: `WPT ${String(n).padStart(2, '0')}`,
      description: '',
      feature: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [24.95, 60.15 + n / 100] },
        properties: {}
      }
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppFacade, useValue: {} },
        {
          provide: SKResourceService,
          useValue: {
            listFromServer: async () =>
              Array.from({ length: 20 }, (_, i) => waypoint(i))
          }
        }
      ]
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(BuildRouteComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const cmp = fixture.componentInstance;
    cmp.rtepts = cmp.wpts().slice(0, 3);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    return fixture;
  }

  it('moves the popup by its title bar and waypoints by their grip only', async () => {
    const fixture = await render();

    const el: HTMLElement = fixture.nativeElement;
    const rows = Array.from(el.querySelectorAll('.wpt-box'));
    expect(rows).toHaveLength(20 + 3);

    const handles = fixture.debugElement
      .queryAll(By.directive(CdkDragHandle))
      .map((h) => h.nativeElement as HTMLElement);
    // One for the popup's title bar, one per waypoint row.
    expect(handles).toHaveLength(1 + rows.length);

    const popup = fixture.debugElement
      .queryAll(By.directive(CdkDrag))
      .map((d) => d.nativeElement as HTMLElement)
      .find((d) => d.classList.contains('rte-builder'));
    expect(popup).toBeDefined();
    const titleHandles = handles.filter((h) => h.classList.contains('title'));
    expect(titleHandles).toHaveLength(1);
    expect(titleHandles[0].parentElement).toBe(popup);

    for (const row of rows) {
      const rowHandles = handles.filter((h) => row.contains(h));
      expect(rowHandles).toHaveLength(1);
      expect(rowHandles[0].textContent).toContain('drag_indicator');
    }
  });

  // On iOS/Android MatTooltip sets `touch-action: none` on its host, so a
  // waypoint name with the default touch gestures would still block the swipe.
  it('leaves touch gestures on the waypoint names to the list', async () => {
    const fixture = await render();
    const names = fixture.debugElement
      .queryAll(By.directive(MatTooltip))
      .filter((d) => d.nativeElement.classList.contains('wpt-text'));
    expect(names).toHaveLength(20 + 3);
    for (const n of names) {
      expect(n.injector.get(MatTooltip).touchGestures).toBe('off');
    }
  });
});
