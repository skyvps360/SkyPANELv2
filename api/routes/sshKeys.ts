/**
 * SSH Key Management API routes
 * Handle user SSH key CRUD operations with cross-provider synchronization
 */
import { Router, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../lib/database.js';
import { decryptSecret } from '../lib/crypto.js';
import { linodeService } from '../services/linodeService.js';
import { digitalOceanService } from '../services/DigitalOceanService.js';
import { logActivity } from '../services/activityLogger.js';
import { 
  withRetry, 
  handleProviderError, 
  validateSSHKeyFormat, 
  logError,
  ErrorCodes
} from '../lib/errorHandling.js';
import { 
  getSSHKeySuccessMessage, 
  getSSHKeyDeleteMessage, 
  getActivityLogMessage,
  buildActivityMetadata,
  type ProviderResult
} from '../lib/whiteLabel.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Generate SSH key fingerprint from public key
 */
function generateFingerprint(publicKey: string): string {
  // Extract the key data (remove ssh-rsa, ssh-ed25519, etc. prefix and comment)
  const parts = publicKey.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error('Invalid SSH public key format');
  }
  
  const keyData = parts[1];
  const keyBuffer = Buffer.from(keyData, 'base64');
  
  // Generate MD5 fingerprint (standard SSH fingerprint format)
  const hash = crypto.createHash('md5').update(keyBuffer).digest('hex');
  
  // Format as colon-separated pairs (e.g., "aa:bb:cc:dd:...")
  return hash.match(/.{2}/g)?.join(':') || hash;
}

/**
 * Get provider API tokens from database with enhanced logging
 */
