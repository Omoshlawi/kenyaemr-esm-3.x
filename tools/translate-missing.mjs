// Fills in missing translations for every packages/*/translations/<locale>.json
// file, using en.json as the source of truth. A key is (re)translated only when
// its value in the target file is missing or still equal to the English source,
// so human-reviewed translations are never overwritten.
//
// Translation is performed by a LibreTranslate instance (fully open source).
// Point it at one with LIBRETRANSLATE_URL (defaults to http://localhost:5000).
//
// Usage: node ./tools/translate-missing.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LT_URL = (process.env.LIBRETRANSLATE_URL ?? 'http://localhost:6000').replace(/\/$/, '');
const LT_API_KEY = process.env.LIBRETRANSLATE_API_KEY ?? '';
const SOURCE_LOCALE = 'en';
const BATCH_SIZE = 25;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');

// LibreTranslate can mangle i18next interpolation ({{count}}) and tags (<1>).
// We translate with format=html and replace each placeholder with an empty HTML
// element (<x0></x0>). Argos preserves HTML tags as structure, so the tokens
// survive intact even for low-resource models where plain-text sentinels get
// dropped or translated. The tokens are restored to the originals afterwards.
const PLACEHOLDER = /(\{\{[^}]+\}\}|<\/?[^>]+>)/g;

function maskPlaceholders(text) {
  const tokens = [];
  const masked = text.replace(PLACEHOLDER, (match) => {
    const token = `<x${tokens.length}></x${tokens.length}>`;
    tokens.push(match);
    return token;
  });
  return { masked, tokens };
}

// Defensive: some LibreTranslate builds HTML-escape output in html mode.
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function restorePlaceholders(text, tokens) {
  let out = decodeEntities(text);
  for (let i = 0; i < tokens.length; i++) {
    const token = `<x${i}></x${i}>`;
    if (!out.includes(token)) {
      return null; // a placeholder was lost in translation; caller keeps English
    }
    out = out.replace(token, tokens[i]);
  }
  return out;
}

async function getSupportedTargets() {
  const res = await fetch(`${LT_URL}/languages`);
  if (!res.ok) {
    throw new Error(`Could not reach LibreTranslate at ${LT_URL}/languages (HTTP ${res.status})`);
  }
  const langs = await res.json();
  return new Set(langs.map((l) => l.code));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function postWithRetry(url, body, target, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const backoff = 1000 * 2 ** (attempt - 1);
        console.warn(`  · request for "${target}" failed (attempt ${attempt}/${attempts}), retrying in ${backoff}ms`);
        await sleep(backoff);
      }
    }
  }
  throw new Error(`Translate request failed for "${target}" after ${attempts} attempts: ${lastError?.message ?? lastError}`);
}

async function translateBatch(texts, target) {
  const masked = texts.map((t) => maskPlaceholders(t));
  const body = {
    q: masked.map((m) => m.masked),
    source: SOURCE_LOCALE,
    target,
    format: 'html',
  };
  if (LT_API_KEY) {
    body.api_key = LT_API_KEY;
  }

  const data = await postWithRetry(`${LT_URL}/translate`, body, target);
  const translated = Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];

  return translated.map((value, i) => {
    const restored = restorePlaceholders(value, masked[i].tokens);
    // If placeholders could not be restored, fall back to the English source.
    return restored ?? texts[i];
  });
}

function discoverTranslationDirs() {
  const dirs = [];
  for (const pkg of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const translationsDir = join(PACKAGES_DIR, pkg.name, 'translations');
    if (existsSync(join(translationsDir, `${SOURCE_LOCALE}.json`))) {
      dirs.push(translationsDir);
    }
  }
  return dirs;
}

async function processLocaleFile(translationsDir, source, locale, supported) {
  if (!supported.has(locale)) {
    console.warn(`  · skipping "${locale}" — not supported by this LibreTranslate instance`);
    return false;
  }

  const filePath = join(translationsDir, `${locale}.json`);
  const existing = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : {};

  // Decide which keys still need translation.
  const toTranslate = [];
  for (const [key, englishValue] of Object.entries(source)) {
    if (typeof englishValue !== 'string' || englishValue.trim() === '') continue;
    const current = existing[key];
    const untranslated = current == null || current === '' || current === englishValue;
    if (untranslated) toTranslate.push({ key, englishValue });
  }

  if (toTranslate.length === 0) {
    return false;
  }

  // Translate unique English strings in batches to minimise requests.
  const uniqueTexts = [...new Set(toTranslate.map((t) => t.englishValue))];
  const translations = new Map();
  for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
    const chunk = uniqueTexts.slice(i, i + BATCH_SIZE);
    const results = await translateBatch(chunk, locale);
    chunk.forEach((text, idx) => translations.set(text, results[idx]));
  }

  // Rebuild the file in en.json key order, keeping existing good translations.
  const output = {};
  for (const [key, englishValue] of Object.entries(source)) {
    const needsTranslation = toTranslate.find((t) => t.key === key);
    if (needsTranslation) {
      output[key] = translations.get(englishValue) ?? englishValue;
    } else {
      output[key] = existing[key] ?? englishValue;
    }
  }

  writeFileSync(filePath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`  · ${locale}.json — translated ${toTranslate.length} key(s)`);
  return true;
}

async function main() {
  const supported = await getSupportedTargets();
  const dirs = discoverTranslationDirs();
  console.log(`Found ${dirs.length} translation folder(s). LibreTranslate: ${LT_URL}`);

  let changed = false;
  for (const translationsDir of dirs) {
    const source = JSON.parse(readFileSync(join(translationsDir, `${SOURCE_LOCALE}.json`), 'utf8'));
    const locales = readdirSync(translationsDir)
      .filter((f) => f.endsWith('.json') && f !== `${SOURCE_LOCALE}.json`)
      .map((f) => f.replace(/\.json$/, ''));

    if (locales.length === 0) continue;
    console.log(`\n${translationsDir.replace(ROOT + '/', '')}`);
    for (const locale of locales) {
      const didChange = await processLocaleFile(translationsDir, source, locale, supported);
      changed = changed || didChange;
    }
  }

  console.log(changed ? '\nDone — translation files updated.' : '\nDone — nothing to translate.');
}

main().catch((error) => {
  console.error(`\nTranslation run failed: ${error.message ?? error}`);
  process.exit(1);
});
