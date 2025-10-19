# Password Reset - Quick Reference

## 🔐 Security Fixes Applied

✅ **Removed token auto-population** - Users must manually enter 8-digit code
✅ **Added email verification** - Must enter email + code to reset password  
✅ **No token leakage** - Tokens never appear in URLs or API responses
✅ **Enhanced logging** - Full SMTP debugging for production troubleshooting

## 📋 Production Deployment Checklist

### 1. Set Environment Variables on VPS

```bash
# Edit .env file
SMTP2GO_USERNAME=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password_or_api_key
FROM_EMAIL=noreply@skyvps360.xyz
FROM_NAME=SkyVPS360
CLIENT_URL=https://your-production-domain.com
```

### 2. Test SMTP Connection

```bash
cd /path/to/containerstacks
node scripts/test-smtp.js
```

Look for: `✅ EMAIL SENT SUCCESSFULLY!`

### 3. Test Password Reset Flow

1. Go to `/forgot-password`
2. Enter email → receive 8-digit code
3. Go to `/reset-password`
4. Enter: email + code + new password
5. Verify reset works

### 4. Check Logs

```bash
# Look for successful email sends
grep "Email sent successfully" logs/*.log

# Look for errors
grep -i "error\|failed" logs/*.log | grep -i "email\|smtp"
```

## 🐛 Troubleshooting SMTP Issues

| Error | Solution |
|-------|----------|
| Connection timeout | Check firewall allows port 587 |
| Invalid credentials | Verify SMTP2GO_USERNAME and SMTP2GO_PASSWORD |
| Sender not verified | Verify FROM_EMAIL in SMTP2GO dashboard |
| Rate limit exceeded | Check SMTP2GO plan limits |

## 📝 New Password Reset Flow

**Before (INSECURE):**
User enters email → Auto-redirect to `/reset-password?token=ABC123` → Code auto-filled → Reset password

**After (SECURE):**
User enters email → Check email for code → Manually go to `/reset-password` → Enter email + code + new password → Reset password

## 🔍 Quick Verification

### Backend
- [ ] Token never returned in API response
- [ ] Email required for password reset
- [ ] Both email AND token verified

### Frontend  
- [ ] No auto-redirect after forgot password request
- [ ] No URL token auto-population
- [ ] Email field added to reset form

### Email
- [ ] SMTP2GO credentials set
- [ ] FROM_EMAIL verified in SMTP2GO
- [ ] Test email sends successfully
- [ ] Password reset emails arrive

## 📚 Documentation

- `docs/password-reset-fixes.md` - Complete guide with all changes
- `TESTING_SUMMARY.md` - Detailed implementation summary
- `scripts/test-smtp.js` - SMTP connection test utility

## 🚀 Deploy & Test

```bash
# Build
npm run build

# Deploy (example using pm2)
pm2 restart all

# Test SMTP
node scripts/test-smtp.js

# Monitor logs
pm2 logs
```

## ⚠️ Important Notes

- Reset codes expire after **1 hour**
- Users must enter **email + 8-digit code** to reset
- Tokens are **case-insensitive** (automatically uppercased)
- Email matching is **case-insensitive**
- No database migrations required - uses existing schema

## 🎯 Success Criteria

✅ Emails send successfully on production VPS  
✅ No token leakage in URLs or responses  
✅ Users must manually enter code from email  
✅ Email verification prevents unauthorized resets  
✅ SMTP logs show successful sends  
