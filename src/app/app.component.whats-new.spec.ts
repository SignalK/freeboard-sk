import { describe, expect, it } from 'vitest';

import { AppComponent } from './app.component';

const component = (whatsNew: boolean, hasUnseen: boolean) => {
  const cmp = Object.create(AppComponent.prototype);
  cmp.app = { config: { display: { whatsNew } } };
  cmp.whatsNew = { hasUnseen: () => hasUnseen };
  return cmp;
};

describe("AppComponent: What's New button", () => {
  it('shows while feature changes are unseen', () => {
    expect(component(true, true).showWhatsNew()).toBe(true);
  });

  it('stays hidden when nothing is unseen', () => {
    expect(component(true, false).showWhatsNew()).toBe(false);
  });

  it('stays hidden when the setting is off', () => {
    expect(component(false, true).showWhatsNew()).toBe(false);
  });
});
