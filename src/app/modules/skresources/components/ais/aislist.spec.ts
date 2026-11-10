import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { AISListComponent } from './aislist';
import { SKResourceService } from '../../resources.service';
import { AppFacade } from 'src/app/app.facade';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import { SKStreamFacade } from 'src/app/modules/skstream/skstream.facade';

type ShipTypeRow = { id: number; description: string; icon?: string };

// Each ship type filter row shows the icon the chart draws its vessels with.
describe('AISListComponent ship type filter icons', () => {
  let rows: ShipTypeRow[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AISListComponent,
        { provide: SKResourceService, useValue: {} },
        { provide: AppFacade, useValue: {} },
        { provide: TrackHistoryService, useValue: {} },
        { provide: SKStreamFacade, useValue: {} }
      ]
    });
    rows = (
      TestBed.inject(AISListComponent) as unknown as {
        shipTypes: ShipTypeRow[];
      }
    ).shipTypes;
  });

  it('shows the pleasure craft icon on the Pleasure row', () => {
    const pleasure = rows.find((r) => r.description === 'Pleasure');
    expect(pleasure?.id).toBe(36);
    expect(pleasure?.icon).toBe('ais_active');
  });

  it('gives fishing vessels a row of their own', () => {
    const fishing = rows.find((r) => r.description === 'Fishing');
    expect(fishing?.id).toBe(30);
    expect(fishing?.icon).toBe('ais_fishing');
  });
});
