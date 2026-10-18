import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Fill, Style } from 'ol/style';

import { DefaultOptions, S57Service } from './s57.service';

describe('S57Service.setOptions — colour table', () => {
  let service: S57Service;
  const depthAreaStyle = () =>
    new Style({ fill: new Fill({ color: 'RGBA(201, 237, 252,1)' }) });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(S57Service);
    service.init({ ...DefaultOptions, colorTable: 0 });
  });

  it('drops styles built with the previous colour table', () => {
    service.setStyle('AC_DEPDW', depthAreaStyle());

    service.setOptions({ ...DefaultOptions, colorTable: 1 });

    expect(service.getStyle('AC_DEPDW')).toBeFalsy();
  });

  it('keeps cached styles when the colour table is unchanged', () => {
    const style = depthAreaStyle();
    service.setStyle('AC_DEPDW', style);

    service.setOptions({ ...DefaultOptions, colorTable: 0, safetyDepth: 5 });

    expect(service.getStyle('AC_DEPDW')).toBe(style);
  });

  it('asks the chart layers to redraw on a colour table change', () => {
    let refreshed = 0;
    service.refresh.subscribe(() => refreshed++);

    service.setOptions({ ...DefaultOptions, colorTable: 2 });

    expect(refreshed).toBe(1);
  });
});
