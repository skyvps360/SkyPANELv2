/**
 * Diagnostic utilities for SSH key synchronization debugging
 * Provides tools to test provider connectivity and token status
 */

import { query } from './database.js';
import { decryptSecret } from './crypto.js';
import { linodeService } from '../services/linodeService.js';
import { digitalOceanService } from '../services/DigitalOceanService.js';

/**
 * Mask sensitive token for safe logging
 * Shows only first 4 and last 4 characters
 */
export function maskToken(token: string): string {
  if (!token || token.length <= 8) {
    return '****';
  }
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Check provider token status and log details
 * Useful for debugging SSH key synchronization issues
 */
export async function checkProviderTokens(): Promise<{
  linode: { configured: boolean; valid?: boolean; error?: string; tokenPreview?: string };
  digitalocean: { configured: boolean; valid?: boolean; error?: string; tokenPreview?: string };
}> {
  const result: any = {
    linode: { configured: false },
    digitalocean: { configured: false }
  };

  try {
    console.log('🔍 Checking provider token configuration...');
    
    const dbResult = await query(
      `SELECT type, api_key_encrypted, active 
       FROM service_providers 
       WHERE type IN ('linode', 'digitalocean')`
    );

    console.log(`📊 Found ${dbResult.rows.length} provider(s) in database`);

    for (const row of dbResult.rows) {
      const providerType = row.type as 'linode' | 'digitalocean';
      
      try {
        // Check if provider is active
        if (!row.active) {
          result[providerType] = {
            configured: true,
            valid: false,
            error: 'Provider is not active'
          };
          console.log(`⚠️ ${providerType}: Provider exists but is not active`);
          continue;
        }

        // Try to decrypt token
        const decrypted = decryptSecret(row.api_key_encrypted);
        
        if (!decrypted || decrypted.trim().length === 0) {
          result[providerType] = {
            configured: true,
            valid: false,
            error: 'Decrypted token is empty'
          };
          console.log(`❌ ${providerType}: Token decrypted but is empty`);
          continue;
        }

        const tokenPreview = maskToken(decrypted);
        
        result[providerType] = {
          configured: true,
          valid: true,
          tokenPreview
        };
        
        console.log(`✅ ${providerType}: Token configured and decrypted successfully (${tokenPreview})`);
      } catch (error: any) {
        result[providerType] = {
          configured: true,
          valid: false,
          error: error.message
        };
        console.error(`❌ ${providerType}: Failed to decrypt token:`, error.message);
      }
    }

    // Check for missing providers
    if (!result.linode.configured) {
      console.log('⚠️ Linode: No provider configuration found in database');
    }
    if (!result.digitalocean.configured) {
      console.log('⚠️ DigitalOcean: No provider configuration found in database');
    }

  } catch (error: any) {
    console.error('❌ Error checking provider tokens:', error.message);
  }

  return result;
}

/**
 * Test provider API connectivity
 * Makes actual API calls to verify tokens work
 */
export async function testProviderConnectivity(): Promise<{
  linode: { success: boolean; message: string };
  digitalocean: { success: boolean; message: string };
}> {
  const result: any = {
    linode: { success: false, message: 'Not tested' },
    digitalocean: { success: false, message: 'Not tested' }
  };

  try {
    console.log('🔍 Testing provider API connectivity...');
    
    const dbResult = await query(
      `SELECT type, api_key_encrypted 
       FROM service_providers 
       WHERE active = true AND type IN ('linode', 'digitalocean')`
    );

    for (const row of dbResult.rows) {
      const providerType = row.type as 'linode' | 'digitalocean';
      
      try {
        const token = decryptSecret(row.api_key_encrypted);
        
        if (providerType === 'linode') {
          console.log('🚀 Testing Linode API connection...');
          const testResult = await linodeService.testConnection(token);
          result.linode = testResult;
          
          if (testResult.success) {
            console.log('✅ Linode API: Connection successful');
          } else {
            console.error('❌ Linode API: Connection failed -', testResult.message);
          }
        } else if (providerType === 'digitalocean') {
          console.log('🚀 Testing DigitalOcean API connection...');
          const testResult = await digitalOceanService.testConnection(token);
          result.digitalocean = testResult;
          
          if (testResult.success) {
            console.log('✅ DigitalOcean API: Connection successful');
          } else {
            console.error('❌ DigitalOcean API: Connection failed -', testResult.message);
          }
        }
      } catch (error: any) {
        result[providerType] = {
          success: false,
          message: `Error: ${error.message}`
        };
        console.error(`❌ ${providerType}: Test failed -`, error.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Error testing provider connectivity:', error.message);
  }

  return result;
}

/**
 * Run complete diagnostic check
 * Checks token configuration and API connectivity
 */
export async function runDiagnostics(): Promise<void> {
  console.log('\n========================================');
  console.log('🔧 SSH Key Synchronization Diagnostics');
  console.log('========================================\n');

  // Check token configuration
  console.log('Step 1: Checking provider token configuration...\n');
  const tokenStatus = await checkProviderTokens();
  
  console.log('\n📊 Token Status Summary:');
  console.log('  Linode:', tokenStatus.linode.configured ? 
    (tokenStatus.linode.valid ? `✅ Valid (${tokenStatus.linode.tokenPreview})` : `❌ Invalid: ${tokenStatus.linode.error}`) : 
    '⚠️ Not configured'
  );
  console.log('  DigitalOcean:', tokenStatus.digitalocean.configured ? 
    (tokenStatus.digitalocean.valid ? `✅ Valid (${tokenStatus.digitalocean.tokenPreview})` : `❌ Invalid: ${tokenStatus.digitalocean.error}`) : 
    '⚠️ Not configured'
  );

  // Test API connectivity
  console.log('\n\nStep 2: Testing provider API connectivity...\n');
  const connectivity = await testProviderConnectivity();
  
  console.log('\n📊 Connectivity Status Summary:');
  console.log('  Linode:', connectivity.linode.success ? '✅ Connected' : `❌ ${connectivity.linode.message}`);
  console.log('  DigitalOcean:', connectivity.digitalocean.success ? '✅ Connected' : `❌ ${connectivity.digitalocean.message}`);

  console.log('\n========================================');
  console.log('✅ Diagnostics Complete');
  console.log('========================================\n');
}
