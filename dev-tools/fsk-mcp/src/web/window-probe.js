// fsk-mcp window probe: a panel that agents open in a Plotter Extensions
// window (capability `windows`) to exercise the host's windows. It shows the
// window context it was opened with and, given `params.url` (a page on the
// Signal K server), embeds that page so a real webapp can be tried in a window.

import { connectExtension } from 'signalk-plotterext-bus/extension';

(async () => {
  const client = await connectExtension();
  const ctx = client.context;
  const params = ctx.params ?? {};

  document.getElementById('context').textContent = JSON.stringify(
    { kind: ctx.kind, windowId: ctx.windowId, params },
    null,
    2
  );

  const url = typeof params.url === 'string' ? params.url : '';
  if (url.startsWith('/') && !url.startsWith('//')) {
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.title = 'Probe page';
    document.body.classList.add('embed');
    document.body.appendChild(frame);
  }

  document.getElementById('close').addEventListener('click', () => {
    client
      .call('ui.closeWindow')
      .catch((e) => console.warn('[fsk-mcp probe]', e));
  });
})();
