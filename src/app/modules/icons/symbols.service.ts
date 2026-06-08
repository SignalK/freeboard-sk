import { inject, Injectable, isDevMode, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SymbolResource, SymbolRole } from 'src/app/types/symbols';
import { MapImageRegistry } from '../map/ol/lib/map-image-registry.service';
import {
  isQualified,
  isDefaultNs,
  isRenderableSymbol,
  parseRef,
  RESERVED_DEFAULT_NS
} from './symbol-ref';
import { AppIconDef, getBuiltinIconIds } from './app.icons';

export const FALLBACK_ICON = 'no-such-symbol';

/** Interface for the module-level hook used by pure functions in app.icons.ts */
export interface SymbolRegistryLike {
  resolveDisplayIcon(ref: string): AppIconDef | null;
  resolveMapMarker(ref: string): { path: string; scale?: number; anchor?: [number, number] } | null;
  getExternalNoteIcons(showAll: boolean): Array<{ id: string; name: string }>;
  getExternalWaypointIcons(showAll: boolean): Array<AppIconDef>;
  hasExternalVersion(id: string): boolean;
  getGpxMapping(ref: string): { gpxType?: string; gpxSym?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class SymbolService implements SymbolRegistryLike {
  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private iconReg = inject(MatIconRegistry);
  private dom = inject(DomSanitizer);
  private mapImages = inject(MapImageRegistry);

  /** True after load() has completed (success or error). */
  readonly loaded = signal(false);

  /** Index by canonical "namespace:id" */
  private byRef = new Map<string, SymbolResource>();
  /** Index by local id → list of symbols (for unqualified lookup) */
  private byLocalId = new Map<string, SymbolResource[]>();
  /** Set of built-in icon ids (bare names from getSvgList). */
  private builtinIds: Set<string>;

  constructor() {
    this.builtinIds = getBuiltinIconIds();
  }

  /** Fetch /resources/symbols, index, and register all renderable symbols. */
  async load(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.signalk.api.get(this.app.skApiVersion, '/resources/symbols')
      ) as Record<string, unknown>;

      if (!result || typeof result !== 'object') {
        if (isDevMode()) console.debug('[SymbolService] No symbols returned from server.');
        return;
      }

      for (const [key, raw] of Object.entries(result)) {
        const sym = raw as SymbolResource;
        if (!this.isValidSymbol(sym, key)) continue;
        const ref = `${sym.namespace}:${sym.id}`;
        if (this.byRef.has(ref)) {
          if (isDevMode()) console.debug(`[SymbolService] Duplicate symbol ref "${ref}", skipping.`);
          continue;
        }
        this.byRef.set(ref, sym);
        const existing = this.byLocalId.get(sym.id) ?? [];
        existing.push(sym);
        this.byLocalId.set(sym.id, existing);
      }

      this.registerMaterialIcons();
      this.registerMapMarkers();
    } catch (err: unknown) {
      if (isDevMode()) {
        const status = (err as { status?: number })?.status;
        if (status !== 404) {
          console.debug('[SymbolService] Could not load symbols:', err);
        }
      }
    } finally {
      this.loaded.set(true);
    }
  }

  /** Register all indexed SVG symbols with Angular Material's icon registry. */
  private registerMaterialIcons(): void {
    for (const sym of this.byRef.values()) {
      this.iconReg.addSvgIconInNamespace(
        sym.namespace,
        sym.id,
        this.dom.bypassSecurityTrustResourceUrl(sym.url)
      );
    }
  }

  /** Push all indexed symbols into MapImageRegistry as marker definitions. */
  private registerMapMarkers(): void {
    for (const [ref, sym] of this.byRef.entries()) {
      this.mapImages.registerSymbolMarker(ref, {
        path: sym.url,
        scale: sym.scale,
        anchor: sym.anchor
      });
    }
  }

  /**
   * Resolve a skIcon reference to an AppIconDef whose svgIcon is a
   * Material-resolvable name, applying spec precedence rules.
   *
   * Returns null when ref is falsy (caller should use its own default).
   */
  resolveDisplayIcon(ref: string): AppIconDef | null {
    if (!ref) return null;

    if (isDefaultNs(ref)) {
      // Force built-in: strip "default:" prefix
      const { id } = parseRef(ref);
      return this.builtinIds.has(id)
        ? { svgIcon: id }
        : { svgIcon: FALLBACK_ICON };
    }

    if (isQualified(ref)) {
      // Qualified external reference
      return this.byRef.has(ref)
        ? { svgIcon: ref }
        : { svgIcon: FALLBACK_ICON };
    }

    // Unqualified: external-first, then built-in, then fallback
    const candidates = this.byLocalId.get(ref);
    if (candidates && candidates.length > 0) {
      // Pick deterministically: first by sorted namespace
      const winner = candidates.slice().sort((a, b) =>
        a.namespace.localeCompare(b.namespace)
      )[0];
      return { svgIcon: `${winner.namespace}:${winner.id}` };
    }
    if (this.builtinIds.has(ref)) {
      return { svgIcon: ref };
    }
    return { svgIcon: FALLBACK_ICON };
  }

