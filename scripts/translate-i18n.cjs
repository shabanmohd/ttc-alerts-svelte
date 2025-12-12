#!/usr/bin/env node
/**
 * Automated i18n Translation Script
 * 
 * Uses DeepL API for high-quality translations
 * Falls back to MyMemory (free) if no API key
 * 
 * Usage:
 *   npm run translate
 *   npm run translate:check  (dry-run, shows missing keys)
 */

const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const I18N_DIR = path.join(__dirname, '../src/lib/i18n');
const SOURCE_FILE = path.join(I18N_DIR, 'en.json');
const TARGET_FILE = path.join(I18N_DIR, 'fr.json');

// Also copy to translations folder (where the app loads from)
const TRANSLATIONS_DIR = path.join(I18N_DIR, 'translations');
const TRANSLATIONS_SOURCE_FILE = path.join(TRANSLATIONS_DIR, 'en.json');
const TRANSLATIONS_TARGET_FILE = path.join(TRANSLATIONS_DIR, 'fr.json');

// DeepL API - check both possible env var names
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || process.env.DEEPL_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// MyMemory API (fallback, 100% free)
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

// Check if this is a dry run
const isDryRun = process.argv.includes('--check') || process.argv.includes('--dry-run');

/**
 * Flatten nested object to dot-notation keys
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten dot-notation keys to nested object
 */
function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Translate using DeepL (high quality)
 */
async function translateWithDeepL(texts) {
  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'EN',
      target_lang: 'FR',
      preserve_formatting: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.translations.map(t => t.text);
}

/**
 * Translate using MyMemory (free fallback)
 */
async function translateWithMyMemory(text) {
  const params = new URLSearchParams({
    q: text,
    langpair: 'en|fr'
  });
  
  const response = await fetch(`${MYMEMORY_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`MyMemory error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory error: ${data.responseDetails || 'Unknown error'}`);
  }
  
  return data.responseData.translatedText;
}

/**
 * Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main translation function
 */
async function main() {
  const useDeepL = !!DEEPL_API_KEY;
  const provider = useDeepL ? 'DeepL' : 'MyMemory (free fallback)';
  
  console.log(`🌐 i18n Translation Script (${provider})\n`);

  // Read source and target files
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  const sourceJson = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  let targetJson = {};
  
  if (fs.existsSync(TARGET_FILE)) {
    targetJson = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf-8'));
  }

  // Flatten both
  const sourceFlat = flattenObject(sourceJson);
  const targetFlat = flattenObject(targetJson);

  // Find missing keys
  const missingKeys = Object.keys(sourceFlat).filter(key => !(key in targetFlat));

  if (missingKeys.length === 0) {
    // Still sync to translations folder in case files got out of sync
    fs.copyFileSync(SOURCE_FILE, TRANSLATIONS_SOURCE_FILE);
    fs.copyFileSync(TARGET_FILE, TRANSLATIONS_TARGET_FILE);
    console.log('✅ All translations are up to date!\n');
    return;
  }

  console.log(`📝 Found ${missingKeys.length} missing translation(s):\n`);
  
  for (const key of missingKeys) {
    console.log(`   - ${key}: "${sourceFlat[key]}"`);
  }
  console.log('');

  if (isDryRun) {
    console.log('ℹ️  Dry run mode. Run without --check to translate.\n');
    process.exit(missingKeys.length > 0 ? 1 : 0);
  }

  console.log('🔄 Translating...\n');

  let successCount = 0;

  if (useDeepL) {
    // DeepL supports batch translation
    const BATCH_SIZE = 50;
    const textsToTranslate = missingKeys.map(key => sourceFlat[key]);
    
    for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
      const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
      const batchKeys = missingKeys.slice(i, i + BATCH_SIZE);
      
      try {
        const translations = await translateWithDeepL(batch);
        
        for (let j = 0; j < translations.length; j++) {
          const key = batchKeys[j];
          const original = batch[j];
          const translated = translations[j];
          
          targetFlat[key] = translated;
          console.log(`   ✓ ${key}`);
          console.log(`     EN: "${original}"`);
          console.log(`     FR: "${translated}"\n`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ DeepL translation failed:`, error.message);
        process.exit(1);
      }
    }
  } else {
    // MyMemory - one at a time
    for (const key of missingKeys) {
      const original = sourceFlat[key];
      
      try {
        const translated = await translateWithMyMemory(original);
        
        targetFlat[key] = translated;
        console.log(`   ✓ ${key}`);
        console.log(`     EN: "${original}"`);
        console.log(`     FR: "${translated}"\n`);
        successCount++;
        
        await sleep(300);
      } catch (error) {
        console.error(`   ✗ ${key}: ${error.message}`);
      }
    }
  }

  // Unflatten and write back
  const newTargetJson = unflattenObject(targetFlat);
  fs.writeFileSync(TARGET_FILE, JSON.stringify(newTargetJson, null, 2) + '\n');
  
  // Also copy to translations folder (where the app loads from)
  fs.copyFileSync(SOURCE_FILE, TRANSLATIONS_SOURCE_FILE);
  fs.copyFileSync(TARGET_FILE, TRANSLATIONS_TARGET_FILE);

  console.log(`✅ Updated ${TARGET_FILE}`);
  console.log(`   (Also synced to ${TRANSLATIONS_DIR})`);
  console.log(`   Translated ${successCount}/${missingKeys.length} key(s)\n`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
