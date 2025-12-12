#!/usr/bin/env node

/**
 * Translation Key Scanner
 * 
 * Scans the codebase for $_() translation calls and compares them
 * against the translation files to find missing keys.
 * 
 * Usage: node scripts/scan-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Patterns to match translation key usage
const TRANSLATION_PATTERNS = [
  /\$_\(['"]([^'"]+)['"]/g,           // $_('key') or $_("key")
  /\$_\(`([^`]+)`/g,                   // $_(`key`)
  /\$t\(['"]([^'"]+)['"]/g,           // $t('key') (alias)
  /t\(['"]([^'"]+)['"]/g,             // t('key') in scripts
];

// Files to scan
const FILE_PATTERNS = [
  'src/**/*.svelte',
  'src/**/*.ts',
  'src/**/*.js',
];

// Files to ignore
const IGNORE_PATTERNS = [
  'node_modules/**',
  'build/**',
  '.svelte-kit/**',
  'src/lib/i18n/**', // Don't scan the i18n folder itself
];

async function loadTranslations(langFile) {
  try {
    const content = fs.readFileSync(langFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${langFile}:`, error.message);
    return null;
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();

  for (const pattern of TRANSLATION_PATTERNS) {
    let match;
    // Reset regex
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      // Skip dynamic keys (containing variables)
      if (!match[1].includes('${') && !match[1].includes('{')) {
        keys.add(match[1]);
      }
    }
  }

  return Array.from(keys);
}

async function scanCodebase() {
  const usedKeys = new Map(); // key -> [files using it]

  for (const pattern of FILE_PATTERNS) {
    const files = await glob(pattern, {
      cwd: rootDir,
      ignore: IGNORE_PATTERNS,
    });

    for (const file of files) {
      const filePath = path.join(rootDir, file);
      const keys = extractKeysFromFile(filePath);
      
      for (const key of keys) {
        if (!usedKeys.has(key)) {
          usedKeys.set(key, []);
        }
        usedKeys.get(key).push(file);
      }
    }
  }

  return usedKeys;
}

async function main() {
  console.log('🔍 Scanning translation usage...\n');

  // Load translation files
  const enPath = path.join(rootDir, 'src/lib/i18n/translations/en.json');
  const frPath = path.join(rootDir, 'src/lib/i18n/translations/fr.json');

  const enTranslations = await loadTranslations(enPath);
  const frTranslations = await loadTranslations(frPath);

  if (!enTranslations || !frTranslations) {
    console.error('Failed to load translation files');
    process.exit(1);
  }

  const enKeys = new Set(flattenKeys(enTranslations));
  const frKeys = new Set(flattenKeys(frTranslations));

  // Scan codebase for used keys
  const usedKeys = await scanCodebase();

  console.log(`📊 Translation Statistics:\n`);
  console.log(`   English keys: ${enKeys.size}`);
  console.log(`   French keys:  ${frKeys.size}`);
  console.log(`   Keys used in code: ${usedKeys.size}\n`);

  // Find missing translations
  const missingInEn = [];
  const missingInFr = [];
  const unusedKeys = [];

  for (const key of usedKeys.keys()) {
    if (!enKeys.has(key)) {
      missingInEn.push({ key, files: usedKeys.get(key) });
    }
    if (!frKeys.has(key)) {
      missingInFr.push({ key, files: usedKeys.get(key) });
    }
  }

  // Find unused keys (in translations but not in code)
  for (const key of enKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }

  // Report missing in English
  if (missingInEn.length > 0) {
    console.log(`❌ Missing in English (${missingInEn.length}):\n`);
    for (const { key, files } of missingInEn.slice(0, 20)) {
      console.log(`   "${key}"`);
      console.log(`      Used in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}\n`);
    }
    if (missingInEn.length > 20) {
      console.log(`   ... and ${missingInEn.length - 20} more\n`);
    }
  } else {
    console.log(`✅ All used keys exist in English\n`);
  }

  // Report missing in French
  if (missingInFr.length > 0) {
    console.log(`❌ Missing in French (${missingInFr.length}):\n`);
    for (const { key, files } of missingInFr.slice(0, 20)) {
      console.log(`   "${key}"`);
      console.log(`      Used in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}\n`);
    }
    if (missingInFr.length > 20) {
      console.log(`   ... and ${missingInFr.length - 20} more\n`);
    }
  } else {
    console.log(`✅ All used keys exist in French\n`);
  }

  // Report unused keys
  if (unusedKeys.length > 0) {
    console.log(`⚠️  Unused translation keys (${unusedKeys.length}):\n`);
    for (const key of unusedKeys.slice(0, 15)) {
      console.log(`   "${key}"`);
    }
    if (unusedKeys.length > 15) {
      console.log(`   ... and ${unusedKeys.length - 15} more\n`);
    }
    console.log(`\n   Note: Some keys may be used dynamically and not detected by this scan.\n`);
  } else {
    console.log(`✅ All translation keys are used\n`);
  }

  // Summary
  const hasIssues = missingInEn.length > 0 || missingInFr.length > 0;
  if (hasIssues) {
    console.log(`\n⚠️  Translation issues found. Please update translation files.\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ All translations are complete!\n`);
  }
}

main().catch(console.error);
