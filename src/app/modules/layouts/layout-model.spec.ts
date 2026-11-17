import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../app.config';
import type { PlotterExtensionWidget } from '../../types';
import {
  applyContent,
  contentOf,
  findByName,
  findDefault,
  isModified,
  LayoutContent,
  parseSavedLayout,
  parseWorkingCopy,
  sameContent,
  SavedLayout
} from './layout-model';

const widget = (
  instanceId: string,
  extension = 'ext'
): PlotterExtensionWidget => ({
  instanceId,
  extension,
  widget: 'gauge',
  anchor: 'tr',
  col: 0,
  row: 0
});

const saved = (name: string, updated?: string): SavedLayout => ({
  name,
  revision: 1,
  updated,
  widgets: [],
  instances: {}
});

describe('layout content in the config', () => {
  it('takes the widgets and the settings of placed widgets only', () => {
    const config = defaultConfig();
    config.plotterExtensions.widgets = [widget('a')];
    config.plotterExtensions.state = {
      ext: {
        extension: { theme: 'dark' },
        instances: { a: { path: 'x' }, gone: { path: 'y' }, empty: {} }
      }
    };

    expect(contentOf(config)).toEqual({
      widgets: [widget('a')],
      instances: { ext: { a: { path: 'x' } } }
    });
  });

  it('is a copy the config does not share', () => {
    const config = defaultConfig();
    config.plotterExtensions.widgets = [widget('a')];
    const content = contentOf(config);
    content.widgets[0].col = 1;

    expect(config.plotterExtensions.widgets[0].col).toBe(0);
  });

  it('applies a layout over the widgets and instance settings, keeping extension-wide ones', () => {
    const config = defaultConfig();
    config.plotterExtensions.widgets = [widget('a')];
    config.plotterExtensions.state = {
      ext: { extension: { theme: 'dark' }, instances: { a: { path: 'x' } } },
      other: { instances: { z: { v: 1 } } }
    };

    applyContent(config, {
      widgets: [widget('b')],
      instances: { ext: { b: { path: 'y' } } }
    });

    expect(config.plotterExtensions.widgets).toEqual([widget('b')]);
    expect(config.plotterExtensions.state).toEqual({
      ext: { extension: { theme: 'dark' }, instances: { b: { path: 'y' } } }
    });
  });
});

describe('comparing layouts', () => {
  const a: LayoutContent = {
    widgets: [widget('a'), widget('b')],
    instances: { ext: { a: { x: 1, y: 2 } } }
  };

  it('ignores widget order and key order', () => {
    expect(
      sameContent(a, {
        widgets: [widget('b'), widget('a')],
        instances: { ext: { a: { y: 2, x: 1 } } }
      })
    ).toBe(true);
  });

  it('sees a moved widget and a changed setting', () => {
    expect(
      sameContent(a, {
        ...a,
        widgets: [{ ...widget('a'), col: 1 }, widget('b')]
      })
    ).toBe(false);
    expect(
      sameContent(a, { ...a, instances: { ext: { a: { x: 1, y: 3 } } } })
    ).toBe(false);
  });

  it('calls a linked copy modified once it differs from what it was loaded from', () => {
    const link = { id: 'l', name: 'Helm', revision: 1, base: a };

    expect(isModified({ content: a, link })).toBe(false);
    expect(isModified({ content: { ...a, widgets: [] }, link })).toBe(true);
    expect(isModified({ content: { ...a, widgets: [] }, link: null })).toBe(
      false
    );
  });
});

describe('finding layouts by name', () => {
  it('finds "Default" in any case, the latest saved of several', () => {
    const layouts = {
      old: saved('default', '2026-01-01T00:00:00Z'),
      helm: saved('Helm'),
      new: saved(' DEFAULT ', '2026-06-01T00:00:00Z')
    };

    expect(findDefault(layouts)?.[0]).toBe('new');
    expect(findDefault({ helm: saved('Helm') })).toBeUndefined();
  });

  it('finds a layout by name in any case', () => {
    expect(findByName({ h: saved('Helm') }, ' helm')?.[0]).toBe('h');
    expect(findByName({ h: saved('Helm') }, 'Chart table')).toBeUndefined();
  });
});

describe('reading stored layouts', () => {
  it('drops malformed widgets and settings', () => {
    expect(
      parseSavedLayout({
        name: 'Helm',
        revision: 2,
        widgets: [widget('a'), { instanceId: 'b' }, null],
        instances: { ext: { a: { x: 1 }, b: 'bad' }, bad: [] }
      })
    ).toEqual({
      name: 'Helm',
      revision: 2,
      updated: undefined,
      widgets: [widget('a')],
      instances: { ext: { a: { x: 1 } } }
    });
  });

  it('rejects what is not a layout', () => {
    expect(parseSavedLayout({ name: 'Helm', widgets: [] })).toBeNull();
    expect(parseSavedLayout('Helm')).toBeNull();
  });

  it('reads a working copy, dropping a broken link', () => {
    const content = { widgets: [widget('a')], instances: {} };

    expect(parseWorkingCopy({ content, link: { id: 'x' } })).toEqual({
      content,
      link: null
    });
    expect(parseWorkingCopy({ link: null })).toBeNull();
  });
});
