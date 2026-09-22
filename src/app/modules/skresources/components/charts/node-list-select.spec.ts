import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { NodeListLayer, NodeListSelect } from './node-list-select';
import { AppFacade } from 'src/app/app.facade';

/**
 * #797: the WMTS layer list labels rows by `ows:Title`; the `ows:Identifier`
 * is what is stored in the chart, so show it beside the title when it differs.
 */
describe('NodeListSelect — layer identifier beside title', () => {
  let fixture: ComponentFixture<NodeListSelect>;

  const mount = async (
    layers: { id: string; name: string; description: string }[]
  ) => {
    TestBed.configureTestingModule({
      imports: [NodeListSelect],
      providers: [provideNoopAnimations(), { provide: AppFacade, useValue: {} }]
    });
    fixture = TestBed.createComponent(NodeListSelect);
    fixture.componentRef.setInput('layers', layers);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const titles = (): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        '[matListItemTitle]'
      ) as HTMLElement[]
    ).map((el) => el.textContent.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('appends the identifier when it differs from the title', async () => {
    await mount([
      { id: 'noaa_rnc', name: 'NOAA Raster Charts', description: '' },
      { id: 'OpenSeaMap', name: 'OpenSeaMap', description: '' }
    ]);
    expect(titles()).toEqual(['NOAA Raster Charts (noaa_rnc)', 'OpenSeaMap']);
  });
});

/**
 * #808: a WMTS layer that advertises a time dimension gets a `schedule`
 * marker so the user can tell which rows will give the chart a Time control.
 */
describe('NodeListSelect — time-varying indicator', () => {
  let fixture: ComponentFixture<NodeListSelect>;

  const T0 = '2026-09-18T00:00:00.000Z';
  const T1 = '2026-09-18T12:00:00.000Z';

  const mount = async (layers: NodeListLayer[]) => {
    TestBed.configureTestingModule({
      imports: [NodeListSelect],
      providers: [provideNoopAnimations(), { provide: AppFacade, useValue: {} }]
    });
    fixture = TestBed.createComponent(NodeListSelect);
    fixture.componentRef.setInput('layers', layers);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const rows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-list-option'));

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('marks only the layers with a time dimension', async () => {
    await mount([
      {
        id: 'modis',
        name: 'MODIS True Color',
        description: '',
        time: { from: T0, to: T1, values: [T0, T1], current: T1 }
      },
      { id: 'noaa_rnc', name: 'NOAA Raster Charts', description: '' }
    ]);
    const marked = rows().map(
      (r) => r.querySelector('mat-icon._ap-layer-time') !== null
    );
    expect(marked).toEqual([true, false]);
    // It prefixes the title.
    expect(
      rows()[0]
        .querySelector('[matListItemTitle]')
        .textContent.replace(/\s+/g, ' ')
        .trim()
    ).toBe('schedule MODIS True Color (modis)');
    const tooltip = fixture.debugElement
      .queryAll((de) => de.name === 'mat-icon')
      .map((de) => de.injector.get(MatTooltip, null))
      .find((t) => t?.message);
    expect(tooltip?.message).toBe('Time-varying: 2 frames, last 12 h');
  });
});
