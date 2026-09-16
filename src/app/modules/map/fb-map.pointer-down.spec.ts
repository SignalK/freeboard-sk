import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';

// onMapPointerDown is exercised on a bare prototype instance: the component's
// constructor wires up a dozen injected services none of which this handler
// touches, and a TestBed fixture would import the whole map template graph.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.mouse = signal({ coords: [0, 0] });
  cmp.contextMenuPosition = { x: '0px', y: '0px' };
  return cmp;
};

describe('FBMapComponent.onMapPointerDown', () => {
  it('anchors the context menu at the DOM event pointer position', () => {
    // OL's MapBrowserEvent carries no clientX/clientY of its own — they live
    // on the wrapped DOM event. Read off the OL event they were undefined, so
    // the anchor was set to 'undefinedpx'.
    const cmp = bareComponent();

    cmp.onMapPointerDown({
      lonlat: [-80.1, 25.7],
      worldOffset: 0,
      originalEvent: { clientX: 120, clientY: 45 }
    });

    expect(cmp.contextMenuPosition).toEqual({ x: '120px', y: '45px' });
    expect(cmp.mouse().coords).toEqual([-80.1, 25.7]);
  });
});
