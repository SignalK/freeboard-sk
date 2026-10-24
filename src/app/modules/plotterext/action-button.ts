import type { MFBAction } from 'src/app/types';

/**
 * The id of an extension's button: its toolbar item id, and the Action Button
 * setting that puts it in the bottom-right corner instead.
 */
export function extensionButtonId(
  extension: string,
  buttonId: string
): `ext:${string}` {
  return `ext:${extension}/${buttonId}`;
}

/** Whether the Action Button setting names an extension's button. */
export function isExtensionAction(action: MFBAction | undefined): boolean {
  return !!action?.startsWith('ext:');
}

/**
 * How an extension's button is named in the Action Button choices. An
 * extension's only button is often titled after the extension; it is named
 * once.
 */
export function actionButtonLabel(extensionName: string, title: string) {
  return title && title !== extensionName
    ? `${extensionName}: ${title}`
    : extensionName;
}

/**
 * Takes the item the Action Button shows out of the toolbar items, so the
 * button appears in one place only. `actionButton` is undefined when the
 * chosen button is not available, and the corner stays empty until it is.
 */
export function takeActionButton<T extends { id: string }>(
  items: readonly T[],
  action: MFBAction | undefined
): { actionButton?: T; toolbar: T[] } {
  if (!isExtensionAction(action)) {
    return { toolbar: [...items] };
  }
  return {
    actionButton: items.find((item) => item.id === action),
    toolbar: items.filter((item) => item.id !== action)
  };
}

/**
 * The Action Button choices for the Settings dialog: the built-in actions,
 * then the extensions' buttons. A chosen extension button that is not
 * available is kept, marked as such, so the setting is not lost while its
 * plugin is disabled.
 */
export function actionButtonOptions(
  builtIn: ReadonlyMap<string, string>,
  extensionButtons: ReadonlyArray<{ id: string; label: string }>,
  selected: MFBAction | undefined
): Array<[string, string]> {
  const options: Array<[string, string]> = [
    ...builtIn,
    ...extensionButtons.map((b): [string, string] => [b.id, b.label])
  ];
  if (
    selected &&
    isExtensionAction(selected) &&
    !options.some(([id]) => id === selected)
  ) {
    options.push([selected, `${selected.slice(4)} (unavailable)`]);
  }
  return options;
}
