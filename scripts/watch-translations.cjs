#!/usr/bin/env node
/**
 * Watch en.json and auto-translate to fr.json on changes
 * This runs alongside the dev server for live translation updates
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EN_FILE = path.join(__dirname, '../src/lib/i18n/en.json');
let debounceTimer = null;

console.log('👀 Watching en.json for changes...\n');

fs.watch(EN_FILE, (eventType) => {
  if (eventType === 'change') {
    // Debounce to avoid multiple triggers
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      console.log('📝 en.json changed, translating...\n');
      
      const translate = spawn('node', [path.join(__dirname, 'translate-i18n.cjs')], {
        stdio: 'inherit'
      });
      
      translate.on('close', (code) => {
        if (code === 0) {
          console.log('👀 Watching for more changes...\n');
        }
      });
    }, 500);
  }
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Stopped watching');
  process.exit(0);
});
