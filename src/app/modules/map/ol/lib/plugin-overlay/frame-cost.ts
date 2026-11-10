import type OlMap from 'ol/Map';
import type { EventsKey } from 'ol/events';

/**
 * Time each map composition (`precompose` to `postcompose`) and report it
 * while `measuring()` holds. Compositions during a gesture or a view
 * animation are left out: their cost is the user's, not the overlay's.
 * Only composition is timed, not the work of receiving a frame.
 */
export function watchFrameCost(
  map: OlMap,
  measuring: () => boolean,
  report: (ms: number) => void,
  now: () => number = () => performance.now()
): EventsKey[] {
  let start: number | undefined;
  return [
    map.on('precompose', () => (start = now())),
    map.on('postcompose', () => {
      const began = start;
      start = undefined;
      const view = map.getView();
      if (
        began === undefined ||
        view.getInteracting() ||
        view.getAnimating() ||
        !measuring()
      ) {
        return;
      }
      report(now() - began);
    })
  ];
}
