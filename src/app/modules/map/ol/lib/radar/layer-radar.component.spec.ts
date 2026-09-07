import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageSource from 'ol/source/Image';
import { RadarComponent } from './layer-radar.component';
import { RadarRenderService } from './radar-render.service';
import { MapComponent } from '../map.component';

// The spoke stream tells the radar provider that someone is watching, and the
// provider may let an unwatched radar stand down. So the stream must follow the
// page's visibility, not just the overlay's on/off state: a backgrounded tab
// would otherwise keep the radar transmitting all night.
describe('RadarComponent spoke stream', () => {
  let hidden = false;
  const render = {
    connect: vi.fn(),
    createRadarSource: vi.fn(),
    disconnect: vi.fn()
  };
  const map = { addLayer: vi.fn(), removeLayer: vi.fn(), render: vi.fn() };

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const setHidden = (value: boolean) => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(async () => {
    hidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden
    });
    render.connect.mockReset().mockResolvedValue({ id: 'nav1034A' });
    render.createRadarSource
      .mockReset()
      .mockImplementation(() => new ImageSource({}));
    render.disconnect.mockReset();

    await TestBed.configureTestingModule({
      declarations: [RadarComponent],
      providers: [
        { provide: MapComponent, useValue: { getMap: () => map } },
        { provide: RadarRenderService, useValue: render }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).hidden;
  });

  it('opens the stream when the overlay comes up on a visible page', async () => {
    const fixture = TestBed.createComponent(RadarComponent);
    fixture.detectChanges();
    await flush();

    expect(render.connect).toHaveBeenCalledTimes(1);
    expect(render.createRadarSource).toHaveBeenCalledTimes(1);
  });

  it('does not open the stream while the page is hidden', async () => {
    hidden = true;
    const fixture = TestBed.createComponent(RadarComponent);
    fixture.detectChanges();
    await flush();

    expect(render.connect).not.toHaveBeenCalled();
  });

  it('closes the stream when the page is hidden and reopens it when shown', async () => {
    const fixture = TestBed.createComponent(RadarComponent);
    fixture.detectChanges();
    await flush();

    setHidden(true);
    expect(render.disconnect).toHaveBeenCalledTimes(1);

    setHidden(false);
    await flush();
    expect(render.connect).toHaveBeenCalledTimes(2);
    expect(render.createRadarSource).toHaveBeenCalledTimes(2);
  });

  it('closes the stream when the overlay is turned off', async () => {
    const fixture = TestBed.createComponent(RadarComponent);
    fixture.detectChanges();
    await flush();

    fixture.destroy();
    expect(render.disconnect).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalled();
  });
});
