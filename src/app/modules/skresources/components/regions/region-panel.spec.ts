import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, it, expect } from 'vitest';
import { MatDialog } from '@angular/material/dialog';

import { RegionPanel } from './region-panel';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from '../../resources.service';
import { SKResourceGroupService } from '../groups/groups.service';
import { SKRegion } from '../../resource-classes';

/**
 * "Add Note" on a region opens the note editor for a note linked to that
 * region, so the new note is listed under the region it was added from.
 */
describe('RegionPanel add note', () => {
  let editorRequests: unknown[];

  beforeEach(() => {
    TestBed.resetTestingModule();
    editorRequests = [];
    TestBed.overrideComponent(RegionPanel, {
      set: { template: '', imports: [] }
    });
    TestBed.configureTestingModule({
      imports: [RegionPanel],
      providers: [
        {
          provide: AppFacade,
          useValue: { config: { resources: { notes: { minZoom: 10 } } } }
        },
        {
          provide: SKResourceService,
          useValue: {
            getRelatedNotes: async () => [],
            showNoteEditor: (e: unknown) => editorRequests.push(e)
          }
        },
        { provide: SKResourceGroupService, useValue: { with: async () => [] } },
        { provide: MatDialog, useValue: {} }
      ]
    });
  });

  it('links the new note to the region', () => {
    const fixture = TestBed.createComponent(RegionPanel);
    fixture.componentRef.setInput('id', 'reg-1');
    fixture.componentRef.setInput('related', '');
    fixture.componentRef.setInput('region', new SKRegion());
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { addNote(): void }).addNote();

    expect(editorRequests).toEqual([
      { type: 'region', href: { id: 'reg-1', exists: true } }
    ]);
  });
});
