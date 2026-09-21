import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { WMTSDialog } from './wmts-dialog';
import { WMTSLayerDef } from './maplib';
import { AppFacade } from 'src/app/app.facade';

/**
 * #797: the Add WMTS Source dialog has its own layer list (it does not use
 * `node-list-select`), so it needs the same identifier-beside-title treatment.
 */
describe('WMTSDialog — layer identifier beside title', () => {
  let fixture: ComponentFixture<WMTSDialog>;

  const mount = async (layers: WMTSLayerDef[]) => {
    TestBed.configureTestingModule({
      imports: [WMTSDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        { provide: MAT_DIALOG_DATA, useValue: { format: 'chartprovider' } },
        { provide: AppFacade, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(WMTSDialog);
    (
      fixture.componentInstance as unknown as { wmtsLayers: WMTSLayerDef[] }
    ).wmtsLayers = layers;
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
    ] as WMTSLayerDef[]);
    expect(titles()).toEqual(['NOAA Raster Charts (noaa_rnc)', 'OpenSeaMap']);
  });
});
