import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { NodeListSelect } from './node-list-select';
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
