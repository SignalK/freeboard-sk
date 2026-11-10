import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { AISListComponent } from './aislist';
import { SKResourceService } from '../../resources.service';
import { AppFacade } from 'src/app/app.facade';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';

type ShipTypeRow = { id: number; description: string; icon?: string };

// The ship type filter's 30 row covers fishing, sailing and pleasure craft.
// Fishing (30) has its own icon now, so the row must not show it (#1236).
describe('AISListComponent ship type filter icons', () => {
  let rows: ShipTypeRow[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AISListComponent,
        { provide: SKResourceService, useValue: {} },
        { provide: AppFacade, useValue: {} },
        { provide: TrackHistoryService, useValue: {} }
      ]
    });
    rows = (
      TestBed.inject(AISListComponent) as unknown as {
        shipTypes: ShipTypeRow[];
      }
    ).shipTypes;
  });

  it('shows the pleasure craft icon on the Pleasure row', () => {
    const pleasure = rows.find((r) => r.id === 30);
    expect(pleasure?.description).toBe('Pleasure');
    expect(pleasure?.icon).toBe('ais_active');
  });

  it('does not show the fishing icon on any row', () => {
    expect(rows.map((r) => r.icon)).not.toContain('ais_fishing');
  });
});
