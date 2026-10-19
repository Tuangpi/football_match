import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  getLanguage,
  getLocale,
  LANGUAGE_STORAGE_KEY,
  message,
  normalizeLanguage,
  readLanguage,
  setLanguage,
  subscribeLanguage,
  translate,
} from "../src/lib/language";
import { myanmar } from "../src/lib/translations";
import { formatPrice } from "../src/lib/currency";
import { atHour, courtDate, formatBooking } from "../src/lib/bookingTime";

test("language preference defaults safely and accepts only supported values", () => {
  for (const value of [null, undefined, "", "mm", "fr", "invalid"]) {
    assert.equal(normalizeLanguage(value), "en");
  }
  assert.equal(normalizeLanguage("my"), "my");
  assert.equal(readLanguage(), "en");
});

test("switching publishes updates, persists preferences and survives blocked storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
  let calls = 0;
  const unsubscribe = subscribeLanguage(() => {
    calls++;
  });
  try {
    setLanguage("my");
    assert.equal(getLanguage(), "my");
    assert.equal(getLocale(), "my-MM");
    assert.equal(stored.get(LANGUAGE_STORAGE_KEY), "my");
    assert.equal(readLanguage(), "my");
    assert.equal(calls, 1);
    unsubscribe();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    assert.equal(readLanguage(), "en");
    assert.doesNotThrow(() => setLanguage("en"));
    assert.equal(calls, 1);
  } finally {
    unsubscribe();
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
    setLanguage("en");
  }
});

test("translations fall back safely and interpolate user content without translating it", () => {
  assert.equal(translate("Home", "en"), "Home");
  assert.equal(translate("Home", "my"), "ပင်မစာမျက်နှာ");
  assert.equal(translate("Unknown server error", "my"), "Unknown server error");
  assert.equal(translate("constructor", "my"), "constructor");
  assert.equal(translate(undefined, "my"), "");
  try {
    setLanguage("my");
    assert.equal(message("Delete {name}", { name: "Home <court>" }), "Home <court> ကို ဖျက်ရန်");
    assert.match(message("{count} courts found", { count: 3 }), /3/);
    assert.equal(message("Unknown {value}", { value: "$&" }), "Unknown $&");
    assert.equal(formatPrice(15000), "15,000 ကျပ်");
    const date = "2026-10-20";
    assert.equal(courtDate(new Date(atHour(date, 0))), date);
    assert.ok(formatBooking({ startsAt: atHour(date, 10), endsAt: atHour(date, 11) }).length > 0);
  } finally {
    setLanguage("en");
  }
  assert.equal(formatPrice(15000), "15,000 MMK");
});

test("all translations are nonempty Myanmar text with matching named parameters", () => {
  for (const [english, translated] of Object.entries(myanmar)) {
    assert.match(translated, /[\u1000-\u109f]/, english);
    const params = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(params(english), params(translated), english);
  }
});

test("UI translation calls have dictionary entries and no untranslated JSX prose remains", () => {
  const source = join(dirname(fileURLToPath(import.meta.url)), "../src");
  const missing: string[] = [];
  const allowedText = new Set(["Football", "Match", "ENG", "&copy;", "contact@footballmatch.app"]);
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || entry.name === "translations.ts") continue;
      const ast = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ["t", "translate", "message"].includes(node.expression.getText(ast))
        ) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument) && !(argument.text in myanmar))
            missing.push(`${file}: ${argument.text}`);
        }
        if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent) && node.expression && ts.isIdentifier(node.expression) && ['step', 'point', 'description'].includes(node.expression.text)) {
          missing.push(`${file}: untranslated display variable ${node.expression.text}`);
        }
        if (ts.isJsxText(node)) {
          const text = node.text.replace(/\s+/g, " ").trim();
          if (/[a-zA-Z]/.test(text) && !allowedText.has(text)) missing.push(`${file}: ${text}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
  walk(source);
  assert.deepEqual(missing, []);
});
