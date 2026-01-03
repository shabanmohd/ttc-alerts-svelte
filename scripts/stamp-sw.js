#!/usr/bin/env node
/**
 * Build Stamping Script
 * 
 * Automatically updates:
 * 1. BUILD_TIMESTAMP in service worker files (for SW update detection)
 * 2. build-info.ts (for app version display)
 * 
 * This ensures browsers detect new versions on every deployment.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const timestamp = new Date().toISOString();
const buildId = Date.now().toString(36); // Base36 for shorter IDs

console.log(`📦 Stamping build: ${buildId} (${timestamp})`);

// 1. Update Service Worker files
const swFiles = [
  'static/sw-v4.0.js',
  'static/sw.js'
];

console.log('\n🔧 Service Workers:');
for (const file of swFiles) {
  const filePath = join(rootDir, file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Update or add BUILD_TIMESTAMP
    if (content.includes('const BUILD_TIMESTAMP')) {
      content = content.replace(
        /const BUILD_TIMESTAMP = ['"][^'"]*['"];/,
        `const BUILD_TIMESTAMP = '${timestamp}';`
      );
    } else {
      content = content.replace(
        /(const SW_VERSION = ['"][^'"]*['"];)/,
        `$1\nconst BUILD_TIMESTAMP = '${timestamp}';`
      );
    }
    
    writeFileSync(filePath, content);
    console.log(`  ✅ ${file}`);
  } catch (err) {
    console.error(`  ❌ ${file}: ${err.message}`);
  }
}

// 2. Update build-info.ts
const buildInfoPath = join(rootDir, 'src/lib/build-info.ts');
console.log('\n📱 App Version:');

try {
  let content = readFileSync(buildInfoPath, 'utf-8');
  
  // Update timestamp
  content = content.replace(
    /timestamp: ['"][^'"]*['"]/,
    `timestamp: '${timestamp}'`
  );
  
  // Update buildId
  content = content.replace(
    /buildId: ['"][^'"]*['"]/,
    `buildId: '${buildId}'`
  );
  
  writeFileSync(buildInfoPath, content);
  console.log(`  ✅ src/lib/build-info.ts`);
} catch (err) {
  console.error(`  ❌ src/lib/build-info.ts: ${err.message}`);
}

console.log('\n✨ Build stamping complete');

