import { describe, expect, it } from 'vitest';

import {
  actionButtonLabel,
  actionButtonOptions,
  extensionButtonId,
  takeActionButton
} from './action-button';

const BUILT_IN = new Map([
  ['wpt', 'Waypoint at vessel'],
  ['pob', 'Person Overboard']
]);

const items = [
  { id: 'measure' },
  { id: 'ext:@acme/poi/search' },
  { id: 'ext:@acme/poi/clear' }
];

describe('extension buttons as the Action Button', () => {
  it('names a button by its extension and id, scoped package names included', () => {
    expect(extensionButtonId('@acme/poi', 'search')).toBe(
      'ext:@acme/poi/search'
    );
  });

  it('labels a choice with the extension name and the button title', () => {
    expect(actionButtonLabel('POI Search', 'Search nearby')).toBe(
      'POI Search: Search nearby'
    );
    expect(actionButtonLabel('POI Search', '')).toBe('POI Search');
    expect(actionButtonLabel('Companion Apps', 'Companion Apps')).toBe(
      'Companion Apps'
    );
  });

  it('moves the chosen extension button out of the toolbar', () => {
    const { actionButton, toolbar } = takeActionButton(
      items,
      'ext:@acme/poi/search'
    );
    expect(actionButton).toEqual({ id: 'ext:@acme/poi/search' });
    expect(toolbar.map((i) => i.id)).toEqual([
      'measure',
      'ext:@acme/poi/clear'
    ]);
  });

  it('leaves the toolbar alone for a built-in action', () => {
    const { actionButton, toolbar } = takeActionButton(items, 'wpt');
    expect(actionButton).toBeUndefined();
    expect(toolbar).toEqual(items);
  });

  it('shows nothing when the chosen button is not available', () => {
    const { actionButton, toolbar } = takeActionButton(
      items,
      'ext:@acme/gone/button'
    );
    expect(actionButton).toBeUndefined();
    expect(toolbar).toEqual(items);
  });

  it('offers the built-in actions, then the extension buttons', () => {
    expect(
      actionButtonOptions(
        BUILT_IN,
        [
          {
            id: 'ext:@acme/poi/search',
            label: 'POI Search: Search nearby',
            shown: true
          }
        ],
        'wpt'
      )
    ).toEqual([
      ['wpt', 'Waypoint at vessel'],
      ['pob', 'Person Overboard'],
      ['ext:@acme/poi/search', 'POI Search: Search nearby']
    ]);
  });

  it('marks a button its extension hides as not available', () => {
    const options = actionButtonOptions(
      BUILT_IN,
      [
        { id: 'ext:rec/start', label: 'Recorder: Start', shown: true },
        { id: 'ext:rec/stop', label: 'Recorder: Stop', shown: false }
      ],
      'ext:rec/stop'
    );
    expect(options.slice(2)).toEqual([
      ['ext:rec/start', 'Recorder: Start'],
      ['ext:rec/stop', 'Not available: Recorder: Stop']
    ]);
  });

  it('keeps an unavailable choice so the setting is not lost', () => {
    const options = actionButtonOptions(BUILT_IN, [], 'ext:@acme/poi/search');
    expect(options.at(-1)).toEqual([
      'ext:@acme/poi/search',
      'Not available: @acme/poi/search'
    ]);
    expect(options).toHaveLength(3);
  });

  it('keeps an unknown built-in value from a later release as it is', () => {
    expect(
      actionButtonOptions(BUILT_IN, [], 'later-choice' as 'wpt')
    ).toHaveLength(2);
  });
});
