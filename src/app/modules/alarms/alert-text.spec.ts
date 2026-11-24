import { describe, expect, it } from 'vitest';
import { alertPlace, alertText } from './alert-text';

describe('alertText', () => {
  it('shows the message alone when the alert has no location', () => {
    expect(alertText({ message: 'Highwater' })).toBe('Highwater');
  });

  it('adds the location to the message', () => {
    expect(alertText({ message: 'Highwater', location: 'ER Port' })).toBe(
      'Highwater · ER Port'
    );
  });

  it('does not repeat a location the message already names', () => {
    expect(
      alertText({ message: 'Highwater er port', location: 'ER Port' })
    ).toBe('Highwater er port');
  });

  it('adds a location that only appears inside a word of the message', () => {
    expect(alertText({ message: 'Highwater', location: 'ER' })).toBe(
      'Highwater · ER'
    );
  });

  it('matches a location with characters special in patterns', () => {
    expect(
      alertText({ message: 'Highwater (Main) aft', location: '(Main)' })
    ).toBe('Highwater (Main) aft');
  });

  it('matches a location that starts or ends with punctuation in a word', () => {
    expect(alertText({ message: 'Highwater(Main)', location: '(Main)' })).toBe(
      'Highwater(Main)'
    );
  });

  it('shows the location when the message is empty', () => {
    expect(alertText({ message: '', location: 'ER Port' })).toBe('ER Port');
  });
});

describe('alertPlace', () => {
  it('gives the location the message does not name', () => {
    expect(alertPlace({ message: 'Highwater', location: 'ER Port' })).toBe(
      'ER Port'
    );
  });

  it('gives none when the message names the location', () => {
    expect(
      alertPlace({ message: 'Highwater ER Port', location: 'ER Port' })
    ).toBeUndefined();
  });

  it('gives none when the alert has no location', () => {
    expect(alertPlace({ message: 'Highwater' })).toBeUndefined();
  });
});
