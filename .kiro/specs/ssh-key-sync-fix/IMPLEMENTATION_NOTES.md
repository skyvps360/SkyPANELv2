# SSH Key Synchronization Fix - Implementation Notes

## Overview

This document provides guidance for developers working with the SSH key synchronization system and troubleshooting synchronization issues.

## White-Label Messaging Approach

### Philosophy

The platform operates as a white-label reseller, meaning end users should never see the names of underlying cloud providers (Linode, DigitalOcean). All user-facing messages use generic terminology like "cloud providers" instead of specific provider names.

### Implementation

**White-Label Utility Module** (`api/lib/whiteLabel.ts`):
- `getSSHKeySuccessMessage()` - Generates success messages for key creation
- `getSSHKeyDeleteMessage()` - Generates success messages for key deletion
- `getActivityLogMessage()` - Generates activity log entries
- `buildActivityMetadata()` - Creates metadata structure with provider details hidden from users

**Usage Example**:
```typescript
const providerResults: ProviderResult[] = [
  { provider: 'linode', success: true, providerId: '12345' },
  { provider: 'digitalocean', success: true, providerId: 67890 }
];

const message = getSSHKeySuccessMessage('my-key', providerResults);
// Returns: { 
//   message: "SSH key 'my-key' added successfully",
//   description: "The key has been synchronized to all cloud providers.",
//   isPartial: false
// }
```

### Frontend Updates

All user-facing text has been updated to remove provider names:
- Page descriptions use "all cloud providers"
- Toast notifications use generic messages
- Provider badges show count instead of names
- Delete dialogs reference "providers" generically

## Token Retrieval and Encryption

### How It Works

1. Provider API tokens are stored encrypted in the `service_providers` table
2. The `getProviderTokens()` function queries active providers
3. Tokens are decrypted using the platform encryption key
4. Decrypted tokens are passed to service methods

### Enhanced Logging

The updated `getProviderTokens()` function now logs:
- Database query execution and row count
- Each provider type found
- Token decryption attempts (with masked preview)
- Validation that tokens are non-empty
- Final summary of available tokens

**Log Output Example**:
```
🔍 Fetching provider tokens from database...
📊 Database query returned 2 active provider(s): linode, digitalocean
🔓 Attempting to decrypt linode API token...
✅ Successfully decrypted linode token: abcd...xyz1
🔓 Attempting to decrypt digitalocean API token...
✅ Successfully decrypted digitalocean token: efgh...uvw2
🔑 Token retrieval summary: { hasLinode: true, hasDigitalOcean: true, totalProviders: 2 }
```

## SSH Key Synchronization Flow

### Creation Flow

1. User submits SSH key through `/ssh-keys` page
2. Backend validates key format and generates fingerprint
3. Backend retrieves provider tokens from database
4. Backend calls provider APIs in parallel:
   - `linodeService.createSSHKey(token, name, publicKey)`
   - `digitalOceanService.createSSHKey(token, name, publicKey)`
5. Backend stores key in database with provider IDs
6. Backend logs activity with white-label message
7. Frontend displays success/warning toast

### Deletion Flow

1. User confirms deletion through delete dialog
2. Backend retrieves key and provider tokens
3. Backend calls provider APIs in parallel:
   - `linodeService.deleteSSHKey(token, keyId)`
   - `digitalOceanService.deleteSSHKey(token, keyId)`
4. Backend removes key from database
5. Backend logs activity with white-label message
6. Frontend displays success/warning toast

### Error Handling

**Partial Success**: If one provider succeeds and another fails, the operation is marked as partial success. The key is still saved/deleted, but a warning is shown to the user.

**Complete Failure**: If all providers fail, the key is still saved in the database (for creation) or removed (for deletion), but an error message is shown.

**No Providers**: If no providers are configured, the operation succeeds locally without attempting synchronization.

## Troubleshooting Guide

### Issue: SSH Keys Not Syncing to Providers

**Symptoms**:
- Keys appear in database but not in provider accounts
- No provider IDs stored in `linode_key_id` or `digitalocean_key_id` columns

**Diagnostic Steps**:

1. **Check Provider Configuration**:
```sql
SELECT id, type, active, created_at 
FROM service_providers 
WHERE type IN ('linode', 'digitalocean');
```

Expected: At least one row with `active = true`

