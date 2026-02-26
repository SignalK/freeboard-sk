import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  ChartOpacityDialog,
  ChartOpacityDialogData
} from './chart-opacity-dialog';

describe('ChartOpacityDialog', () => {
  let component: ChartOpacityDialog;
  let fixture: ComponentFixture<ChartOpacityDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ChartOpacityDialog>>;
  const getOpacity = () => (component as any).opacityPercent();

  const createComponent = (opacityPercent: number) => {
    const data: ChartOpacityDialogData = {
      name: 'Test Chart',
      opacityPercent: opacityPercent
    };

    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ChartOpacityDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(ChartOpacityDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('initialization', () => {
    it('should set initial opacity from data', () => {
      createComponent(75);
      expect(getOpacity()).toBe(75);
    });

    it('should default to 100 when opacityPercent is undefined', () => {
      const data: ChartOpacityDialogData = {
        name: 'Test Chart',
        opacityPercent: undefined as any
      };

      dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

      TestBed.configureTestingModule({
        imports: [ChartOpacityDialog],
        providers: [
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: data }
        ]
      });

      fixture = TestBed.createComponent(ChartOpacityDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(getOpacity()).toBe(100);
    });

    it('should set opacity to 0 when data is 0', () => {
      createComponent(0);
      expect(getOpacity()).toBe(0);
    });

    it('should set opacity to 100 when data is 100', () => {
      createComponent(100);
      expect(getOpacity()).toBe(100);
    });
  });

  describe('setOpacity', () => {
    beforeEach(() => {
      createComponent(50);
    });

    it('should update opacity signal', () => {
      component['setOpacity'](75);
      expect(getOpacity()).toBe(75);
    });

    it('should clamp value to maximum 100', () => {
      component['setOpacity'](150);
      expect(getOpacity()).toBe(100);
    });

    it('should clamp value to minimum 0', () => {
      component['setOpacity'](-25);
      expect(getOpacity()).toBe(0);
    });

    it('should round decimal values', () => {
      component['setOpacity'](67.8);
      expect(getOpacity()).toBe(68);
    });

    it('should default to 100 when value is undefined', () => {
      component['setOpacity'](undefined as any);
      expect(getOpacity()).toBe(100);
    });

    it('should call onOpacityChange callback when provided', () => {
      const callback = jasmine.createSpy('onOpacityChange');
      component.data.onOpacityChange = callback;
      component['setOpacity'](75);
      expect(callback).toHaveBeenCalledWith(75);
    });

    it('should not fail when onOpacityChange is undefined', () => {
      component.data.onOpacityChange = undefined;
      expect(() => component['setOpacity'](75)).not.toThrow();
    });
  });

  describe('handleClose', () => {
    beforeEach(() => {
      createComponent(75);
    });

    it('should close dialog with save=true and current opacity on Apply', () => {
      component['handleClose'](true);
      expect(dialogRef.close).toHaveBeenCalledWith({
        save: true,
        opacityPercent: 75
      });
    });

    it('should close dialog with save=false on Cancel', () => {
      component['handleClose'](false);
      expect(dialogRef.close).toHaveBeenCalledWith({
        save: false,
        opacityPercent: 75
      });
    });

    it('should include updated opacity value after changes', () => {
      component['setOpacity'](33);
      component['handleClose'](true);
      expect(dialogRef.close).toHaveBeenCalledWith({
        save: true,
        opacityPercent: 33
      });
    });
  });
});
