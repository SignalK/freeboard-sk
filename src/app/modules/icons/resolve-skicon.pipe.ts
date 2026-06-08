import { Pipe, PipeTransform } from '@angular/core';
import { resolveSkIcon } from './app.icons';

/**
 * Resolve a skIcon reference (bare id or "namespace:id") to a
 * Material-resolvable svgIcon name, applying external-symbol overrides.
 * Used by list/panel templates that bind skIcon directly to <mat-icon>.
 */
@Pipe({
  name: 'resolveSkIcon',
  standalone: true
})
export class ResolveSkIconPipe implements PipeTransform {
  public transform(ref?: string): string {
    return resolveSkIcon(ref);
  }
}
