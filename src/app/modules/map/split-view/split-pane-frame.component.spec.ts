import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import { PaneChoice } from 'src/app/modules/plotterext/types';
import { SplitViewService } from './split-view.service';
import { SplitPaneFrameComponent } from './split-pane-frame.component';

describe('SplitPaneFrameComponent', () => {
  const choice: PaneChoice = {
    extension: 'radar-plugin',
    extensionName: 'Radar',
    panel: {
      id: 'ppi',
      title: 'Radar',
      type: 'iframe',
      url: '/plugins/radar/viewer.html',
      pane: true
    }
  };

  const setup = () => {
    const detach = vi.fn();
    const ext = {
      resolveAssetUrl: (url: string) => `http://boat.local${url}`,
      attachPanel: vi.fn(() => detach)
    };
    const split = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [SplitPaneFrameComponent],
      providers: [
        { provide: PlotterExtensionService, useValue: ext },
        { provide: SplitViewService, useValue: split }
      ]
    });
    const fixture = TestBed.createComponent(SplitPaneFrameComponent);
    fixture.componentRef.setInput('choice', choice);
    fixture.detectChanges();
    return { fixture, ext, split, detach };
  };

  it("loads the panel's page, named by its title", () => {
    const { fixture } = setup();
    const iframe = (fixture.nativeElement as HTMLElement).querySelector(
      'iframe'
    )!;
    expect(iframe.getAttribute('src')).toBe(
      'http://boat.local/plugins/radar/viewer.html'
    );
    expect(iframe.title).toBe('Radar');
  });

  it('puts the page on the bus as a panel of its extension', () => {
    const { fixture, ext } = setup();
    const iframe = (fixture.nativeElement as HTMLElement).querySelector(
      'iframe'
    );
    expect(ext.attachPanel).toHaveBeenCalledWith(
      iframe,
      expect.objectContaining({
        extension: 'radar-plugin',
        panel: choice.panel
      })
    );
  });

  it('closes the split view when the panel closes itself', () => {
    const { ext, split } = setup();
    const [, opts] = ext.attachPanel.mock.calls[0] as unknown as [
      HTMLIFrameElement,
      { close: () => void }
    ];
    opts.close();
    expect(split.close).toHaveBeenCalled();
  });

  it('leaves the bus when the pane goes', () => {
    const { fixture, detach } = setup();
    fixture.destroy();
    expect(detach).toHaveBeenCalled();
  });
});
