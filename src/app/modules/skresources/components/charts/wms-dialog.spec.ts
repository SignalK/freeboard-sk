import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WMSDialog } from './wms-dialog';
import { WMTSDialog } from './wmts-dialog';
import { AppFacade } from 'src/app/app.facade';

/**
 * #810: the Add WMS / WMTS Source dialogs accept the GetCapabilities link a
 * provider publishes and store the service URL without its request
 * parameters, so the requests Freeboard builds later do not end up with two
 * query strings.
 */
describe('Add WMS / WMTS Source — service URL', () => {
  let close: ReturnType<typeof vi.fn>;

  const mount = <T>(component: new (...args: unknown[]) => T): T => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [component],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: AppFacade, useValue: {} }
      ]
    });
    return TestBed.createComponent(component).componentInstance;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('stores a pasted WMS GetCapabilities link as its service URL', () => {
    mount(WMSDialog).handleSave(
      'https://opengeo.ncep.noaa.gov/geoserver/kamx/ows?service=wms&version=1.3.0&request=GetCapabilities'
    );
    expect(close.mock.calls[0][0][0].url).toBe(
      'https://opengeo.ncep.noaa.gov/geoserver/kamx/ows'
    );
  });

  it('stores a pasted WMTS GetCapabilities link as its service URL', () => {
    mount(WMTSDialog).handleSave(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities'
    );
    expect(close.mock.calls[0][0][0].url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi'
    );
  });
});
