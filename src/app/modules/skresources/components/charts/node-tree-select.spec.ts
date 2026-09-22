import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { NodeTreeSelect } from './node-tree-select';
import { LayerNode } from './maplib';
import { AppFacade } from 'src/app/app.facade';

/**
 * #797: the WMS layer tree labels nodes by capabilities `Title`, and many
 * servers give siblings identical titles with distinct `Name`s. The name is
 * what ends up in the chart's `layers` array, so show it beside the title
 * whenever it differs.
 */
describe('NodeTreeSelect — layer name beside title', () => {
  let fixture: ComponentFixture<NodeTreeSelect>;

  const node = (
    name: string,
    title: string | undefined,
    children?: LayerNode[]
  ): LayerNode => ({
    name,
    title,
    description: '',
    selected: false,
    parent: null,
    children
  });

  const mount = async (layers: LayerNode[]) => {
    TestBed.configureTestingModule({
      imports: [NodeTreeSelect],
      providers: [provideNoopAnimations(), { provide: AppFacade, useValue: {} }]
    });
    fixture = TestBed.createComponent(NodeTreeSelect);
    fixture.componentRef.setInput('layers', layers);
    fixture.componentRef.setInput('expand', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const labels = (): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('mat-checkbox') as HTMLElement[]
    ).map((el) => el.textContent.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('appends the name to siblings that share a title', async () => {
    await mount([
      node('nexrad-n0q-900913', 'NEXRAD BASE REFLECT (GOOGLE)', [
        node('nexrad-n0q-900913-conus', 'NEXRAD BASE REFLECT (GOOGLE)'),
        node('nexrad-n0q-900913-ak', 'NEXRAD BASE REFLECT (GOOGLE)')
      ])
    ]);
    expect(labels()).toEqual([
      'NEXRAD BASE REFLECT (GOOGLE) (nexrad-n0q-900913)',
      'NEXRAD BASE REFLECT (GOOGLE) (nexrad-n0q-900913-conus)',
      'NEXRAD BASE REFLECT (GOOGLE) (nexrad-n0q-900913-ak)'
    ]);
  });

  it('shows only the title when the name repeats it or is absent', async () => {
    await mount([
      // container layer: WMS groups often have a Title but no Name
      node('', 'IEM WMS Service', [node('OpenSeaMap', 'OpenSeaMap')])
    ]);
    expect(labels()).toEqual(['IEM WMS Service', 'OpenSeaMap']);
  });

  it('falls back to the name alone when there is no title', async () => {
    await mount([node('n0q', undefined)]);
    expect(labels()).toEqual(['n0q']);
  });
});

/**
 * #808: a layer that advertises a time dimension gets a `schedule` marker so
 * the user can tell which rows will give the chart a Time control.
 */
describe('NodeTreeSelect — time-varying indicator', () => {
  let fixture: ComponentFixture<NodeTreeSelect>;

  const T0 = '2026-09-18T00:00:00.000Z';
  const T1 = '2026-09-18T12:00:00.000Z';

  const node = (
    name: string,
    time?: LayerNode['time'],
    children?: LayerNode[]
  ): LayerNode => ({
    name,
    description: '',
    selected: false,
    parent: null,
    time: time ?? null,
    children
  });

  const mount = async (layers: LayerNode[]) => {
    TestBed.configureTestingModule({
      imports: [NodeTreeSelect],
      providers: [provideNoopAnimations(), { provide: AppFacade, useValue: {} }]
    });
    fixture = TestBed.createComponent(NodeTreeSelect);
    fixture.componentRef.setInput('layers', layers);
    fixture.componentRef.setInput('expand', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const markers = (): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('mat-icon._ap-layer-time')
    );

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('marks only the layers with a usable time dimension', async () => {
    await mount([
      node('group', undefined, [
        node('radar', { from: T0, to: T1, interval: 300000, current: T1 }),
        node('coastline'),
        // declared but unusable: no range at all
        node('broken', { from: null, to: null, current: null })
      ])
    ]);
    expect(markers().length).toBe(1);
    expect(markers()[0].textContent.trim()).toBe('schedule');
    // It prefixes the label so a wrapped row cannot mis-attribute it.
    const label = markers()[0].closest('mat-checkbox') as HTMLElement;
    expect(label.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'schedule radar'
    );
  });

  it('summarises the dimension in the marker tooltip', async () => {
    await mount([
      node('radar', { from: T0, to: T1, interval: 300000, current: T1 })
    ]);
    // The tooltip text is what the directive was given.
    const tooltip = fixture.debugElement
      .queryAll((de) => de.name === 'mat-icon')
      .map((de) => de.injector.get(MatTooltip, null))
      .find((t) => t?.message);
    expect(tooltip?.message).toBe('Time-varying: every 5 min, last 12 h');
  });
});