async function getProviderTokens(): Promise<{ linode?: string; digitalocean?: string }> {
  try {
    console.log('🔍 Fetching provider tokens from database...');
    
    const result = await query(
      `SELECT type, api_key_encrypted 
       FROM service_providers 
       WHERE active = true AND type IN ('linode', 'digitalocean')`
    );
    
    console.log(`📊 Database query returned ${result.rows.length} active provider(s):`, 
      result.rows.map((r: any) => r.type).join(', ') || 'none'
    );
    
    const tokens: { linode?: string; digitalocean?: string } = {};
    
    for (const row of result.rows) {
      try {
        console.log(`🔓 Attempting to decrypt ${row.type} API token...`);
        const decrypted = decryptSecret(row.api_key_encrypted);
        
        // Validate token is non-empty
        if (!decrypted || decrypted.trim().length === 0) {
          console.error(`❌ Decrypted ${row.type} token is empty or invalid`);
          continue;
        }
        
        // Mask token for logging (show first 4 and last 4 characters)
        const maskedToken = decrypted.length > 8 
          ? `${decrypted.substring(0, 4)}...${decrypted.substring(decrypted.length - 4)}`
          : '****';
        
        console.log(`✅ Successfully decrypted ${row.type} token: ${maskedToken}`);
        
        if (row.type === 'linode') {
          tokens.linode = decrypted;
        } else if (row.type === 'digitalocean') {
          tokens.digitalocean = decrypted;
        }
      } catch (error: any) {
        console.error(`❌ Failed to decrypt ${row.type} API token:`, {
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    console.log('🔑 Token retrieval summary:', {
      hasLinode: !!tokens.linode,
      hasDigitalOcean: !!tokens.digitalocean,
      totalProviders: Object.keys(tokens).length
    });
    
    return tokens;
  } catch (error: any) {
    console.error('❌ Error fetching provider tokens from database:', {
      error: error.message,
      stack: error.stack
    });
    return {};
  }
}

/**
 * GET /api/ssh-keys
 * Get all SSH keys for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await query(
      `SELECT id, user_id, name, public_key, fingerprint, 
              linode_key_id, digitalocean_key_id, 
              created_at, updated_at
       FROM user_ssh_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const keys = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      public_key: row.public_key,
      fingerprint: row.fingerprint,
      linode_key_id: row.linode_key_id,
      digitalocean_key_id: row.digitalocean_key_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({ keys });
  } catch (error: any) {
    console.error('Error fetching SSH keys:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch SSH keys' });
  }
});

/**
 * POST /api/ssh-keys
 * Create a new SSH key and synchronize to both providers
 */
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be less than 255 characters'),
  body('publicKey').trim().isLength({ min: 1 }).withMessage('Public key is required')
  .matches(/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/=]+/)
    .withMessage('Invalid SSH public key format')
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name, publicKey } = req.body;

    // Validate SSH key format
    const validation = validateSSHKeyFormat(publicKey);
    if (!validation.valid) {
      res.status(400).json({ 
        error: validation.error,
        code: ErrorCodes.SSH_KEY_INVALID
      });
      return;
    }

    // Generate fingerprint
    let fingerprint: string;
    try {
      fingerprint = generateFingerprint(publicKey);
    } catch (error: any) {
      logError('SSH key fingerprint generation', error, { userId: req.user.id });
      res.status(400).json({ 
        error: 'Invalid SSH public key format',
        code: ErrorCodes.SSH_KEY_INVALID
      });
      return;
    }

    // Check for duplicate fingerprint for this user
    const duplicateCheck = await query(
      'SELECT id FROM user_ssh_keys WHERE user_id = $1 AND fingerprint = $2',
      [req.user.id, fingerprint]
    );

    if (duplicateCheck.rows.length > 0) {
      res.status(400).json({ 
        error: 'This SSH key already exists for your account',
        code: ErrorCodes.SSH_KEY_DUPLICATE
      });
      return;
    }

    // Get provider API tokens
    const tokens = await getProviderTokens();

    // Synchronize to providers
    const providerResults: ProviderResult[] = [];
    let linodeKeyId: string | null = null;
    let digitaloceanKeyId: number | null = null;

    // Add to Linode with retry logic
    if (tokens.linode) {
      const tokenPreview = tokens.linode.length > 8 
        ? `${tokens.linode.substring(0, 4)}...${tokens.linode.substring(tokens.linode.length - 4)}`
        : '****';
      
      console.log('🚀 Attempting to add SSH key to Linode...', {
        hasToken: true,
        tokenPreview,
        keyName: name,
        fingerprintPreview: fingerprint.substring(0, 16) + '...'
      });
      
      try {
        const linodeKey = await withRetry(
          () => linodeService.createSSHKey(tokens.linode!, name, publicKey),
          { maxRetries: 2 }
        );
        linodeKeyId = String(linodeKey.id);
        
        console.log('✅ SSH key added to Linode successfully:', {
          providerId: linodeKeyId,
          keyName: name
        });
        
        providerResults.push({
          provider: 'linode',
          success: true,
          providerId: linodeKeyId
        });
      } catch (error: any) {
        console.error('❌ Failed to add SSH key to Linode:', {
          error: error.message,
          status: error.status,
          statusText: error.statusText,
          responseData: error.data
        });
        
        const structuredError = handleProviderError(error, 'linode', 'create SSH key');
        logError('Linode SSH key creation', error, { userId: req.user.id, name });
        
        providerResults.push({
          provider: 'linode',
          success: false,
          error: structuredError.message
        });
      }
    } else {
      console.log('⚠️ Skipping Linode synchronization: No API token configured');
    }

    // Add to DigitalOcean with retry logic
    if (tokens.digitalocean) {
      const tokenPreview = tokens.digitalocean.length > 8 
        ? `${tokens.digitalocean.substring(0, 4)}...${tokens.digitalocean.substring(tokens.digitalocean.length - 4)}`
        : '****';
      
      console.log('🚀 Attempting to add SSH key to DigitalOcean...', {
        hasToken: true,
        tokenPreview,
        keyName: name,
        fingerprintPreview: fingerprint.substring(0, 16) + '...'
      });
      
      try {
        const doKey = await withRetry(
          () => digitalOceanService.createSSHKey(tokens.digitalocean!, name, publicKey),
          { maxRetries: 2 }
        );
        digitaloceanKeyId = doKey.id;
        
        console.log('✅ SSH key added to DigitalOcean successfully:', {
          providerId: digitaloceanKeyId,
          keyName: name
        });
        
        providerResults.push({
          provider: 'digitalocean',
          success: true,
          providerId: digitaloceanKeyId
        });
      } catch (error: any) {
        console.error('❌ Failed to add SSH key to DigitalOcean:', {
          error: error.message,
          status: error.status,
          statusText: error.statusText,
          responseData: error.data
        });
        
        const structuredError = handleProviderError(error, 'digitalocean', 'create SSH key');
        logError('DigitalOcean SSH key creation', error, { userId: req.user.id, name });
        
        providerResults.push({
          provider: 'digitalocean',
          success: false,
          error: structuredError.message
        });
      }
    } else {
      console.log('⚠️ Skipping DigitalOcean synchronization: No API token configured');
    }
    
    // Log final synchronization state
    console.log('📊 SSH key synchronization complete:', {
      keyName: name,
      totalProviders: providerResults.length,
      successful: providerResults.filter(r => r.success).length,
      failed: providerResults.filter(r => !r.success).length,
      results: providerResults.map(r => ({
        provider: r.provider,
        status: r.success ? 'success' : 'failed',
        ...(r.providerId && { id: r.providerId }),
        ...(r.error && { error: r.error })
      }))
    });

    // Store in database
    const insertResult = await query(
      `INSERT INTO user_ssh_keys 
       (user_id, name, public_key, fingerprint, linode_key_id, digitalocean_key_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, user_id, name, public_key, fingerprint, linode_key_id, digitalocean_key_id, created_at, updated_at`,
      [req.user.id, name, publicKey, fingerprint, linodeKeyId, digitaloceanKeyId]
    );

    const newKey = insertResult.rows[0];

    // Generate white-label messages
    const messageData = getSSHKeySuccessMessage(name, providerResults);
    
    // Log activity with white-label message
    try {
      await logActivity({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        eventType: 'ssh_key.create',
        entityType: 'ssh_key',
        entityId: String(newKey.id),
        message: getActivityLogMessage('create', name),
        status: messageData.isPartial ? 'warning' : 'success',
        metadata: buildActivityMetadata(fingerprint, providerResults)
      }, req as any);
    } catch (logError) {
      console.error('Failed to log SSH key creation:', logError);
    }

    const response: any = {
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        public_key: newKey.public_key,
        fingerprint: newKey.fingerprint,
        linode_key_id: newKey.linode_key_id,
        digitalocean_key_id: newKey.digitalocean_key_id,
        created_at: newKey.created_at,
        updated_at: newKey.updated_at
      },
      message: messageData.message,
      description: messageData.description
    };

    if (messageData.isPartial) {
      response.partialSuccess = true;
    }

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating SSH key:', error);
    res.status(500).json({ error: error.message || 'Failed to create SSH key' });
  }
});

