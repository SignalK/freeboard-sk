import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { ETADialComponent, TTGDialComponent } from './dial-text';

/**
 * Issue #443: the ETA dial built its display string by slicing the
 * ':'-separated parts of a full `toLocaleTimeString()`. That drops the seconds,
 * but in a 12-hour locale it also drops the day period, so an ETA of 6:16 PM
 * rendered as an ambiguous "6:16".
 *
 * The host's own locale and time zone are not knowable in CI, so these pin both
 * by delegating `toLocaleTimeString` to a fixed `Intl.DateTimeFormat`, faithfully
 * reproducing the no-options default (hour/minute/second) that the old code
 * relied on.
 */
describe('ETADialComponent — locale time formatting', () => {
  const realToLocaleTimeString = Date.prototype.toLocaleTimeString;

  const pinLocale = (locale: string) => {
    Date.prototype.toLocaleTimeString = function (
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions
    ) {
      const opts =
        options && Object.keys(options).length !== 0
          ? options
          : { hour: 'numeric', minute: '2-digit', second: '2-digit' };
      return new Intl.DateTimeFormat(locales ?? locale, {
        timeZone: 'UTC',
        ...(opts as Intl.DateTimeFormatOptions)
      }).format(this);
    };
  };

  afterEach(() => {
    Date.prototype.toLocaleTimeString = realToLocaleTimeString;
  });

  /** 18:16:45 UTC — 6:16:45 PM in a 12-hour locale. */
  const eta = new Date('2026-08-23T18:16:45Z');

  const renderETA = (locale: string): string => {
    pinLocale(locale);
    const fixture = TestBed.createComponent(ETADialComponent);
    fixture.componentRef.setInput('value', eta);
    fixture.detectChanges();
    // `etaTime` is protected; the template is what a user reads.
    return (fixture.nativeElement as HTMLElement)
      .querySelector('.dial-text-value')!
      .textContent!.trim();
  };

  it('keeps the day period in a 12-hour locale', () => {
    // Not "6:16" — that is unreadable as an ETA (issue #443).
    expect(renderETA('en-US')).toMatch(/^6:16\s?PM$/);
  });

  it('shows hours and minutes only in a 24-hour locale', () => {
    expect(renderETA('en-GB')).toBe('18:16');
  });

  // The route bar keeps the ETA cell while VMG <= 0, so a cleared ETA must
  // not leave the last time on show (#1350).
  it('shows -- once its value is cleared', () => {
    pinLocale('en-US');
    const fixture = TestBed.createComponent(ETADialComponent);
    fixture.componentRef.setInput('value', eta);
    fixture.detectChanges();

    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.dial-text-value')!.textContent!.trim()).toBe(
      '--'
    );
    expect(el.querySelector('.dial-text-units')!.textContent!.trim()).toBe(
      '--'
    );
  });
});

// The route bar keeps the TTG cell while VMG <= 0, and its width with it, so
// the cell keeps room for a day count it showed before it was cleared (#1350).
describe('TTGDialComponent once cleared', () => {
  it('shows -- and keeps room for the last value shown', () => {
    const fixture = TestBed.createComponent(TTGDialComponent);
    fixture.componentRef.setInput('value', 24 * 60 + 62);
    fixture.detectChanges();

    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();

    const [shown, reserve] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.dial-text-value > span'
      ),
      (span) => span.textContent!.trim()
    );
    expect(shown).toBe('--');
    expect(reserve).toBe('1:01:02');
  });
});
