import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

/**
 * Shared Markdown processor for `ngx-remark`'s `<remark [processor]>` input.
 *
 * `ngx-remark` defaults to `unified().use(remarkParse)`, which is *core*
 * CommonMark only. GitHub-Flavored-Markdown constructs — pipe tables,
 * strikethrough, autolinks, task lists, footnotes — are a GFM extension and
 * would otherwise render as literal text (e.g. a `| a | b |` table shows its
 * pipes). Adding `remark-gfm` makes the parser emit the corresponding MDAST
 * nodes, which `<remark>` already has default templates for (`table`, `delete`,
 * `footnotes`, …).
 *
 * A single frozen processor instance is safe to share across every `<remark>`
 * in the app: parsing is stateless with respect to the processor.
 */
export const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .freeze();
