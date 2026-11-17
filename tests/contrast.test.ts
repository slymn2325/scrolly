import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveDocumentDark } from '../lib/theme.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const color = Number.parseInt(normalized, 16);
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function extractBlock(css: string, marker: string): string {
  const markerAt = css.indexOf(marker);
  assert.ok(markerAt >= 0, `missing ${marker}`);
  const open = css.indexOf('{', markerAt);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`unclosed ${marker}`);
}

function readTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const pattern = /--cik-([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g;
  for (const match of block.matchAll(pattern)) {
    tokens[match[1]] = match[2].toUpperCase();
  }
  return tokens;
}

const PAIRS: Array<{ fg: string; bg: string; min: number }> = [
  { fg: 'text', bg: 'bg', min: 7 },
  { fg: 'text', bg: 'bg-elevated', min: 7 },
  { fg: 'text', bg: 'surface-2', min: 7 },
  { fg: 'text-2', bg: 'bg', min: 4.5 },
  { fg: 'text-2', bg: 'bg-elevated', min: 4.5 },
  { fg: 'text-2', bg: 'surface-2', min: 4.5 },
  { fg: 'on-cta', bg: 'cta', min: 4.5 },
  { fg: 'mint-text', bg: 'mint', min: 4.5 },
  { fg: 'butter-text', bg: 'butter', min: 4.5 },
  { fg: 'rose-text', bg: 'rose', min: 4.5 },
  { fg: 'on-berry', bg: 'berry', min: 4.5 },
  { fg: 'focus', bg: 'bg', min: 3 },
  { fg: 'focus', bg: 'bg-elevated', min: 3 },
  { fg: 'text-3', bg: 'bg', min: 3 },
];

const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const themes = {
  light: readTokens(extractBlock(css, 'cik-theme-light')),
  dark: readTokens(extractBlock(css, 'cik-theme-dark')),
};

for (const [name, tokens] of Object.entries(themes)) {
  for (const pair of PAIRS) {
    test(`${name} ${pair.fg} on ${pair.bg} >= ${pair.min}:1`, () => {
      const foreground = tokens[pair.fg];
      const background = tokens[pair.bg];
      assert.ok(foreground, `missing --cik-${pair.fg}`);
      assert.ok(background, `missing --cik-${pair.bg}`);
      const ratio = contrast(foreground, background);
      assert.ok(
        ratio >= pair.min,
        `${foreground} on ${background} is ${ratio.toFixed(2)}:1, need ${pair.min}:1`,
      );
    });
  }
}

test('light page background is the Çıkartma default', () => {
  assert.equal(themes.light.bg, '#FFF4F7');
});

test('dark page background is the opt-in Çıkartma color', () => {
  assert.equal(themes.dark.bg, '#1E1422');
});

test('z-index scale matches the spec', () => {
  assert.match(css, /--z-content:\s*10;/);
  assert.match(css, /--z-hud:\s*40;/);
  assert.match(css, /--z-rail:\s*45;/);
  assert.match(css, /--z-dock:\s*50;/);
  assert.match(css, /--z-sheet:\s*80;/);
  assert.match(css, /--z-modal:\s*85;/);
  assert.match(css, /--z-toast:\s*90;/);
  assert.match(css, /--z-statusbar:\s*95;/);
});

test('resolveDocumentDark stays light unless the user chose dark or system is dark', () => {
  assert.equal(resolveDocumentDark({ darkMode: true, themeCustomized: false }, true), false);
  assert.equal(resolveDocumentDark({ darkMode: true, themeCustomized: false }, false), false);
  assert.equal(resolveDocumentDark({ darkMode: true, themeCustomized: true }, false), true);
  assert.equal(resolveDocumentDark({ darkMode: false, themeCustomized: true }, true), false);
  assert.equal(
    resolveDocumentDark({ darkMode: false, themeCustomized: true, appearance: 'dark' }, false),
    true,
  );
  assert.equal(
    resolveDocumentDark({ darkMode: true, themeCustomized: true, appearance: 'light' }, true),
    false,
  );
  assert.equal(
    resolveDocumentDark({ darkMode: false, themeCustomized: true, appearance: 'system' }, true),
    true,
  );
  assert.equal(
    resolveDocumentDark({ darkMode: true, themeCustomized: true, appearance: 'system' }, false),
    false,
  );
});

test('root shell does not paint dark before the user chooses it', () => {
  const source = fs.readFileSync(path.join(root, 'components/RootHtmlShell.tsx'), 'utf8');
  assert.equal(source.includes('classList.add(\'dark\')'), false);
  assert.equal(source.includes('className="dark"'), false);
  assert.match(source, /classList\.toggle\('dark', wantDark\)/);
});

test('stored default theme is light', () => {
  const source = fs.readFileSync(path.join(root, 'utils/userMemory.ts'), 'utf8');
  assert.match(source, /darkMode: false/);
  assert.equal(source.includes('darkMode: true'), false);
});
