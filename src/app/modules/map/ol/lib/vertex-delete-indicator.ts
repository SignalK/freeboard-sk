// A transient on-screen indicator for the tap-hold vertex delete: a short
// progress bar that fills over the hold with a trash icon beside it, sitting
// just above the finger (which covers the grabbed vertex). It confirms "keep
// holding to delete", then turns red the instant the delete lands.
//
// Built as plain DOM rather than an Angular component: it is tied to a raw
// pointer gesture, positioned in screen space, and created/destroyed entirely
// within MapComponent's gesture lifecycle — an overlay element sidesteps the
// cross-component wiring and change-detection zone juggling a component needs
// for something this short-lived.

const STYLE_ID = 'fb-vertex-delete-indicator-style';
const EL_ID = 'fb-vertex-delete-indicator';

const CSS = `
#${EL_ID} {
  position: fixed;
  transform: translate(-50%, calc(-100% - 22px));
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-radius: 9px;
  background: rgba(28, 28, 30, 0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
#${EL_ID} .fb-vdi-track {
  width: 78px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.28);
  overflow: hidden;
}
#${EL_ID} .fb-vdi-fill {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: #ffffff;
  transform-origin: left center;
  transform: scaleX(0);
  animation-name: fb-vdi-grow;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes fb-vdi-grow {
  to { transform: scaleX(1); }
}
#${EL_ID} .fb-vdi-icon {
  width: 20px;
  height: 20px;
  fill: #b7b7bb;
  flex: 0 0 auto;
  transition: fill 90ms linear;
}
#${EL_ID}.fb-vdi-done .fb-vdi-fill {
  animation: none;
  transform: scaleX(1);
  background: #ff4d4f;
}
#${EL_ID}.fb-vdi-done .fb-vdi-icon {
  fill: #ff4d4f;
}
`;

// A standard trash-can glyph.
const TRASH_SVG =
  '<svg class="fb-vdi-icon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M9 3v1H4v2h16V4h-5V3H9zM6 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8H6zm3 2h2v9H9v-9zm4 0h2v9h-2v-9z"/>' +
  '</svg>';

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Show the indicator above (`x`, `y`) — the press point — with the bar filling
 * over `durationMs`. Replaces any indicator already showing.
 */
export function showVertexDeleteIndicator(
  x: number,
  y: number,
  durationMs: number
): void {
  ensureStyle();
  hideVertexDeleteIndicator();
  const el = document.createElement('div');
  el.id = EL_ID;
  el.innerHTML = `<div class="fb-vdi-track"><div class="fb-vdi-fill"></div></div>${TRASH_SVG}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  const fill = el.querySelector('.fb-vdi-fill') as HTMLElement | null;
  if (fill) {
    fill.style.animationDuration = `${durationMs}ms`;
  }
  document.body.appendChild(el);
}

/** Turn the indicator red to confirm the delete landed, then retire it. */
export function completeVertexDeleteIndicator(): void {
  const el = document.getElementById(EL_ID);
  if (!el) {
    return;
  }
  el.classList.add('fb-vdi-done');
  setTimeout(() => el.remove(), 240);
}

/** Remove the indicator immediately (hold cancelled). */
export function hideVertexDeleteIndicator(): void {
  document.getElementById(EL_ID)?.remove();
}
