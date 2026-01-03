#!/usr/bin/env node
/**
 * Service Worker Build Timestamp Script
 * 
 * Automatically updates the BUILD_TIMESTAMP in service worker files
 * to ensure browsers detect the new version on every deployment.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const swFiles = [
  'static/sw-v4.0.js',
  'static/sw.js'
];

const timestamp = new Date().toISOString();
const buildId = `${Date.now()}`;

console.log(`📦 Stamping service workers with build: ${buildId}`);

for (const file of swFiles) {
  const filePath = join(rootDir, file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Update or add BUILD_TIMESTAMP
    if (content.includes('const BUILD_TIMESTAMP')) {
      // Replace existing timestamp
      content = content.replace(
        /const BUILD_TIMESTAMP = ['"][^'"]*['"];/,
        `const BUILD_TIMESTAMP = '${timestamp}';`
      );
    } else {
      // Add timestamp after SW_VERSION line
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

console.log('✨ Service worker stamping complete');
