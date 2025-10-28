# Quick Reference - DigitalOcean OS Display Testing

## 🚀 Quick Start

1. **Start servers:** `npm run dev`
2. **Run verification:** `node .kiro/specs/digitalocean-os-display/verify-pagination.js`
3. **Open app:** http://localhost:5173
4. **Login as admin**
5. **Navigate to:** Dashboard → Create VPS → DigitalOcean → Operating System

## ✅ Quick Checklist

### Implementation Verification (Automated)
- [x] per_page=200 parameter
- [x] Pagination while loop
- [x] links.pages.next check
- [x] allImages accumulation
- [x] Pagination error handling
- [x] URL validation
- [x] Type definitions
- [x] Unit tests
- [x] Integration tests

### Manual Testing (User Verification)
- [ ] VPS creation flow works
- [ ] All distributions displayed (Ubuntu, Debian, Rocky, Fedora, Alpine, etc.)
- [ ] Total image count matches API (150+ expected)
- [ ] Search functionality works
- [ ] Marketplace app filtering works
- [ ] Only 1 API call from frontend
- [ ] Response time < 3 seconds
- [ ] No console errors
- [ ] UI is responsive

## 🔍 Key Things to Check

### In Browser DevTools (Network Tab)
```
Request: GET /api/vps/digitalocean/images?type=distribution
Expected: 
  - Status: 200
  - Response time: < 3000ms
  - Response size: ~100-200KB
  - Image count: 150+
```

### In Browser Console
```
Expected logs:
  - "Fetched X images from Y page(s)"
  - No error messages
```

### In UI
```
Expected:
  - Distribution groups: Ubuntu, Debian, Rocky Linux, Fedora, Alpine, etc.
  - Multiple versions per distribution
  - Search filters in real-time
  - Smooth scrolling
```

## 🐛 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No images shown | Invalid API token | Check Admin → VPS Providers |
| Only ~100 images | Pagination not working | Check server logs |
| Slow response | Network issues | Check DigitalOcean API status |
| Search not working | Frontend issue | Check browser console |

## 📊 Expected Metrics

- **Total Images:** 150-200+ (varies by DigitalOcean)
- **Distribution Groups:** 10-15
- **API Response Time:** 1-3 seconds
- **Frontend API Calls:** 1 per page load
- **Backend API Calls:** 1-3 to DigitalOcean (pagination)

## 🎯 Success Criteria

All of the following must be true:
1. ✅ Verification script passes all checks
2. ✅ All major distributions are visible
3. ✅ Total image count > 100
4. ✅ Search works correctly
5. ✅ Response time < 3 seconds
6. ✅ No errors in console
7. ✅ VPS can be created with selected OS

## 📝 Testing Commands

```bash
# Run verification script
node .kiro/specs/digitalocean-os-display/verify-pagination.js

# Run unit tests
npm run test -- DigitalOceanService.pagination.test.ts

# Run integration tests
npm run test -- vps.digitalocean.integration.test.ts

# Run all tests
npm run test

# Start dev servers
npm run dev
```

## 📚 Documentation

- **Full Testing Guide:** `MANUAL_TESTING_GUIDE.md`
- **Requirements:** `requirements.md`
- **Design:** `design.md`
- **Tasks:** `tasks.md`

## 🔗 Related Requirements

- **1.1-1.5:** Complete image fetching with pagination
- **2.1-2.5:** Distribution grouping and display
- **3.1-3.5:** Search and filtering
- **4.1-4.5:** Pagination implementation
- **5.1-5.5:** Error handling

## 📞 Need Help?

If tests fail:
1. Check server logs for errors
2. Verify DigitalOcean API token is valid
3. Check network connectivity
4. Review browser console for errors
5. Consult the full testing guide
