# Password Reset Security Fixes & SMTP Configuration

## Security Issues Fixed

### 1. Token Auto-Population Vulnerability (CRITICAL)
**Problem**: The system was automatically redirecting users to `/reset-password?token=1C6152F4` after they requested a password reset, defeating the purpose of email verification.

**Root Causes**:
- Backend returned the reset token in development mode
- Frontend auto-redirected with token in URL
- URL token was auto-populated into the form field

**Fixes Applied**:
- ✅ Removed token return from backend in ALL environments (`api/services/authService.ts`)
- ✅ Removed auto-redirect logic from `ForgotPassword.tsx`
- ✅ Removed URL token auto-population from `ResetPassword.tsx`
- ✅ Users now must manually enter the code from their email

### 2. Missing Email Verification Layer
**Problem**: System only verified the token, not that the person entering it owned the email account.

**Fixes Applied**:
- ✅ Added email input field to reset password form
- ✅ Updated backend to require email in reset request
- ✅ Backend now verifies both token AND email match before allowing password reset
- ✅ Users must enter both their email and the 8-digit code

## New Password Reset Flow

### User Experience
1. User goes to `/forgot-password`
2. User enters their email address
3. User receives 8-digit code via email
4. User clicks "Go to reset password page" button (or navigates manually)
5. User goes to `/reset-password` 
6. User enters:
   - Their email address
   - The 8-digit code from email
   - New password
   - Confirm password
7. System verifies email + code match before resetting password

### Backend Validation
```sql
-- Old query (INSECURE - only checked token)
SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()

-- New query (SECURE - checks token AND email)
SELECT id, email FROM users 
WHERE reset_token = $1 
  AND reset_expires > NOW() 
  AND LOWER(email) = $2
```

## SMTP2GO Configuration for Production

### Required Environment Variables
Ensure these are set on your production VPS:

```bash
# SMTP2GO Credentials (REQUIRED)
SMTP2GO_USERNAME=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password_or_api_key

# Email Settings (REQUIRED)
FROM_EMAIL=noreply@skyvps360.xyz  # Must be verified in SMTP2GO
FROM_NAME=SkyVPS360

# Client URL (REQUIRED for email links)
CLIENT_URL=https://your-production-domain.com

# Optional SMTP Settings (use defaults if not set)
SMTP2GO_HOST=mail.smtp2go.com  # Default
SMTP2GO_PORT=587               # Default
```

### SMTP2GO Setup Checklist
- [ ] Verify sender email in SMTP2GO dashboard
- [ ] Whitelist your VPS IP in SMTP2GO (if required)
- [ ] Test SMTP credentials from production server
- [ ] Check firewall allows outbound port 587
- [ ] Verify TLS/STARTTLS is enabled

### Email Service Logging
Enhanced logging now shows:
- Transporter initialization with config details
- Email send attempts with recipient/subject
- Success with message IDs
- Failures with full error details

Check logs for:
```
Initializing SMTP2GO transporter with config: ...
Attempting to send email: ...
Email sent successfully: ...
```

Or errors:
```
SMTP Configuration Error: ...
Failed to send email: ...
```

### Testing SMTP on Production

#### Quick Test Script
Create `scripts/test-smtp.js`:
```javascript
import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP2GO_HOST || 'mail.smtp2go.com',
  port: Number(process.env.SMTP2GO_PORT || 587),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP2GO_USERNAME,
    pass: process.env.SMTP2GO_PASSWORD
  },
  debug: true,
  logger: true
});

const from = `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`;
const to = process.env.TEST_EMAIL || 'your-email@example.com';

console.log('Testing SMTP with:', {
  host: process.env.SMTP2GO_HOST || 'mail.smtp2go.com',
  port: process.env.SMTP2GO_PORT || 587,
  from,
  to
});

transporter.sendMail({
  from,
  to,
  subject: 'SMTP Test from Production',
  text: 'If you receive this, SMTP2GO is working correctly!'
}).then(info => {
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
}).catch(error => {
  console.error('❌ Email send failed:');
  console.error(error);
});
```

Run on VPS:
```bash
node scripts/test-smtp.js
```

#### Common SMTP2GO Issues

**Issue**: "Connection timeout"
- **Solution**: Check firewall allows outbound port 587

**Issue**: "Invalid credentials"
- **Solution**: Verify SMTP2GO_USERNAME and SMTP2GO_PASSWORD in `.env`

**Issue**: "Sender not verified"
- **Solution**: Verify FROM_EMAIL in SMTP2GO dashboard

**Issue**: "Relay access denied"
- **Solution**: Ensure you're using SMTP2GO credentials, not generic SMTP

## Files Modified

### Backend
- `api/services/authService.ts` - Removed dev token return, added email verification
- `api/routes/auth.ts` - Added email validation to reset endpoint
- `api/services/emailService.ts` - Enhanced logging, improved error messages

### Frontend
- `src/pages/ForgotPassword.tsx` - Removed auto-redirect, added manual navigation
- `src/pages/ResetPassword.tsx` - Added email field, removed URL token auto-fill

## Testing Checklist

### Local Testing (localhost:5173)
- [ ] Request password reset - should NOT auto-redirect
- [ ] Check email - should receive 8-digit code
- [ ] Go to reset page manually
- [ ] Enter correct email + code - should work
- [ ] Enter wrong email + correct code - should fail
- [ ] Enter correct email + wrong code - should fail
- [ ] Code should expire after 1 hour

### Production Testing (VPS)
- [ ] Same flow as local testing
- [ ] Emails actually send (check inbox/spam)
- [ ] Check server logs for SMTP success/failure
- [ ] Verify FROM_EMAIL domain matches
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)

## Security Improvements Summary

1. **No Token Leakage**: Tokens never appear in URLs or responses
2. **Email Verification**: Must prove email ownership to reset password
3. **Time-Limited Codes**: 1-hour expiration window
4. **Secure Transport**: TLS required for all SMTP connections
5. **Rate Limiting**: Existing middleware prevents brute force attacks
6. **Case-Insensitive Email Matching**: Prevents case-sensitivity bypass attempts

## Migration Notes

**No database migrations required** - existing schema supports these changes:
- `reset_token` column already exists
- `reset_expires` column already exists
- Email verification uses existing `email` column

**No breaking changes for existing reset tokens** - old tokens will still work until they expire (1 hour max).
