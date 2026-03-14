import { ChartListComponent } from './chartlist';
import { SKChart } from '../../resource-classes';

describe('ChartListComponent - Opacity Functions', () => {
  let component: ChartListComponent;
  let updateChartOpacityCacheSpy: jasmine.Spy;

  beforeEach(() => {
    component = Object.create(ChartListComponent.prototype) as ChartListComponent;
    updateChartOpacityCacheSpy = jasmine.createSpy('updateChartOpacityCache');
    (component as any).skres = {
      updateChartOpacityCache: updateChartOpacityCacheSpy
    } as any;
    (component as any).doFilter = () => {};
    (component as any).fullList = [];
  });

  describe('opacityToPercent', () => {
    it('should convert 0 to 0%', () => {
      expect(component['opacityToPercent'](0)).toBe(0);
    });

    it('should convert 0.5 to 50%', () => {
      expect(component['opacityToPercent'](0.5)).toBe(50);
    });

    it('should convert 1 to 100%', () => {
      expect(component['opacityToPercent'](1)).toBe(100);
    });

    it('should default to 100% when undefined', () => {
      expect(component['opacityToPercent'](undefined)).toBe(100);
    });

    it('should round decimal results', () => {
      expect(component['opacityToPercent'](0.678)).toBe(68);
    });

    it('should clamp values above 1 to 100%', () => {
      expect(component['opacityToPercent'](1.5)).toBe(100);
    });

    it('should clamp negative values to 0%', () => {
      expect(component['opacityToPercent'](-0.5)).toBe(0);
    });
  });

  describe('clampPercent', () => {
    it('should return value within range unchanged', () => {
      expect(component['clampPercent'](50)).toBe(50);
      expect(component['clampPercent'](0)).toBe(0);
      expect(component['clampPercent'](100)).toBe(100);
    });

    it('should clamp value above 100 to 100', () => {
      expect(component['clampPercent'](150)).toBe(100);
      expect(component['clampPercent'](101)).toBe(100);
    });

    it('should clamp value below 0 to 0', () => {
      expect(component['clampPercent'](-50)).toBe(0);
      expect(component['clampPercent'](-1)).toBe(0);
    });

    it('should round decimal values', () => {
      expect(component['clampPercent'](45.6)).toBe(46);
      expect(component['clampPercent'](45.4)).toBe(45);
    });

    it('should default to 100 when undefined', () => {
      expect(component['clampPercent'](undefined)).toBe(100);
    });
  });

  describe('updateOpacityLocal', () => {
    beforeEach(() => {
      const chart1 = new SKChart({
        name: 'Chart 1',
        defaultOpacity: 1
      });
      const chart2 = new SKChart({
        name: 'Chart 2',
        defaultOpacity: 0.8
      });
      component['fullList'] = [
        ['chart-1', chart1, false],
        ['chart-2', chart2, false]
      ];
    });

    it('should update opacity for specified chart', () => {
      component['updateOpacityLocal']('chart-1', 0.5);
      const chart = component['fullList'].find((c) => c[0] === 'chart-1');
      expect(chart?.[1].defaultOpacity).toBe(0.5);
    });

    it('should not modify other charts', () => {
      component['updateOpacityLocal']('chart-1', 0.5);
      const chart = component['fullList'].find((c) => c[0] === 'chart-2');
      expect(chart?.[1].defaultOpacity).toBe(0.8);
    });

    it('should update resource cache', () => {
      component['updateOpacityLocal']('chart-1', 0.3);
      expect(updateChartOpacityCacheSpy).toHaveBeenCalledWith(
        'chart-1',
        0.3
      );
    });

    it('should set opacity to 0', () => {
      component['updateOpacityLocal']('chart-1', 0);
      const chart = component['fullList'].find((c) => c[0] === 'chart-1');
      expect(chart?.[1].defaultOpacity).toBe(0);
    });
  });

});
