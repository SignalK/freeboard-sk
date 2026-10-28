import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SymbolService } from './symbols.service';

/**
 * load() runs at start-up and again after a login. On a server that refuses
 * anonymous reads the first load fails and only the second returns the
 * provider symbols, so consumers that cache an override (the own-vessel layer,
 * #1202) need a signal that changes on every load, not just the first.
 */
describe('SymbolService reloads', () => {
  const vesselSelf = {
    uuid: 'kip-vessel-self',
    name: 'Own Vessel',
    url: '/plugin/self.svg',
    mediaType: 'image/svg+xml',
    alias: ['fsk:vessel-self']
  };

  const service = (responses: Array<() => Observable<unknown>>) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppFacade, useValue: { skApiVersion: 2 } },
        {
          provide: SignalKClient,
          useValue: {
            api: {
              get: () => (responses.shift() as () => Observable<unknown>)()
            }
          }
        }
      ]
    });
    return TestBed.inject(SymbolService);
  };

  it('signals each load, so a login that brings an override is seen', async () => {
    const symbols = service([
      () => throwError(() => ({ status: 401 })),
      () => of({ [vesselSelf.uuid]: vesselSelf })
    ]);

    await symbols.load();
    expect(symbols.revision()).toBe(1);
    expect(symbols.hasExternalVersion('vessel-self')).toBe(false);

    await symbols.load();
    expect(symbols.revision()).toBe(2);
    expect(symbols.hasExternalVersion('vessel-self')).toBe(true);
  });
});
