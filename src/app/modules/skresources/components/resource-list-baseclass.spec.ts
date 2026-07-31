import { TestBed } from '@angular/core/testing';
import { effect, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { ResourceListBase } from './resource-list-baseclass';
import type { SKResourceService } from '../resources.service';

/**
 * `doFilter()` writes the `filteredList` signal and then recomputes the select
 * all/some/none flags from it via `alignSelections()`. A tracked read there
 * would make any effect ending in `doFilter()` a dependent of its own write:
 * one such effect is harmless, but two re-trigger each other until the heap is
 * exhausted (#617).
 *
 * These tests stand up a minimal subclass with two effects that both call
 * `doFilter()` *without* an `untracked()` wrapper — the mistake the base class
 * has to survive — and assert that filtering settles and the selection flags
 * stay correct.
 *
 * `doFilter()` trips after a small number of calls so a regression fails as an
 * assertion rather than taking the vitest worker down with an out-of-memory
 * crash.
 */
const RUNAWAY = 25;

type Entry = [string, { name: string }, boolean];

const entry = (id: string, checked: boolean): Entry => [
  id,
  { name: id },
  checked
];

class TestList extends ResourceListBase {
  filterRuns = 0;
  readonly triggerA = signal(0);
  readonly triggerB = signal(0);

  constructor() {
    super('routes', {} as SKResourceService);
    // Deliberately untracked-free: the base class must make these safe.
    effect(() => {
      this.triggerA();
      this.doFilter();
    });
    effect(() => {
      this.triggerB();
      this.doFilter();
    });
  }

  seed(entries: Entry[]) {
    this.fullList.push(...entries);
  }

  checkAll() {
    this.fullList.forEach((e) => (e[2] = true));
  }

  get list(): Entry[] {
    return this.filteredList();
  }

  get flags() {
    return { all: this.allSel, some: this.someSel };
  }

  protected override doFilter() {
    if (++this.filterRuns > RUNAWAY) {
      throw new Error('doFilter() ran away — alignSelections() feedback loop');
    }
    super.doFilter();
  }
}

describe('ResourceListBase — alignSelections() takes no reactive dependency (#623)', () => {
  let comp: TestList;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    comp = TestBed.runInInjectionContext(() => new TestList());
    comp.seed([entry('a', true), entry('b', false)]);
  });

  it('settles after both effects have run once', () => {
    TestBed.tick();

    expect(comp.filterRuns).toBe(2);
  });

  it('re-filters once when a single effect is triggered', () => {
    TestBed.tick();
    comp.filterRuns = 0;

    comp.triggerA.set(1);
    TestBed.tick();

    expect(comp.filterRuns).toBe(1);
  });

  it('re-filters once per effect when both are triggered', () => {
    TestBed.tick();
    comp.filterRuns = 0;

    comp.triggerA.set(1);
    comp.triggerB.set(1);
    TestBed.tick();

    expect(comp.filterRuns).toBe(2);
  });

  it('still derives the select all/some/none flags from the filtered list', () => {
    TestBed.tick();

    // One of two entries selected → "some".
    expect(comp.list.map((e) => e[0])).toEqual(['a', 'b']);
    expect(comp.flags).toEqual({ all: false, some: true });
  });

  it('reports all-selected once every entry is checked', () => {
    TestBed.tick();
    expect(comp.flags).toEqual({ all: false, some: true });

    comp.checkAll();
    comp.triggerA.set(1);
    TestBed.tick();

    expect(comp.flags).toEqual({ all: true, some: false });
  });
});
