import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppFacade } from './app.facade';
import { beforeEach, expect, describe, it, vi } from 'vitest';
import '@vitest/web-worker';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('opens the feature browser from the main menu\'s "What\'s New" item', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const menuButton = fixture.debugElement
      .queryAll(By.directive(MatMenuTrigger))
      .find((de) => de.nativeElement.getAttribute('mattooltip') === 'Menu');
    expect(menuButton).toBeDefined();

    menuButton?.injector.get(MatMenuTrigger).openMenu();
    fixture.detectChanges();

    const item = Array.from(
      document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')
    ).find((el) => el.textContent?.includes("What's New"));
    expect(item).toBeDefined();

    const openFeatureBrowser = vi
      .spyOn(
        fixture.componentInstance as unknown as {
          openFeatureBrowser: () => Promise<void>;
        },
        'openFeatureBrowser'
      )
      .mockResolvedValue(undefined);
    item?.click();
    expect(openFeatureBrowser).toHaveBeenCalled();
  });

  it('drops the Instruments toolbar slot when no instruments app is selected', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = TestBed.inject(AppFacade);
    app.uiConfig.update((c) => Object.assign({}, c, { toolbarButtons: true }));

    app.config.display.plugins.instruments = '/@signalk/instrumentpanel';
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('.instrumentPanelToggle button'))
    ).not.toBeNull();

    // Settings -> Display -> Select Instruments App: "None" stores a null url.
    app.config.display.plugins.instruments = null;
    fixture.detectChanges();
    // The whole slot goes, not just the button: .buttonPanelItem is a fixed
    // 48px, so leaving it behind would hold an empty gap in the toolbar.
    expect(
      fixture.debugElement.query(By.css('.instrumentPanelToggle'))
    ).toBeNull();
  });

  it('keeps the Instruments toolbar slot while the panel is open', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = TestBed.inject(AppFacade);
    app.uiConfig.update((c) => Object.assign({}, c, { toolbarButtons: true }));
    app.config.display.plugins.instruments = '/@signalk/instrumentpanel';
    fixture.detectChanges();

    app.instrumentPanel.set({ open: true, activate: true });
    fixture.detectChanges();

    // Transient conditions hide the button but hold its place, so the buttons
    // below it do not shift up and down as the user works.
    expect(
      fixture.debugElement.query(By.css('.instrumentPanelToggle'))
    ).not.toBeNull();
    expect(
      fixture.debugElement.query(By.css('.instrumentPanelToggle button'))
    ).toBeNull();
  });

  it('sandboxes the instrument panel iframe with form submission allowed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // ngOnInit resets `activate` from config, so open the panel after it runs.
    TestBed.inject(AppFacade).instrumentPanel.set({
      open: true,
      activate: true
    });
    fixture.detectChanges();

    // The only iframe inside the sidenav is the instrument panel; the plotter
    // extension frames render outside mat-sidenav-container.
    const iframe = fixture.debugElement.query(By.css('mat-sidenav iframe'))
      ?.nativeElement as HTMLIFrameElement | undefined;
    expect(iframe).toBeDefined();

    // jsdom neither enforces sandbox nor reflects it onto the `sandbox`
    // DOMTokenList, so read the attribute. Without allow-forms, Chrome blocks
    // form submission from the embedded webapp, making it impossible to sign in.
    // Asserting the exact set also catches a relaxation, such as a later change
    // granting allow-top-navigation.
    const sandbox = (iframe?.getAttribute('sandbox') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(sandbox.sort()).toEqual([
      'allow-forms',
      'allow-same-origin',
      'allow-scripts'
    ]);
  });
});
