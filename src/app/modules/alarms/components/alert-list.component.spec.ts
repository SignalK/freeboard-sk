import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { describe, it, expect, beforeEach } from 'vitest';

import { AlertListComponent } from './alert-list.component';
import { AppFacade } from 'src/app/app.facade';
import { NotificationManager } from '../notification-manager';

/**
 * A swipe over the alert list has to scroll it. A `cdkDrag` without a live
 * handle starts a drag from anywhere on the popup and claims every pointer move,
 * so on a touchscreen the swipe moved the popup and alerts below the fold could
 * not be reached. Only the title bar may move the popup.
 */
describe('AlertListComponent — drag handle', () => {
  const alert = (n: number) => [
    `notifications.test.${n}`,
    {
      path: `notifications.test.${n}`,
      message: `Test alert ${n}`,
      priority: 'alarm',
      icon: { class: '', svgIcon: '', name: 'warning' }
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            featureFlags: signal({ notificationApi: true }),
            config: { display: { muteSound: false } }
          }
        },
        { provide: NotificationManager, useValue: {} }
      ]
    });
  });

  it('drags the popup by its title bar only', () => {
    const fixture = TestBed.createComponent(AlertListComponent);
    fixture.componentRef.setInput(
      'alerts',
      Array.from({ length: 15 }, (_, i) => alert(i))
    );
    fixture.detectChanges();

    const handles = fixture.debugElement.queryAll(By.directive(CdkDragHandle));
    expect(handles).toHaveLength(1);
    expect(handles[0].nativeElement.classList).toContain('title');
    expect(
      fixture.debugElement.query(By.directive(CdkDrag)).nativeElement
    ).toBe(fixture.nativeElement.querySelector('.alert-list-main'));
  });
});
