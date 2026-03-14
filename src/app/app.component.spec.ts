import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { beforeEach, expect, describe, it } from 'vitest';
import '@vitest/web-worker';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
