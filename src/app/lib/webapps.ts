/** An entry of the Signal K server's installed webapps list. */
export interface SKAppsList {
  author: string;
  description: string;
  license: string;
  location: string;
  _location: string;
  name: string;
  version: string;
}

/** An installed webapp Freeboard can embed, with its server-relative URL. */
export interface WebappEntry {
  name: string;
  description: string;
  url: string;
}

/**
 * Map the server's webapps list to embeddable entries, leaving out Freeboard
 * itself. npm-linked apps carry no location and are served at `/<name>`; the
 * legacy list prefixes `_location` with `/signalk-server`.
 */
export function mapWebappList(list: SKAppsList[]): WebappEntry[] {
  return (list ?? [])
    .filter((i) => i && i.name !== '@signalk/freeboard-sk')
    .map(({ name, description, _location, location }) => {
      const legacy = typeof _location === 'string' ? _location : '';
      const url = legacy
        ? legacy.includes('/signalk-server/')
          ? legacy.slice(15)
          : legacy
        : typeof location === 'string' && location
          ? location
          : `/${name}`;
      return { name, description, url };
    });
}
