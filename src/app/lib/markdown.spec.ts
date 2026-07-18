import { describe, it, expect } from 'vitest';
import type { Node, Parent } from 'unist';
import { markdownProcessor } from './markdown';

/** Parse + run markdown the same way ngx-remark's <remark> does, and collect
 *  every node type present in the resulting MDAST tree. */
function nodeTypes(markdown: string): Set<string> {
  const tree = markdownProcessor.runSync(markdownProcessor.parse(markdown));
  const types = new Set<string>();
  const walk = (node: Node) => {
    types.add(node.type);
    for (const child of (node as Parent).children ?? []) walk(child);
  };
  walk(tree);
  return types;
}

describe('markdownProcessor (GFM support)', () => {
  it('parses a GFM pipe table into a table node, not literal text', () => {
    const md = [
      '| Area | Custom icons? |',
      '| --- | --- |',
      '| Waypoints | Yes |',
      '| Routes | No |'
    ].join('\n');

    const types = nodeTypes(md);
    // Without remark-gfm the whole block collapses to a single `paragraph`
    // of literal pipe text; with it, a real `table` node is produced.
    expect(types.has('table')).toBe(true);
    expect(types.has('tableRow')).toBe(true);
    expect(types.has('tableCell')).toBe(true);
  });

  it('parses strikethrough (~~) into a delete node', () => {
    const types = nodeTypes('This is ~~struck~~ text.');
    expect(types.has('delete')).toBe(true);
  });
});
