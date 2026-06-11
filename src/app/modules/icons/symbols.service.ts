import { inject, Injectable, isDevMode, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SymbolResource, SymbolRole } from 'src/app/types/symbols';
import { MapImageRegistry } from '../map/ol/lib/map-image-registry.service';
import { isQualified, isDefaultNs, isRenderableSymbol, parseRef } from './symbol-ref';
import { AppIconDef, getBuiltinIconIds } from './app.icons';

export const FALLBACK_ICON = 'no-such-symbol';

// Freeboard's own vendor namespace. A symbol whose alias is `fsk:<built-in-id>`
// overrides that built-in icon. `custom:<id>` symbols are offered as new
// user-defined symbols. All other alias namespaces are ignored by Freeboard.
export const FSK_NS = 'fsk';
export const CUSTOM_NS = 'custom';

// One renderable reference into a provider symbol (a single alias's worth).
interface IndexedSymbol {
  ref: string; // canonical render ref, e.g. "custom:dive-flag" or "fsk:dive-site"
  url: string;
  scale?: number;
  anchor?: [number, number];
  name: string;
  roles: SymbolRole[];
  gpxType?: string;
  gpxSym?: string;
}

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

  /** Index by render ref ("custom:id" / "fsk:id") for qualified lookups. */
  private byRef = new Map<string, IndexedSymbol>();
  /** Built-in id -> the fsk override symbol for it (first alias wins). */
  private overrides = new Map<string, IndexedSymbol>();
  /** User-defined symbols (custom: aliases) for the icon selectors. */
  private userSymbols: IndexedSymbol[] = [];
  /** Set of built-in icon ids (bare names from getSvgList). */
  private builtinIds: Set<string>;

  constructor() {
    this.builtinIds = getBuiltinIconIds();
  }

  /** Fetch /resources/symbols, index, and register all renderable symbols. */
  async load(): Promise<void> {
    try {
      const result = (await firstValueFrom(
        this.signalk.api.get(this.app.skApiVersion, '/resources/symbols')
      )) as Record<string, unknown>;

      if (!result || typeof result !== 'object') {
        if (isDevMode()) console.debug('[SymbolService] No symbols returned from server.');
        return;
      }

      for (const [key, raw] of Object.entries(result)) {
        const sym = raw as SymbolResource;
        if (!this.isValidSymbol(sym, key)) continue;
        this.indexSymbol(sym);
      }
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

  // Register each of a symbol's relevant aliases. `fsk:<id>` overrides built-in
  // `<id>`; `custom:<id>` is a user symbol; other namespaces are ignored.
  private indexSymbol(sym: SymbolResource): void {
    for (const aliasStr of sym.alias) {
      const { namespace, id } = parseRef(aliasStr);
      if (!namespace || !id) continue;

      if (namespace === FSK_NS) {
        const ref = `${FSK_NS}:${id}`;
        const idx = this.toIndexed(sym, ref);
        this.registerMaterial(FSK_NS, id, sym.url);
        this.registerMarker(ref, idx); // qualified render ref
        this.registerMarker(id, idx); // bare built-in id -> override (map markers)
        this.byRef.set(ref, idx);
        if (!this.overrides.has(id)) this.overrides.set(id, idx);
      } else if (namespace === CUSTOM_NS) {
        const ref = `${CUSTOM_NS}:${id}`;
        if (this.byRef.has(ref)) continue;
        const idx = this.toIndexed(sym, ref);
        this.registerMaterial(CUSTOM_NS, id, sym.url);
        this.registerMarker(ref, idx);
        this.byRef.set(ref, idx);
        this.userSymbols.push(idx);
      }
      // other namespaces (garmin, opencpn, user, …) are not used by Freeboard
    }
  }

  private toIndexed(sym: SymbolResource, ref: string): IndexedSymbol {
    return {
      ref,
      url: sym.url,
      scale: sym.scale,
      anchor: sym.anchor,
      name: sym.name,
      roles: Array.isArray(sym.roles) ? sym.roles : [],
      gpxType: sym.gpxType,
      gpxSym: sym.gpxSym
    };
  }

  private registerMaterial(namespace: string, id: string, url: string): void {
    this.iconReg.addSvgIconInNamespace(
      namespace,
      id,
      this.dom.bypassSecurityTrustResourceUrl(url)
    );
  }

  private registerMarker(ref: string, idx: IndexedSymbol): void {
    this.mapImages.registerSymbolMarker(ref, {
      path: idx.url,
      scale: idx.scale,
      anchor: idx.anchor
    });
  }

  /**
   * Resolve a skIcon reference to an AppIconDef whose svgIcon is a
   * Material-resolvable name. Returns null when ref is falsy.
   */
  resolveDisplayIcon(ref: string): AppIconDef | null {
    if (!ref) return null;

    if (isDefaultNs(ref)) {
      // Force built-in: strip "default:" prefix.
      const { id } = parseRef(ref);
      return this.builtinIds.has(id) ? { svgIcon: id } : { svgIcon: FALLBACK_ICON };
    }

    if (isQualified(ref)) {
      // Qualified external reference (custom:id or fsk:id).
      return this.byRef.has(ref) ? { svgIcon: ref } : { svgIcon: FALLBACK_ICON };
    }

    // Bare id: an fsk override replaces the built-in, else the built-in itself.
    const ov = this.overrides.get(ref);
    if (ov) return { svgIcon: ov.ref };
    if (this.builtinIds.has(ref)) return { svgIcon: ref };
    return { svgIcon: FALLBACK_ICON };
  }

  /**
   * Resolve a skIcon reference to a map-marker definition, or null to fall
   * through to built-in rendering.
   */
  resolveMapMarker(
    ref: string
  ): { path: string; scale?: number; anchor?: [number, number] } | null {
    const idx = this.resolveSymbol(ref);
    return idx ? { path: idx.url, scale: idx.scale, anchor: idx.anchor } : null;
  }

  /**
   * Return user symbols (custom:) suitable for the note icon selector.
   * Filtered to role 'note' by default; showAll returns all user symbols.
   */
  getExternalNoteIcons(showAll: boolean): Array<{ id: string; name: string }> {
    return this.userSymbols
      .filter((s) => showAll || s.roles.includes('note'))
      .map((s) => ({ id: s.ref, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Return user symbols (custom:) suitable for the waypoint icon selector.
   * Filtered to role 'waypoint' by default; showAll returns all user symbols.
   */
  getExternalWaypointIcons(showAll: boolean): Array<AppIconDef> {
    return this.userSymbols
      .filter((s) => showAll || s.roles.includes('waypoint'))
      .map((s) => ({ svgIcon: s.ref, name: s.name }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  /**
   * Resolve a GPX waypoint `<sym>` value to a canonical symbol ref for import:
   *   1. exact match against a symbol's gpxSym, else
   *   2. exact match against an alias's local id.
   * Prefers a `custom:` ref. Returns null when nothing matches.
   */
  resolveGpxSym(sym: string): string | null {
    if (!sym) return null;
    // 1. gpxSym exact match.
    let fallback: string | null = null;
    for (const [ref, s] of this.byRef.entries()) {
      if (s.gpxSym === sym) {
        if (ref.startsWith(`${CUSTOM_NS}:`)) return ref;
        fallback = fallback ?? ref;
      }
    }
    if (fallback) return fallback;
    // 2. local id exact match.
    for (const ref of this.byRef.keys()) {
      const id = ref.slice(ref.indexOf(':') + 1);
      if (id === sym) {
        if (ref.startsWith(`${CUSTOM_NS}:`)) return ref;
        fallback = fallback ?? ref;
      }
    }
    return fallback;
  }

  /**
   * Return the GPX mapping ({gpxType, gpxSym}) of the symbol referenced by the
   * supplied skIcon, or null when it is not an external symbol. Used by export.
   */
  getGpxMapping(ref: string): { gpxType?: string; gpxSym?: string } | null {
    const idx = this.resolveSymbol(ref);
    return idx ? { gpxType: idx.gpxType, gpxSym: idx.gpxSym } : null;
  }

  /** True when a built-in id has an fsk override. */
  hasExternalVersion(id: string): boolean {
    return this.overrides.has(id);
  }

  // ---- Private helpers ----

  /** Resolve a skIcon ref to its IndexedSymbol (null if built-in / unknown). */
  private resolveSymbol(ref: string): IndexedSymbol | null {
    if (!ref || isDefaultNs(ref)) return null;
    if (isQualified(ref)) return this.byRef.get(ref) ?? null;
    return this.overrides.get(ref) ?? null;
  }

  private isValidSymbol(sym: unknown, key: string): sym is SymbolResource {
    if (!sym || typeof sym !== 'object') return false;
    const s = sym as Partial<SymbolResource>;
    if (!s.uuid || !s.name || !s.url) return false;
    if (!Array.isArray(s.alias) || s.alias.length === 0) {
      if (isDevMode()) console.debug(`[SymbolService] Skipping symbol "${key}": no alias.`);
      return false;
    }
    if (!isRenderableSymbol(s as { mediaType: string; url: string })) {
      if (isDevMode()) console.debug(`[SymbolService] Skipping symbol "${key}": not renderable.`);
      return false;
    }
    return true;
  }
}
