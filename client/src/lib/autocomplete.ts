/** Pure helpers for the Autocomplete combobox, extracted for testability. */

export interface HighlightSegments {
  /** Text before the first match (empty when there is no match). */
  before: string;
  /** The matched substring (empty when there is no match). */
  match: string;
  /** Text after the first match. */
  after: string;
  /** Whether the query was found inside the label. */
  found: boolean;
}

/**
 * Splits `label` around the first case-insensitive occurrence of `query` so the
 * caller can emphasise the matched part. When the query is blank or not found,
 * the whole label is returned as `after` with `found: false`.
 */
export function highlightSegments(label: string, query: string): HighlightSegments {
  const trimmed = query.trim();
  if (!trimmed) return { before: '', match: '', after: label, found: false };

  const start = label.toLowerCase().indexOf(trimmed.toLowerCase());
  if (start === -1) return { before: '', match: '', after: label, found: false };

  return {
    before: label.slice(0, start),
    match: label.slice(start, start + trimmed.length),
    after: label.slice(start + trimmed.length),
    found: true,
  };
}

/**
 * Returns the next highlighted option index for a list-navigation key.
 * Arrow keys wrap around (Down from the last option returns to the first, Up
 * from the first returns to the last). `current` is -1 when nothing is
 * highlighted: Down then selects the first option and Up the last.
 */
export function nextHighlightedIndex(
  key: string,
  current: number,
  count: number
): number {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1;
    default:
      return current;
  }
}
