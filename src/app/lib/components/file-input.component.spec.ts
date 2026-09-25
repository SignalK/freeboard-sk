import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FileInputComponent,
  PlatformHints,
  effectiveAccept,
  isIOSPlatform
} from './file-input.component';

/**
 * Issue #828: on iOS, Import (`accept=".gpx,.json"`) greyed out every .gpx
 * file in the document picker. iOS maps each extension in `accept` to a
 * system file type, and `.gpx` has none, so the filter excluded the very
 * files it named. On iOS an extension filter is widened with a catch-all
 * document type (not dropped, which would make Safari offer the photo library
 * and camera first); elsewhere it is left alone.
 */

const IPHONE: PlatformHints = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  platform: 'iPhone',
  maxTouchPoints: 5
};
// iPadOS presents a desktop (Mac) user agent by default.
const IPAD_DESKTOP_UA: PlatformHints = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  platform: 'MacIntel',
  maxTouchPoints: 5
};
const MAC: PlatformHints = { ...IPAD_DESKTOP_UA, maxTouchPoints: 0 };
const WINDOWS: PlatformHints = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0
};

describe('isIOSPlatform', () => {
  it('recognises an iPhone', () => {
    expect(isIOSPlatform(IPHONE)).toBe(true);
  });

  it('recognises an iPad presenting as a Mac', () => {
    expect(isIOSPlatform(IPAD_DESKTOP_UA)).toBe(true);
  });

  it('does not treat a desktop Mac or Windows as iOS', () => {
    expect(isIOSPlatform(MAC)).toBe(false);
    expect(isIOSPlatform(WINDOWS)).toBe(false);
  });
});

describe('effectiveAccept', () => {
  it('widens an extension filter with a catch-all document type on iOS (#828)', () => {
    const widened = '.gpx,.json,application/octet-stream';
    expect(effectiveAccept('.gpx,.json', IPHONE)).toBe(widened);
    expect(effectiveAccept('.gpx,.json', IPAD_DESKTOP_UA)).toBe(widened);
  });

  it('widens a mixed extension + MIME filter on iOS', () => {
    expect(effectiveAccept('.gpx, application/json', IPHONE)).toBe(
      '.gpx, application/json,application/octet-stream'
    );
  });

  it('keeps a MIME-only filter on iOS', () => {
    expect(effectiveAccept('image/*', IPHONE)).toBe('image/*');
  });

  it('keeps an extension filter on desktop', () => {
    expect(effectiveAccept('.gpx,.json', WINDOWS)).toBe('.gpx,.json');
    expect(effectiveAccept('.gpx,.json', MAC)).toBe('.gpx,.json');
  });

  it('leaves an empty filter empty', () => {
    expect(effectiveAccept('', IPHONE)).toBe('');
    expect(effectiveAccept('', WINDOWS)).toBe('');
  });
});

describe('FileInputComponent — rendered accept attribute', () => {
  // Only the fields isIOSPlatform() reads are needed.
  const stubNavigator = (p: PlatformHints) => vi.stubGlobal('navigator', p);

  const renderedAccept = (accept: string): string | null => {
    const fixture = TestBed.createComponent(FileInputComponent);
    fixture.componentRef.setInput('accept', accept);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    return input.getAttribute('accept');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders a widened filter on an iPhone (#828)', () => {
    stubNavigator(IPHONE);
    expect(renderedAccept('.gpx,.json')).toBe(
      '.gpx,.json,application/octet-stream'
    );
  });

  it('renders the extension filter on desktop', () => {
    stubNavigator(WINDOWS);
    expect(renderedAccept('.gpx,.json')).toBe('.gpx,.json');
  });
});
