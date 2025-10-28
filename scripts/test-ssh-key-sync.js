/**
 * Test script for SSH key synchronization
 * Run this to verify provider tokens and API connectivity
 * 
 * Usage: node scripts/test-ssh-key-sync.js
 */

import { runDiagnostics } from '../api/lib/diagnostics.js';

console.log('Starting SSH key synchronization diagnostics...\n');

runDiagnostics()
  .then(() => {
    console.log('Diagnostics completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostics failed:', error);
    process.exit(1);
  });
