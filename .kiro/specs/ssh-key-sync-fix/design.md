# Design Document

## Overview

This design addresses two critical issues in the SSH key management system:

1. **SSH keys failing to synchronize with provider APIs** - Keys are stored in the database but the API calls to Linode and DigitalOcean are not executing successfully
2. **Provider names exposed in notifications** - The white-label model is broken by showing "Linode" and "DigitalOcean" in user-facing messages

The root cause analysis reveals:
- The `sshKeys.ts` route correctly calls `linodeService.createSSHKey()` and `digitalOceanService.createSSHKey()`
- However, these methods require API tokens to be passed as parameters
- The route retrieves tokens from the database using `getProviderTokens()` which queries the `service_providers` table
- The issue is likely that tokens are not being properly retrieved or passed to the service methods
- Notifications and activity logs directly reference provider names instead of using generic white-label terminology

## Architecture

### Component Interaction Flow

```
User Action (Add SSH Key)
    ↓
Frontend (SshKeys.tsx)
    ↓
API Route (sshKeys.ts)
    ↓
├─→ getProviderTokens() → Database Query → Decrypt Tokens
│   ↓
├─→ linodeService.createSSHKey(token, name, publicKey)
│   ↓
├─→ digitalOceanService.createSSHKey(token, name, publicKey)
│   ↓
└─→ Database Insert (user_ssh_keys table)
    ↓
Activity Logger → Notification System → User
```

### Key Issues Identified

1. **Token Retrieval**: The `getProviderTokens()` function may be failing silently or returning empty tokens
2. **Error Handling**: Provider API errors are caught but may not be properly logged with sufficient detail
3. **White-Label Violations**: Multiple locations expose provider names:
   - Frontend toast messages mention "Linode and DigitalOcean"
   - Activity log messages include provider names
   - Frontend UI shows provider badges with "Linode" and "DigitalOcean" labels

## Components and Interfaces

### 1. Enhanced Token Retrieval

**File**: `api/routes/sshKeys.ts`

**Current Implementation**:
```typescript
async function getProviderTokens(): Promise<{ linode?: string; digitalocean?: string }> {
  try {
    const result = await query(
      `SELECT type, api_key_encrypted 
       FROM service_providers 
       WHERE active = true AND type IN ('linode', 'digitalocean')`
    );
    
    const tokens: { linode?: string; digitalocean?: string } = {};
    
    for (const row of result.rows) {
      try {
        const decrypted = decryptSecret(row.api_key_encrypted);
        if (row.type === 'linode') {
          tokens.linode = decrypted;
        } else if (row.type === 'digitalocean') {
          tokens.digitalocean = decrypted;
        }
      } catch (error) {
        console.error(`Failed to decrypt ${row.type} API token:`, error);
      }
    }
    
    return tokens;
  } catch (error) {
    console.error('Error fetching provider tokens:', error);
    return {};
  }
}
```

**Issues**:
- Errors are logged but swallowed, returning empty object
- No validation that tokens were actually retrieved
- No detailed logging of database query results

**Enhanced Design**:
- Add detailed logging before and after database query
- Log the number of providers found and their types
- Validate that decrypted tokens are non-empty strings
- Log token presence (first 4 and last 4 characters only for security)
- Throw errors if no providers are configured instead of silently returning empty object

### 2. Provider API Call Debugging

**Files**: 
- `api/routes/sshKeys.ts` (POST and DELETE endpoints)
- `api/services/linodeService.ts` (createSSHKey, deleteSSHKey)
- `api/services/DigitalOceanService.ts` (createSSHKey, deleteSSHKey)

**Enhanced Logging Strategy**:

```typescript
// Before API call
console.log('🚀 Attempting to add SSH key to [Provider]...', {
  hasToken: !!token,
  tokenPreview: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : 'none',
  keyName: name,
  fingerprintPreview: fingerprint.substring(0, 16)
});

// After successful API call
console.log('✅ SSH key added to [Provider] successfully:', {
  providerId: result.id,
  keyName: name
});

// After failed API call
console.error('❌ Failed to add SSH key to [Provider]:', {
  error: error.message,
  status: error.status,
  statusText: error.statusText,
  responseData: error.data
});
```

### 3. White-Label Message Abstraction

**New Utility Module**: `api/lib/whiteLabel.ts`

