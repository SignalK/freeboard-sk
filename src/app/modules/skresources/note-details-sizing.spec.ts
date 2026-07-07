import { describe, it, expect } from 'vitest';
import { SKResourceService } from './resources.service';
import { NoteDialog } from './components/notes/note-dialog';

/**
 * Regression test for #462 — the read-only "Note Details" dialog must open with
 * content-fitting size options so a wide embedded graphic (e.g. a tide-station
 * graph) is shown as large as possible up to a cap, instead of being clipped.
 *
 * The layout itself (fit-content growth, image scaling) is CSS and can't be
 * asserted under jsdom, which does no layout — so this guards the sizing *config*
 * that drives it, the part most likely to be silently dropped in a refactor.
 *
 * `showNoteDetails` only reads `this.app.sIsFetching`, `this.fromServer` and
 * `this.dialog`, so exercise it on a bare prototype instance — no Angular DI
 * (same approach as resources-charts-opacity.spec.ts).
 */
type CapturedDialogConfig = {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  data?: { editable?: boolean };
};

type Captured = { component?: unknown; config?: CapturedDialogConfig };

function svcCapturingDialogOpen(captured: Captured) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(svc as unknown as Record<string, unknown>, {
    app: { sIsFetching: { set: () => undefined } },
    fromServer: async () => ({ name: 'X', mimeType: '', properties: {} }),
    dialog: {
      open: (component: unknown, config: CapturedDialogConfig) => {
        captured.component = component;
        captured.config = config;
        return { afterClosed: () => ({ subscribe: () => undefined }) };
      }
    }
  });
  return svc;
}

describe('Note Details dialog sizing (#462)', () => {
  it('opens the read-only NoteDialog with content-fitting size options', async () => {
    const captured: Captured = {};
    await svcCapturingDialogOpen(captured).showNoteDetails('note-1');

    expect(captured.component).toBe(NoteDialog);
    expect(captured.config).toMatchObject({
      width: 'fit-content',
      minWidth: '350px',
      maxWidth: '90vw'
    });
    // read-only view is what the graphic-clipping report is about
    expect(captured.config?.data?.editable).toBe(false);
  });
});
