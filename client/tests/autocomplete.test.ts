import { test } from "node:test";
import assert from "node:assert/strict";
import {
  highlightSegments,
  nextHighlightedIndex,
} from "../src/lib/autocomplete";

test("highlightSegments finds the first case-insensitive match", () => {
  const r = highlightSegments("Yangon United Court", "yangon");
  assert.equal(r.found, true);
  assert.equal(r.before, "");
  assert.equal(r.match, "Yangon");
  assert.equal(r.after, " United Court");
});

test("highlightSegments returns no match for blank or missing queries", () => {
  for (const q of ["", "   ", "mandalay"]) {
    const r = highlightSegments("Yangon United Court", q);
    assert.equal(r.found, false);
    assert.equal(r.after, "Yangon United Court");
  }
});

test("keyboard navigation wraps and starts from the right end", () => {
  // Nothing highlighted: Down starts at first, Up at last.
  assert.equal(nextHighlightedIndex("ArrowDown", -1, 3), 0);
  assert.equal(nextHighlightedIndex("ArrowUp", -1, 3), 2);
  // Wrapping at both ends.
  assert.equal(nextHighlightedIndex("ArrowDown", 2, 3), 0);
  assert.equal(nextHighlightedIndex("ArrowUp", 0, 3), 2);
  // Empty list never highlights.
  assert.equal(nextHighlightedIndex("ArrowDown", 0, 0), -1);
});
