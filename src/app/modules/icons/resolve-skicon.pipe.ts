import { Pipe, PipeTransform } from '@angular/core';
import { resolveSkIcon } from './app.icons';

/**
 * Resolve a skIcon reference (bare id or "namespace:id") to a
 * Material-resolvable svgIcon name, applying external-symbol overrides.
 * Used by list/panel templates that bind skIcon directly to <mat-icon>.
 */
@Pipe({
  name: 'resolveSkIcon',
  standalone: true,
  // Impure: the underlying symbol registry is populated asynchronously, so the
  // pipe must re-evaluate after it loads/reloads (not only when `ref` changes).
  // Only used in two bounded note-list templates, and resolveSkIcon() is a
  // cheap map lookup, so the per-CD cost is negligible.
  pure: false
})
export class ResolveSkIconPipe implements PipeTransform {
  public transform(ref?: string): string {
    return resolveSkIcon(ref);
  }
}
