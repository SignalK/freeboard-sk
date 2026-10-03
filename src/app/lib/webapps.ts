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
      if (!i._location && !i.location) {
        return { name: i.name, description: i.description, url: `/${i.name}` };
      }
      if (typeof i._location !== 'undefined') {
        const x = i._location.indexOf('/signalk-server/');
        return {
          name: i.name,
          description: i.description,
          url: x === -1 ? i._location : i._location.slice(15)
        };
      }
      return { name: i.name, description: i.description, url: i.location };
    })
    .filter((e): e is WebappEntry => !!e);
}
