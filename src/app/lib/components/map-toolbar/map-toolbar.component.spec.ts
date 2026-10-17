import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatMenuTrigger } from '@angular/material/menu';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapToolbarComponent } from './map-toolbar.component';
import { TOOLBAR_ITEM_PITCH, ToolbarItem } from './map-toolbar';

// jsdom does no layout, so drive the toolbar's height by hand.
class StubResizeObserver {
  static last: StubResizeObserver | null = null;
  constructor(private callback: ResizeObserverCallback) {
    StubResizeObserver.last = this;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  resize(height: number) {
    this.callback(
      [{ contentRect: { height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
}

describe('MapToolbarComponent', () => {
  let fixture: ComponentFixture<MapToolbarComponent>;

  const mount = (items: ToolbarItem[], side: 'left' | 'right' = 'right') => {
    fixture = TestBed.createComponent(MapToolbarComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('side', side);
    fixture.detectChanges();
  };

  const fitSlots = (slots: number) => {
    StubResizeObserver.last?.resize(slots * TOOLBAR_ITEM_PITCH);
    fixture.detectChanges();
  };

  const buttons = () =>
    fixture.debugElement
      .queryAll(By.css('.toolbarItem button'))
      .map((de) => de.nativeElement as HTMLButtonElement);

  const buttonIcons = () =>
    buttons().map((b) => b.querySelector('mat-icon')?.textContent?.trim());

  const lastButton = () => buttons()[buttons().length - 1];

  const openOverflowMenu = () => {
    const triggers = fixture.debugElement.queryAll(
      By.directive(MatMenuTrigger)
    );
    triggers[triggers.length - 1].injector.get(MatMenuTrigger).openMenu();
    fixture.detectChanges();
    return Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    );
  };

  const item = (id: string, extra: Partial<ToolbarItem> = {}): ToolbarItem => ({
    id,
    icon: `icon_${id}`,
    tooltip: `Label ${id}`,
    action: () => undefined,
    ...extra
  });

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    TestBed.configureTestingModule({ imports: [MapToolbarComponent] });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

  it('shows every button, and no "…", when they fit', () => {
    mount([item('a'), item('b'), item('c')]);
    fitSlots(3);
    expect(buttonIcons()).toEqual(['icon_a', 'icon_b', 'icon_c']);
  });

  it('shows the first X - 1 buttons then "…" when they do not fit', () => {
    mount([item('a'), item('b'), item('c'), item('d')]);
    fitSlots(3);
    expect(buttonIcons()).toEqual(['icon_a', 'icon_b', 'more_horiz']);
  });

  it('lists the hidden buttons in the "…" menu with their tooltip text, in order', () => {
    const action = vi.fn();
    mount([item('a'), item('b'), item('c', { action }), item('d')]);
    fitSlots(2);

    const entries = openOverflowMenu();
    expect(entries.map((e) => e.textContent?.trim())).toEqual([
      'icon_bLabel b',
      'icon_cLabel c',
      'icon_dLabel d'
    ]);

    entries[1].click();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('puts a dot on "…" only while it hides an active or badged button', () => {
    const items = [item('a'), item('b'), item('c')];
    mount(items);
    fitSlots(2);
    const dot = () => lastButton().classList.contains('mat-badge-hidden');
    expect(dot()).toBe(true);

    fixture.componentRef.setInput('items', [
      items[0],
      items[1],
      item('c', { active: true })
    ]);
    fixture.detectChanges();
    expect(dot()).toBe(false);

    fixture.componentRef.setInput('items', [
      item('a', { active: true }),
      items[1],
      item('c', { badge: 3 })
    ]);
    fixture.detectChanges();
    expect(dot()).toBe(false);

    // the active item is visible, so it does not need the dot
    fixture.componentRef.setInput('items', [
      item('a', { active: true }),
      items[1],
      items[2]
    ]);
    fixture.detectChanges();
    expect(dot()).toBe(true);
  });

  describe('with an anchor item', () => {
    const left = () => [
      item('a'),
      item('b'),
      item('more', { icon: 'more_horiz', overflowAnchor: true }),
      item('c'),
      item('d')
    ];

    it('keeps the anchor in place and exposes no overflow when everything fits', () => {
      mount(left(), 'left');
      fitSlots(5);
      expect(buttonIcons()).toEqual([
        'icon_a',
        'icon_b',
        'more_horiz',
        'icon_c',
        'icon_d'
      ]);
      expect(fixture.componentInstance.overflow()).toEqual([]);
    });

    it('moves the anchor to the last slot and exposes the hidden items for its menu', () => {
      mount(left(), 'left');
      fitSlots(3);
      expect(buttonIcons()).toEqual(['icon_a', 'icon_b', 'more_horiz']);
      expect(fixture.componentInstance.overflow().map((i) => i.id)).toEqual([
        'c',
        'd'
      ]);
    });

    it('keeps a disabled anchor usable while it holds an enabled item', () => {
      const items = left();
      items[2] = { ...items[2], disabled: true };
      mount(items, 'left');
      fitSlots(3);
      expect(lastButton().disabled).toBe(false);

      fixture.componentRef.setInput(
        'items',
        items.map((i) => ({ ...i, disabled: true }))
      );
      fixture.detectChanges();
      expect(lastButton().disabled).toBe(true);
    });
  });
});