  /**
   * Resolve a skIcon reference to a map-marker definition.
   * Returns null when the ref should fall through to built-in rendering.
   */
  resolveMapMarker(
    ref: string
  ): { path: string; scale?: number; anchor?: [number, number] } | null {
    if (!ref || isDefaultNs(ref)) return null;

    if (isQualified(ref)) {
      const sym = this.byRef.get(ref);
      return sym ? { path: sym.url, scale: sym.scale, anchor: sym.anchor } : null;
    }

    // Unqualified: external-first
    const candidates = this.byLocalId.get(ref);
    if (candidates && candidates.length > 0) {
      const winner = candidates.slice().sort((a, b) =>
        a.namespace.localeCompare(b.namespace)
      )[0];
      return { path: winner.url, scale: winner.scale, anchor: winner.anchor };
    }
    return null;
  }

  /**
   * Return external symbols suitable for the note icon selector.
   * Filtered to role 'note' by default; showAll returns all renderable symbols.
   */
  getExternalNoteIcons(showAll: boolean): Array<{ id: string; name: string }> {
    const result: Array<{ id: string; name: string }> = [];
    for (const [ref, sym] of this.byRef.entries()) {
      if (!showAll && !this.hasRole(sym, 'note')) continue;
      result.push({ id: ref, name: sym.name });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Return external symbols suitable for the waypoint icon selector.
   * Filtered to role 'waypoint' by default; showAll returns all renderable symbols.
   */
  getExternalWaypointIcons(showAll: boolean): Array<AppIconDef> {
    const result: AppIconDef[] = [];
    for (const [ref, sym] of this.byRef.entries()) {
      if (!showAll && !this.hasRole(sym, 'waypoint')) continue;
      result.push({ svgIcon: ref, name: sym.name });
    }
    return result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  /**
   * Resolve a GPX waypoint `<sym>` value to a canonical symbol ref for import:
   *   1. exact match against a symbol's gpxSym, else
   *   2. exact match against a symbol's local id (deterministic winner).
   * Returns null when nothing matches (caller falls back to its default).
   */
  resolveGpxSym(sym: string): string | null {
    if (!sym) return null;
    // 1. gpxSym exact match
    for (const [ref, s] of this.byRef.entries()) {
      if (s.gpxSym === sym) return ref;
    }
    // 2. local id exact match
    const candidates = this.byLocalId.get(sym);
    if (candidates && candidates.length > 0) {
      const winner = candidates
        .slice()
        .sort((a, b) => a.namespace.localeCompare(b.namespace))[0];
      return `${winner.namespace}:${winner.id}`;
    }
    return null;
  }

  /**
   * Return the GPX mapping ({gpxType, gpxSym}) of the symbol referenced by the
   * supplied skIcon, or null when the ref is not an external symbol (built-in,
   * "default:" pin, or unknown). Used by GPX export.
   */
  getGpxMapping(ref: string): { gpxType?: string; gpxSym?: string } | null {
    const sym = this.resolveSymbol(ref);
    return sym ? { gpxType: sym.gpxType, gpxSym: sym.gpxSym } : null;
  }

  // ---- Private helpers ----

  /** True when at least one external symbol shares the given bare local id. */
  hasExternalVersion(id: string): boolean {
    return this.byLocalId.has(id);
  }

  /** Resolve a skIcon ref to its external SymbolResource (null if built-in). */
  private resolveSymbol(ref: string): SymbolResource | null {
    if (!ref || isDefaultNs(ref)) return null;
    if (isQualified(ref)) return this.byRef.get(ref) ?? null;
    const candidates = this.byLocalId.get(ref);
    if (candidates && candidates.length > 0) {
      return candidates
        .slice()
        .sort((a, b) => a.namespace.localeCompare(b.namespace))[0];
    }
    return null;
  }

  private hasRole(sym: SymbolResource, role: SymbolRole): boolean {
    return Array.isArray(sym.roles) && sym.roles.includes(role);
  }

  private isValidSymbol(sym: unknown, key: string): sym is SymbolResource {
    if (!sym || typeof sym !== 'object') return false;
    const s = sym as Partial<SymbolResource>;
    if (!s.id || !s.namespace || !s.name || !s.url) return false;
    if (s.namespace === RESERVED_DEFAULT_NS) {
      if (isDevMode()) console.debug(`[SymbolService] Skipping symbol "${key}": reserved namespace "default".`);
      return false;
    }
    if (!/^[A-Za-z0-9_]+$/.test(s.namespace)) {
      if (isDevMode()) console.debug(`[SymbolService] Skipping symbol "${key}": invalid namespace "${s.namespace}".`);
      return false;
    }
    if (!isRenderableSymbol(s as { mediaType: string; url: string })) {
      if (isDevMode()) console.debug(`[SymbolService] Skipping symbol "${key}": not renderable.`);
      return false;
    }
    return true;
  }
}