2. **Run Diagnostics Script**:
```bash
node scripts/test-ssh-key-sync.js
```

This will:
- Check if providers are configured
- Verify tokens can be decrypted
- Test API connectivity
- Display detailed status

3. **Check Server Logs**:

Look for these log patterns:
- `🔍 Fetching provider tokens from database...`
- `🚀 Attempting to add SSH key to [Provider]...`
- `✅ SSH key added to [Provider] successfully`
- `❌ Failed to add SSH key to [Provider]`

4. **Verify Token Decryption**:

If tokens can't be decrypted, check:
- `ENCRYPTION_KEY` environment variable is set
- Same encryption key used when tokens were stored
- Database contains encrypted tokens (not plaintext)

5. **Test Provider APIs Directly**:

```javascript
// Test Linode
const response = await fetch('https://api.linode.com/v4/profile/sshkeys', {
  headers: {
    'Authorization': `Bearer YOUR_TOKEN`,
    'Content-Type': 'application/json'
  }
});
console.log('Status:', response.status);

// Test DigitalOcean
const response = await fetch('https://api.digitalocean.com/v2/account/keys', {
  headers: {
    'Authorization': `Bearer YOUR_TOKEN`,
    'Content-Type': 'application/json'
  }
});
console.log('Status:', response.status);
```

### Issue: Provider Names Showing to Users

**Symptoms**:
- Users see "Linode" or "DigitalOcean" in notifications
- Provider badges show specific names

**Check These Locations**:
- Toast notifications in `src/pages/SshKeys.tsx`
- Activity log messages in `api/routes/sshKeys.ts`
- Delete dialog in `src/components/SSHKeys/DeleteSSHKeyDialog.tsx`
- Any custom error messages

**Solution**:
Use the white-label utility functions:
```typescript
import { getSSHKeySuccessMessage } from '@/lib/whiteLabel';

const message = getSSHKeySuccessMessage(keyName, providerResults);
toast.success(message.message, { description: message.description });
```

### Issue: Partial Success Not Handled Correctly

**Symptoms**:
- Operation succeeds on one provider but fails on another
- User sees error instead of warning
- Key not saved in database

**Check**:
1. Provider results array is built correctly
2. White-label message function is called
3. `partialSuccess` flag is set in response
4. Frontend handles `partialSuccess` with warning toast

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Linode API token not configured" | No token in database or decryption failed | Check provider configuration in admin panel |
| "DigitalOcean API token not provided" | Token not passed to service method | Verify `getProviderTokens()` returns token |
| "Invalid SSH public key format" | Key doesn't match expected format | Validate key starts with `ssh-rsa`, `ssh-ed25519`, etc. |
| "This SSH key already exists" | Duplicate fingerprint | User already has this key, use existing one |
| "Rate limit exceeded" | Too many API requests | Wait and retry, or check rate limiting configuration |

## Testing Checklist

Before deploying changes:

- [ ] Run diagnostics script: `node scripts/test-ssh-key-sync.js`
- [ ] Add SSH key through UI and verify it appears in both provider accounts
- [ ] Delete SSH key and verify it's removed from both provider accounts
- [ ] Test with one provider unavailable (disable in admin panel)
- [ ] Verify no provider names appear in user-facing messages
- [ ] Check server logs for detailed synchronization information
- [ ] Test with invalid SSH key format
- [ ] Test with duplicate SSH key

## Performance Considerations

- Token retrieval happens once per SSH key operation (acceptable overhead)
- Provider API calls are parallelized using `Promise.all`
- Enhanced logging adds minimal overhead (~1-2ms per operation)
- No additional database queries required beyond existing schema

## Security Notes

- API tokens are always encrypted in database
- Tokens are only decrypted when needed for API calls
- Tokens are masked in logs (show only first 4 + last 4 characters)
- Provider-specific details stored in activity log metadata (admin-only)
- User-facing messages never expose provider names or IDs

## Future Enhancements

Potential improvements for future iterations:

1. **Retry Logic**: Add configurable retry attempts for failed synchronizations
2. **Background Sync**: Queue failed synchronizations for retry in background
3. **Provider Health Monitoring**: Track provider API availability and alert admins
4. **Bulk Operations**: Support adding/deleting multiple keys at once
5. **Key Rotation**: Automated key rotation with provider synchronization
6. **Audit Trail**: Enhanced audit logging for compliance requirements
