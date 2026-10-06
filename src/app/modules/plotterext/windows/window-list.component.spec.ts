import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlotterExtensionService } from '../plotterext.service';
import { ExtWindowListComponent } from './window-list.component';
import { ExtWindowService } from './window.service';
import { WindowChange } from './types';
import { extWindow } from './testing';

describe('ExtWindowListComponent', () => {
  let fixture: ComponentFixture<ExtWindowListComponent>;
  let service: ExtWindowService;
  let changes: WindowChange[];

  const shown = extWindow({ id: 'a', title: 'Camera' });
  const hidden = extWindow({
    id: 'b',
    title: 'Sounder',
    visible: false,
    collapsed: true,
    userClose: 'hide'
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ExtWindowListComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: PlotterExtensionService,
          useValue: {
            manifests: signal({ 'ext-a': { name: 'Wi-Fish' } })
          }
        }
      ]
    });
    service = TestBed.inject(ExtWindowService);
    service.windows.set([shown, hidden]);
    service.zOrder.set(['b', 'a']);
    changes = [];
    service.changes.subscribe((c) => changes.push(c));
    fixture = TestBed.createComponent(ExtWindowListComponent);
    fixture.detectChanges();
  });

  /** Open the list, then the actions of the window titled `title`. */
  const actionsFor = (title: string) => {
    fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger)
      .openMenu();
    fixture.detectChanges();
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    ).find((b) => b.textContent.includes(title));
    item.click();
    fixture.detectChanges();
    return (label: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item'))
        .find((b) => b.textContent.trim().endsWith(label))
        .click();
  };

  it('lists every window, hidden ones included, with its extension', () => {
    fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger)
      .openMenu();
    fixture.detectChanges();
    const text = Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    ).map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    expect(text).toEqual([
      'web_assetCamera Wi-Fish',
      'visibility_offSounder Wi-Fish · hidden'
    ]);
  });

  it('Show expands, shows and raises a hidden window', () => {
    actionsFor('Sounder')('Show');
    const w = service.get('b');
    expect(w.visible).toBe(true);
    expect(w.collapsed).toBe(false);
    expect(service.zOrder().at(-1)).toBe('b');
  });

  it('Close really closes, even a window whose own control only hides it', () => {
    actionsFor('Sounder')('Close');
    expect(service.get('b')).toBeUndefined();
    expect(changes).toContainEqual({
      extension: 'ext-a',
      event: 'window.closed',
      payload: { windowId: 'b', reason: 'user' }
    });
  });
});