/**
 * DELETE /api/ssh-keys/:keyId
 * Delete an SSH key and remove from both providers
 */
router.delete('/:keyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { keyId } = req.params;

    // Verify key belongs to user
    const keyResult = await query(
      `SELECT id, user_id, name, fingerprint, linode_key_id, digitalocean_key_id
       FROM user_ssh_keys
       WHERE id = $1`,
      [keyId]
    );

    if (keyResult.rows.length === 0) {
      res.status(404).json({ error: 'SSH key not found' });
      return;
    }

    const key = keyResult.rows[0];

    if (key.user_id !== req.user.id) {
      res.status(403).json({ error: 'You do not have permission to delete this SSH key' });
      return;
    }

    // Get provider API tokens
    const tokens = await getProviderTokens();

    // Delete from providers
    const providerResults: ProviderResult[] = [];

    // Delete from Linode with retry logic
    if (key.linode_key_id && tokens.linode) {
      console.log('🚀 Attempting to delete SSH key from Linode...', {
        keyId: key.linode_key_id,
        keyName: key.name
      });
      
      try {
        await withRetry(
          () => linodeService.deleteSSHKey(tokens.linode!, key.linode_key_id),
          { maxRetries: 2 }
        );
        
        console.log('✅ SSH key deleted from Linode successfully:', {
          keyId: key.linode_key_id,
          keyName: key.name
        });
        
        providerResults.push({
          provider: 'linode',
          success: true,
          providerId: key.linode_key_id
        });
      } catch (error: any) {
        console.error('❌ Failed to delete SSH key from Linode:', {
          keyId: key.linode_key_id,
          error: error.message,
          status: error.status,
          statusText: error.statusText,
          responseData: error.data
        });
        
        const structuredError = handleProviderError(error, 'linode', 'delete SSH key');
        logError('Linode SSH key deletion', error, { userId: req.user.id, keyId });
        
        providerResults.push({
          provider: 'linode',
          success: false,
          error: structuredError.message
        });
      }
    } else if (key.linode_key_id) {
      console.log('⚠️ Skipping Linode deletion: No API token configured');
    }

    // Delete from DigitalOcean with retry logic
    if (key.digitalocean_key_id && tokens.digitalocean) {
      console.log('🚀 Attempting to delete SSH key from DigitalOcean...', {
        keyId: key.digitalocean_key_id,
        keyName: key.name
      });
      
      try {
        await withRetry(
          () => digitalOceanService.deleteSSHKey(tokens.digitalocean!, key.digitalocean_key_id),
          { maxRetries: 2 }
        );
        
        console.log('✅ SSH key deleted from DigitalOcean successfully:', {
          keyId: key.digitalocean_key_id,
          keyName: key.name
        });
        
        providerResults.push({
          provider: 'digitalocean',
          success: true,
          providerId: key.digitalocean_key_id
        });
      } catch (error: any) {
        console.error('❌ Failed to delete SSH key from DigitalOcean:', {
          keyId: key.digitalocean_key_id,
          error: error.message,
          status: error.status,
          statusText: error.statusText,
          responseData: error.data
        });
        
        const structuredError = handleProviderError(error, 'digitalocean', 'delete SSH key');
        logError('DigitalOcean SSH key deletion', error, { userId: req.user.id, keyId });
        
        providerResults.push({
          provider: 'digitalocean',
          success: false,
          error: structuredError.message
        });
      }
    } else if (key.digitalocean_key_id) {
      console.log('⚠️ Skipping DigitalOcean deletion: No API token configured');
    }
    
    // Log final deletion state
    console.log('📊 SSH key deletion complete:', {
      keyName: key.name,
      totalProviders: providerResults.length,
      successful: providerResults.filter(r => r.success).length,
      failed: providerResults.filter(r => !r.success).length,
      results: providerResults.map(r => ({
        provider: r.provider,
        status: r.success ? 'success' : 'failed',
        ...(r.error && { error: r.error })
      }))
    });

    // Delete from database
    await query('DELETE FROM user_ssh_keys WHERE id = $1', [keyId]);

    // Generate white-label messages
    const messageData = getSSHKeyDeleteMessage(key.name, providerResults);
    
    // Log activity with white-label message
    try {
      await logActivity({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        eventType: 'ssh_key.delete',
        entityType: 'ssh_key',
        entityId: keyId,
        message: getActivityLogMessage('delete', key.name),
        status: messageData.isPartial ? 'warning' : 'success',
        metadata: buildActivityMetadata(key.fingerprint, providerResults)
      }, req as any);
    } catch (logError) {
      console.error('Failed to log SSH key deletion:', logError);
    }

    const response: any = {
      success: true,
      message: messageData.message,
      description: messageData.description
    };

    if (messageData.isPartial) {
      response.partialSuccess = true;
    }

    res.json(response);
  } catch (error: any) {
    console.error('Error deleting SSH key:', error);
    res.status(500).json({ error: error.message || 'Failed to delete SSH key' });
  }
});

export default router;
