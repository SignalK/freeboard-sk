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
    .map((i): WebappEntry | null => {
      if (!i || i.name === '@signalk/freeboard-sk') {
        return null;
      }
      const legacy = typeof i._location === 'string' ? i._location : '';
      const current = typeof i.location === 'string' ? i.location : '';
      if (legacy) {
        const x = legacy.indexOf('/signalk-server/');
        return {
          name: i.name,
          description: i.description,
          url: x === -1 ? legacy : legacy.slice(15)
        };
      }
      if (current) {
        return { name: i.name, description: i.description, url: current };
      }
      return { name: i.name, description: i.description, url: `/${i.name}` };
    })
    .filter((e): e is WebappEntry => !!e);
}
