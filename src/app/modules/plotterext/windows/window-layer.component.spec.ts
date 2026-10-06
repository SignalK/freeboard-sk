import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlotterExtensionService } from '../plotterext.service';
import {
  ExtWindowLayerComponent,
  WINDOW_GESTURE_CLASS
} from './window-layer.component';
import { ExtWindowService } from './window.service';
import { extWindow, pointerEvent } from './testing';

const a = extWindow({ id: 'a' });
const b = extWindow({ id: 'b', title: 'Camera' });

describe('ExtWindowLayerComponent', () => {
  let fixture: ComponentFixture<ExtWindowLayerComponent>;
  let host: HTMLElement;
  let service: ExtWindowService;

  const windowEl = (id: string) =>
    host.querySelector<HTMLElement>(`fb-pe-window[data-window-id="${id}"]`);

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ExtWindowLayerComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: PlotterExtensionService,
          useValue: {
            resolveAssetUrl: (u: string) => `http://boat.local:3000${u}`,
            attachWindow: () => () => undefined
          }
        }
      ]
    });
    service = TestBed.inject(ExtWindowService);
    service.windows.set([a, b]);
    service.zOrder.set(['b', 'a']);
    vi.spyOn(service, 'focus');
    fixture = TestBed.createComponent(ExtWindowLayerComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    document.body.classList.remove(WINDOW_GESTURE_CLASS);
    vi.useRealTimers();
  });

  it('renders one window per open window, stacked in z-order', () => {
    expect(host.querySelectorAll('fb-pe-window').length).toBe(2);
    expect(windowEl('b').style.zIndex).toBe('2');
    expect(windowEl('a').style.zIndex).toBe('4');
    expect(
      windowEl('a').querySelector('.fb-pe-window__bar').classList
    ).toContain('front');
    expect(
      windowEl('b').querySelector('.fb-pe-window__bar').classList
    ).not.toContain('front');
  });

  it('marks the page while a window is being moved or resized', () => {
    expect(document.body.classList).not.toContain(WINDOW_GESTURE_CLASS);
    service.gestureActive.set(true);
    fixture.detectChanges();
    expect(document.body.classList).toContain(WINDOW_GESTURE_CLASS);
    service.gestureActive.set(false);
    fixture.detectChanges();
    expect(document.body.classList).not.toContain(WINDOW_GESTURE_CLASS);
  });

  it('brings a pressed window to the front', () => {
    windowEl('b').dispatchEvent(pointerEvent('pointerdown'));
    expect(service.focus).toHaveBeenCalledWith('b');
  });

  it('brings a window to the front when a click lands in its panel', () => {
    windowEl('b').querySelector('iframe').focus();
    expect(document.activeElement.tagName).toBe('IFRAME');
    window.dispatchEvent(new Event('blur'));
    vi.runOnlyPendingTimers();
    expect(service.focus).toHaveBeenCalledWith('b');
  });

  it('puts a backdrop behind an open modal window, and Escape closes it', () => {
    expect(host.querySelector('.fb-pe-window-backdrop')).toBeNull();
    const m = extWindow({ id: 'm', modal: true });
    service.windows.set([a, b, m]);
    service.zOrder.set(['b', 'a', 'm']);
    fixture.detectChanges();
    const backdrop = host.querySelector<HTMLElement>('.fb-pe-window-backdrop');
    expect(backdrop).not.toBeNull();
    // above every other window, below the modal one
    expect(backdrop.style.zIndex).toBe('5');
    expect(windowEl('m').style.zIndex).toBe('6');
    const closed = vi.fn();
    service.changes.subscribe(closed);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(service.windows().map((w) => w.id)).toEqual(['a', 'b']);
    expect(closed).toHaveBeenCalledWith({
      extension: 'ext-a',
      event: 'window.closed',
      payload: { windowId: 'm', reason: 'user' }
    });
    expect(host.querySelector('.fb-pe-window-backdrop')).toBeNull();
  });

  it('leaves Escape alone when no modal window is open', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(service.windows().length).toBe(2);
  });
});