```typescript
/**
 * White-label message utilities
 * Provides generic messaging that hides provider-specific details
 */

export interface ProviderResult {
  provider: 'linode' | 'digitalocean';
  success: boolean;
  error?: string;
}

export function getSSHKeySuccessMessage(keyName: string, results: ProviderResult[]): {
  message: string;
  description: string;
  isPartial: boolean;
} {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    return {
      message: `SSH key '${keyName}' added successfully`,
      description: 'The key has been synchronized to all cloud providers.',
      isPartial: false
    };
  } else if (successCount > 0) {
    return {
      message: `SSH key '${keyName}' added with warnings`,
      description: 'The key was added to your account but some cloud providers could not be synchronized.',
      isPartial: true
    };
  } else {
    return {
      message: `SSH key '${keyName}' saved locally`,
      description: 'The key was saved but could not be synchronized to cloud providers. You may need to add it manually.',
      isPartial: true
    };
  }
}

export function getSSHKeyDeleteMessage(keyName: string, results: ProviderResult[]): {
  message: string;
  description: string;
  isPartial: boolean;
} {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    return {
      message: `SSH key '${keyName}' removed successfully`,
      description: 'The key has been removed from all cloud providers.',
      isPartial: false
    };
  } else if (successCount > 0) {
    return {
      message: `SSH key '${keyName}' removed with warnings`,
      description: 'The key was removed from your account but some cloud providers could not be synchronized.',
      isPartial: true
    };
  } else {
    return {
      message: `SSH key '${keyName}' removed locally`,
      description: 'The key was removed but could not be synchronized to cloud providers.',
      isPartial: true
    };
  }
}

export function getActivityLogMessage(operation: 'create' | 'delete', keyName: string): string {
  return operation === 'create' 
    ? `Added SSH key '${keyName}'`
    : `Removed SSH key '${keyName}'`;
}
```

### 4. Frontend White-Label Updates

**File**: `src/pages/SshKeys.tsx`

**Changes Required**:

1. **Toast Messages** - Remove provider name references:
```typescript
// Current
toast.success('SSH key added successfully', {
  description: 'The key has been synchronized to both Linode and DigitalOcean.',
});

// Updated
toast.success('SSH key added successfully', {
  description: 'The key has been synchronized to all cloud providers.',
});
```

2. **Page Description** - Remove provider names:
```typescript
// Current
<p className="mt-1 text-sm text-muted-foreground">
  Manage your SSH keys across Linode and DigitalOcean providers
</p>

// Updated
<p className="mt-1 text-sm text-muted-foreground">
  Manage your SSH keys across all cloud providers
</p>
```

3. **Card Description** - Remove provider names:
```typescript
// Current
<CardDescription>
  SSH keys are automatically synchronized across both cloud providers
</CardDescription>

// Updated
<CardDescription>
  SSH keys are automatically synchronized across all configured cloud providers
</CardDescription>
```

4. **Dialog Description** - Remove provider names:
```typescript
// Current
<DialogDescription>
  Add a new SSH key that will be available when creating VPS instances on
  both Linode and DigitalOcean.
</DialogDescription>

// Updated
<DialogDescription>
  Add a new SSH key that will be available when creating VPS instances across
  all cloud providers.
</DialogDescription>
```

5. **Provider Status Badges** - Use generic labels:
```typescript
// Current
<Badge variant="secondary" className="text-xs">
  {provider === 'linode' ? 'Linode' : 'DigitalOcean'}
  {/* ... */}
</Badge>

// Updated
<Badge variant="secondary" className="text-xs">
  Provider {index + 1}
  {/* ... */}
</Badge>
```

**Alternative Approach for Badges**: Instead of showing provider names, show sync status:
```typescript
<div className="flex items-center gap-2 flex-wrap">
  <span>Synchronized:</span>
  <Badge variant="secondary" className="text-xs">
    {providers.length} {providers.length === 1 ? 'Provider' : 'Providers'}
  </Badge>
</div>
```

### 5. Delete Dialog Component Updates

**File**: `src/components/SSHKeys/DeleteSSHKeyDialog.tsx`

**Changes Required**:
- Remove provider-specific messaging
- Use generic "cloud providers" terminology
- Remove provider name display from confirmation dialog

## Data Models

### Database Schema (No Changes Required)

The existing `user_ssh_keys` table structure is correct:

