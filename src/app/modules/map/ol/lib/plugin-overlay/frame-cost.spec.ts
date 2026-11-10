import { describe, expect, it } from 'vitest';
import OlMap from 'ol/Map';
import View from 'ol/View';
import { unByKey } from 'ol/Observable';
import { watchFrameCost } from './frame-cost';

describe('watchFrameCost', () => {
  function rig(measuring = true) {
    const map = new OlMap({ view: new View({ center: [0, 0], zoom: 2 }) });
    let t = 0;
    let on = measuring;
    const reported: number[] = [];
    const keys = watchFrameCost(
      map,
      () => on,
      (ms) => reported.push(ms),
      () => t
    );
    const compose = (ms: number) => {
      map.dispatchEvent('precompose');
      t += ms;
      map.dispatchEvent('postcompose');
    };
    return {
      map,
      reported,
      compose,
      keys,
      setMeasuring: (v: boolean) => (on = v)
    };
  }

  it('reports how long each composition took', () => {
    const { reported, compose } = rig();
    compose(7);
    compose(12);
    expect(reported).toEqual([7, 12]);
  });

  it('reports nothing while not measuring (no frame drawn, not animated)', () => {
    const { reported, compose, setMeasuring } = rig(false);
    compose(30);
    setMeasuring(true);
    compose(5);
    expect(reported).toEqual([5]);
  });

  it('leaves out compositions during a gesture or a view animation', () => {
    const { map, reported, compose } = rig();
    map.getView().setHint(1, 1); // ViewHint.INTERACTING
    compose(40);
    map.getView().setHint(1, -1);
    map.getView().setHint(0, 1); // ViewHint.ANIMATING
    compose(40);
    map.getView().setHint(0, -1);
    compose(3);
    expect(reported).toEqual([3]);
  });

  it('ignores a postcompose without its precompose, and stops when unwatched', () => {
    const { map, reported, compose, keys } = rig();
    map.dispatchEvent('postcompose');
    expect(reported).toEqual([]);
    unByKey(keys);
    compose(9);
    expect(reported).toEqual([]);
  });
});
