import { describe, expect, it, vi } from 'vitest';
import { NoteListComponent } from './notelist';

/**
 * "Center Note" says the least zoom a note needs, whatever the main chart's
 * zoom: the active pane of the split view may be further out than the main
 * chart, and is zoomed in to it there. Exercised on a bare prototype instance:
 * `emitCenter` reads only the config and emits.
 */
describe('NoteListComponent: centring a note', () => {
  it('asks for the notes zoom even when the main chart is further in', () => {
    const list = Object.create(NoteListComponent.prototype);
    list.app = {
      config: { map: { zoomLevel: 15 }, resources: { notes: { minZoom: 10 } } }
    };
    list.pan = { emit: vi.fn() };

    list.emitCenter({ longitude: 23.5, latitude: 60.1 });

    expect(list.pan.emit).toHaveBeenCalledWith({
      center: [23.5, 60.1],
      zoomLevel: 10
    });
  });
});