```sql
CREATE TABLE user_ssh_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  fingerprint VARCHAR(255) NOT NULL,
  linode_key_id VARCHAR(255),
  digitalocean_key_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The `linode_key_id` and `digitalocean_key_id` columns correctly store provider-specific IDs for synchronization tracking.

### Activity Log Metadata Structure

**Current Structure** (exposes provider names):
```json
{
  "fingerprint": "aa:bb:cc:...",
  "providers": {
    "linode": "success",
    "digitalocean": "failed"
  }
}
```

**Updated Structure** (white-label compliant):
```json
{
  "fingerprint": "aa:bb:cc:...",
  "syncStatus": {
    "total": 2,
    "successful": 1,
    "failed": 1
  },
  "providerDetails": {
    "provider_1": { "type": "linode", "status": "success", "id": "12345" },
    "provider_2": { "type": "digitalocean", "status": "failed", "error": "API timeout" }
  }
}
```

The `providerDetails` field is for admin debugging only and should never be displayed to end users.

## Error Handling

### Error Classification

1. **Token Retrieval Errors**:
   - No providers configured → Log warning, skip synchronization
   - Decryption failure → Log error with provider type, skip that provider
   - Database query failure → Log error, return empty tokens

2. **Provider API Errors**:
   - Authentication failure (401) → Log error with masked token, mark provider as failed
   - Rate limiting (429) → Log warning, retry with backoff (already implemented)
   - Network timeout → Log error, mark provider as failed
   - Invalid SSH key format (400) → Log error, return to user immediately
   - Server error (500) → Log error, retry with backoff (already implemented)

3. **Database Errors**:
   - Insert failure → Roll back, return error to user
   - Duplicate key → Return user-friendly error message

### Error Response Format

**API Response Structure**:
```typescript
{
  success: boolean;
  key?: SSHKeyData;
  partialSuccess?: boolean;
  errors?: Array<{
    provider: string;  // Only in API response, not shown to user
    error: string;
  }>;
  message?: string;
}
```

**Frontend Error Handling**:
- Full success → Green toast with success message
- Partial success → Yellow/warning toast with generic message
- Complete failure → Red toast with error message

## Testing Strategy

### Unit Tests

1. **Token Retrieval Tests**:
   - Test with no providers configured
   - Test with one provider configured
   - Test with both providers configured
   - Test with decryption failure
   - Test with database query failure

2. **White-Label Message Tests**:
   - Test message generation with all providers successful
   - Test message generation with partial success
   - Test message generation with all providers failed
   - Verify no provider names in user-facing messages

3. **Provider API Mock Tests**:
   - Mock successful API calls
   - Mock failed API calls with various error codes
   - Verify error logging includes sufficient detail

### Integration Tests

1. **End-to-End SSH Key Creation**:
   - Create key with valid providers configured
   - Verify database record created
   - Verify provider IDs stored correctly
   - Verify activity log created with white-label message

2. **End-to-End SSH Key Deletion**:
   - Delete key with provider IDs present
   - Verify database record deleted
   - Verify activity log created

3. **Error Scenario Tests**:
   - Test with invalid provider tokens
   - Test with provider API unavailable
   - Verify partial success handling

### Manual Testing Checklist

1. **Provider Configuration**:
   - [ ] Verify providers are configured in admin panel
   - [ ] Verify API tokens are encrypted in database
   - [ ] Verify tokens can be decrypted successfully

2. **SSH Key Operations**:
   - [ ] Add SSH key and verify it appears in both provider accounts
   - [ ] Delete SSH key and verify it's removed from both provider accounts
   - [ ] Test with one provider unavailable
   - [ ] Test with invalid SSH key format

3. **White-Label Verification**:
   - [ ] Check all toast notifications for provider names
   - [ ] Check page descriptions and labels
   - [ ] Check activity log messages
   - [ ] Check error messages

4. **Logging Verification**:
   - [ ] Check server logs for detailed API call information
   - [ ] Verify token masking in logs
   - [ ] Verify error details are captured

## Implementation Notes

### Debugging Steps for Current Issue

Before implementing fixes, perform these diagnostic steps:

1. **Check Provider Configuration**:
```sql
SELECT id, type, active, created_at 
FROM service_providers 
WHERE type IN ('linode', 'digitalocean');
```

2. **Test Token Decryption**:
```javascript
// In Node.js console or test script
const { query } = require('./api/lib/database.js');
const { decryptSecret } = require('./api/lib/crypto.js');

const result = await query(
  `SELECT type, api_key_encrypted FROM service_providers WHERE active = true`
);

for (const row of result.rows) {
  try {
    const decrypted = decryptSecret(row.api_key_encrypted);
    console.log(`${row.type}: ${decrypted.substring(0, 4)}...${decrypted.substring(decrypted.length - 4)}`);
  } catch (error) {
    console.error(`Failed to decrypt ${row.type}:`, error);
  }
}
```

3. **Test Provider API Directly**:
```javascript
// Test Linode API
const token = 'your_linode_token';
const response = await fetch('https://api.linode.com/v4/profile/sshkeys', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
console.log('Linode API Status:', response.status);

// Test DigitalOcean API
const doToken = 'your_do_token';
const doResponse = await fetch('https://api.digitalocean.com/v2/account/keys', {
  headers: {
    'Authorization': `Bearer ${doToken}`,
    'Content-Type': 'application/json'
  }
});
console.log('DigitalOcean API Status:', doResponse.status);
```

### Migration Considerations

No database migrations required. All changes are code-only.

### Backward Compatibility

- Existing SSH keys in database will continue to work
- Activity logs with old format will remain unchanged
- Frontend changes are purely cosmetic and don't affect functionality

### Performance Considerations

- Token retrieval happens once per SSH key operation (acceptable overhead)
- Provider API calls are already parallelized with Promise.all
- Enhanced logging adds minimal overhead
- No additional database queries required
