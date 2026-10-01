import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppFacade } from './app.facade';
import { beforeEach, expect, describe, it, vi } from 'vitest';
import '@vitest/web-worker';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';
import { WritableSignal } from '@angular/core';
import { RadarAPIService } from './modules/radar/radar-api.service';
import { InfoPanelFacade } from './modules/info-panel/info-panel.facade';

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

  describe('starting a route that is not displayed on the map', () => {
    type Internals = {
      activateRoute: (id: string) => Promise<void>;
      app: {
        data: { vessels: { self: { position: number[]; heading: number } } };
        parseHttpErrorResponse: (err: unknown) => void;
      };
      skres: {
        fromCache: (collection: string, id: string) => unknown;
        fromServer: (collection: string, id: string) => Promise<unknown>;
      };
      course: { activateRoute: (id: string, pointIndex?: number) => void };
    };

    const setup = () => {
      const c = TestBed.createComponent(AppComponent)
        .componentInstance as unknown as Internals;
      // Heading north from just south of the route.
      c.app.data.vessels.self.position = [24.95, 60.15];
      c.app.data.vessels.self.heading = 0;
      vi.spyOn(c.skres, 'fromCache').mockReturnValue(undefined);
      const activate = vi
        .spyOn(c.course, 'activateRoute')
        .mockImplementation(() => undefined);
      return { c, activate };
    };

    it('starts it at the closest point ahead, read from the server', async () => {
      const { c, activate } = setup();
      const fromServer = vi.spyOn(c.skres, 'fromServer').mockResolvedValue({
        feature: {
          geometry: {
            coordinates: [
              [24.95, 60.18],
              [24.95, 60.16],
              [24.96, 60.2]
            ]
          }
        }
      });

      await c.activateRoute('hidden');

      expect(fromServer).toHaveBeenCalledWith('routes', 'hidden');
      expect(activate).toHaveBeenCalledWith('hidden', 1);
    });

    it('reports a failed fetch and starts nothing', async () => {
      const { c, activate } = setup();
      const failure = new Error('not found');
      vi.spyOn(c.skres, 'fromServer').mockRejectedValue(failure);
      const reported = vi
        .spyOn(c.app, 'parseHttpErrorResponse')
        .mockImplementation(() => undefined);

      await c.activateRoute('gone');

      expect(reported).toHaveBeenCalledWith(failure);
      expect(activate).not.toHaveBeenCalled();
    });
  });
  describe('the route stepper', () => {
    it('heads straight from the vessel for the point it steps to', () => {
      const c = TestBed.createComponent(AppComponent)
        .componentInstance as unknown as {
        routeNextPoint: (pointIndex: number) => void;
        course: {
          rejoinRouteAt: (pointIndex: number) => Promise<boolean>;
          coursePointIndex: (pointIndex: number) => void;
        };
      };
      const rejoin = vi
        .spyOn(c.course, 'rejoinRouteAt')
        .mockResolvedValue(true);
      const alongLeg = vi
        .spyOn(c.course, 'coursePointIndex')
        .mockImplementation(() => undefined);

      c.routeNextPoint(2);

      expect(rejoin).toHaveBeenCalledWith(2);
      expect(alongLeg).not.toHaveBeenCalled();
    });
  });

  describe('the Radar buttons', () => {
    const setup = (fab: 'wpt' | 'radar') => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = TestBed.inject(AppFacade);
      const radarApi = TestBed.inject(RadarAPIService);
      app.uiConfig.update((c) =>
        Object.assign({}, c, { toolbarButtons: true })
      );
      app.featureFlags.update((f) => Object.assign({}, f, { radarApi: true }));
      app.config.display.fab = fab;
      app.data.vessels.showSelf = true;
      const radar = radarApi as unknown as {
        _selectedRadar: WritableSignal<string>;
        _radar: WritableSignal<unknown>;
      };
      radar._selectedRadar.set('radar-1');
      radar._radar.set({
        device: { id: 'radar-1', name: 'Radar' },
        capabilities: { controls: {} },
        controls: new Map()
      });
      vi.spyOn(radarApi, 'hasWebGL', 'get').mockReturnValue(true);
      // The overlay itself needs WebGL, which the test browser lacks; what
      // matters here is whether it is switched on or off.
      const overlay = fixture.componentInstance as unknown as {
        connectRadar: () => void;
        disconnectRadar: () => void;
      };
      const connect = vi
        .spyOn(overlay, 'connectRadar')
        .mockImplementation(() => undefined);
      const disconnect = vi
        .spyOn(overlay, 'disconnectRadar')
        .mockImplementation(() => undefined);
      fixture.detectChanges();
      return {
        fixture,
        infoPanel: TestBed.inject(InfoPanelFacade),
        connect,
        disconnect
      };
    };

    it.each([
      ['button panel', 'wpt', 'button[mattooltip="Radar"]'],
      ['floating action', 'radar', 'radar-button button']
    ] as const)(
      'closes the radar panel with the %s button that opened it',
      (_, fab, selector) => {
        const { fixture, infoPanel, connect, disconnect } = setup(fab);
        const panelShown = () => infoPanel.item()?.type === 'radars';
        const press = () => {
          fixture.debugElement.query(By.css(selector)).nativeElement.click();
          fixture.detectChanges();
        };

        press();
        expect(panelShown()).toBe(true);
        expect(connect).toHaveBeenCalledTimes(1);

        press();
        expect(panelShown()).toBe(false);

        press();
        expect(panelShown()).toBe(true);
        expect(disconnect).not.toHaveBeenCalled();
      }
    );
  });
});
