import { SimpleChange } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { Map as OlMap } from 'ol';
import { OverlayComponent } from './overlay.component';

/**
 * An overlay can be shown on another map than the one it is declared in: a
 * popover for a tap on the split view's second pane opens in that pane, and
 * goes back to its own chart when the pane closes.
 */
describe('OverlayComponent: the map it shows on', () => {
  const overlayOn = (own: OlMap, targetMap?: OlMap) => {
    const overlay = new OverlayComponent(
      { detach: () => undefined } as never,
      { nativeElement: document.createElement('div') },
      { getMap: () => own } as never
    );
    overlay.targetMap = targetMap;
    overlay.ngOnInit();
    const moved: number[] = [];
    overlay.repositioned.subscribe(() => moved.push(1));
    return { overlay, moved };
  };
  const retarget = (overlay: OverlayComponent, map: OlMap | undefined) => {
    const before = overlay.targetMap;
    overlay.targetMap = map;
    overlay.ngOnChanges({
      targetMap: new SimpleChange(before, map, false)
    });
  };

  it('opens on the map it is given', () => {
    const [own, pane] = [new OlMap(), new OlMap()];
    overlayOn(own, pane);

    expect(pane.getOverlays().getLength()).toBe(1);
    expect(own.getOverlays().getLength()).toBe(0);
  });

  it('moves between maps, and back to its own', () => {
    const [own, pane] = [new OlMap(), new OlMap()];
    const { overlay, moved } = overlayOn(own);

    retarget(overlay, pane);
    expect(own.getOverlays().getLength()).toBe(0);
    expect(pane.getOverlays().getLength()).toBe(1);
    expect(moved.length).toBe(1);

    retarget(overlay, undefined);
    expect(pane.getOverlays().getLength()).toBe(0);
    expect(own.getOverlays().getLength()).toBe(1);
  });

  it('follows the moves of the map it is on, not the one it left', () => {
    const [own, pane] = [new OlMap(), new OlMap()];
    const { overlay, moved } = overlayOn(own);
    retarget(overlay, pane);
    moved.length = 0;

    own.dispatchEvent('moveend');
    own.dispatchEvent('postrender');
    expect(moved.length).toBe(0);

    pane.dispatchEvent('moveend');
    pane.dispatchEvent('postrender');
    expect(moved.length).toBe(1);
  });

  it('leaves the map it is on when it goes', () => {
    const [own, pane] = [new OlMap(), new OlMap()];
    const { overlay } = overlayOn(own, pane);

    overlay.ngOnDestroy();

    expect(pane.getOverlays().getLength()).toBe(0);
  });
});
