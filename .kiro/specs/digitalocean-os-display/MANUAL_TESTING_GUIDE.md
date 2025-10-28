# Manual Testing Guide - DigitalOcean OS Display Feature

## Overview
This guide provides step-by-step instructions for manually testing the DigitalOcean OS display feature with pagination support.

## Prerequisites

Before starting the tests, ensure:
- [ ] Development environment is running (`npm run dev`)
- [ ] You have a valid DigitalOcean API token configured in the admin panel
- [ ] You have admin access to the platform
- [ ] Browser DevTools is available (Chrome/Firefox/Edge)

## Test Environment Setup

1. **Start the development servers:**
   ```bash
   npm run dev
   ```

2. **Login as admin user**

3. **Verify DigitalOcean provider is configured:**
   - Navigate to Admin Panel → VPS Providers
   - Ensure DigitalOcean provider exists and has a valid API token
   - If not configured, add it with your DigitalOcean API token

## Test Cases

### Test 1: VPS Creation Flow with DigitalOcean Provider

**Objective:** Verify the complete VPS creation flow works with DigitalOcean

**Steps:**
1. Navigate to Dashboard
2. Click "Create VPS" or similar button
3. Select "DigitalOcean" as the provider
4. Proceed through the wizard steps
5. Reach the "Operating System" selection step

**Expected Results:**
- [ ] VPS creation modal opens successfully
- [ ] DigitalOcean appears as a provider option
- [ ] All wizard steps are accessible
- [ ] Operating System step loads without errors

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 2: Verify All Expected Distributions Are Displayed

**Objective:** Confirm all major Linux distributions are available

**Steps:**
1. In the Operating System selection step
2. Scroll through all available distributions
3. Check for the following distributions:

**Expected Distributions Checklist:**
- [ ] Ubuntu (multiple versions: 18.04, 20.04, 22.04, 24.04)
- [ ] Debian (versions 10, 11, 12)
- [ ] Rocky Linux (versions 8, 9)
- [ ] AlmaLinux (versions 8, 9)
- [ ] Fedora (recent versions)
- [ ] Alpine Linux
- [ ] Arch Linux
- [ ] FreeBSD
- [ ] CentOS (legacy versions if available)
- [ ] openSUSE (if available)

**Expected Results:**
- [ ] All major distributions are visible
- [ ] Each distribution shows multiple versions
- [ ] No obvious missing distributions
- [ ] Images are grouped by distribution family

**Pass/Fail:** ___________

**Total Images Count:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 3: Count Total Images and Compare with API

**Objective:** Verify pagination is fetching all available images

**Steps:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Filter by "images" in the network requests
4. Trigger the OS selection step (refresh if needed)
5. Find the API response for `/api/vps/digitalocean/images`
6. Check the response payload

**Data to Record:**
- Total images displayed in UI: ___________
- Total images in API response: ___________
- Number of distribution groups: ___________

**Expected Results:**
- [ ] API response contains 150+ images (typical for DigitalOcean)
- [ ] UI displays all images from the API response
- [ ] No images are missing or filtered incorrectly

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 4: Test Search Functionality

**Objective:** Verify search works correctly with the complete image list

**Steps:**
1. In the Operating System selection step
2. Locate the search input field
3. Test the following searches:

**Search Test Cases:**

| Search Term | Expected Results | Pass/Fail |
|-------------|------------------|-----------|
| "ubuntu" | Only Ubuntu images shown | _____ |
| "22.04" | Ubuntu 22.04 and similar versions | _____ |
| "debian" | Only Debian images shown | _____ |
| "rocky" | Only Rocky Linux images shown | _____ |
| "alpine" | Only Alpine Linux images shown | _____ |
| "xyz123" | "No operating systems found" message | _____ |
| "" (empty) | All images restored | _____ |

**Expected Results:**
- [ ] Search filters in real-time
- [ ] Results are accurate and relevant
- [ ] Empty search shows all images
- [ ] No results shows appropriate message
- [ ] Clear/reset functionality works

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 5: Test Marketplace App Compatibility Filtering

**Objective:** Verify OS filtering works when a marketplace app is selected

**Steps:**
1. Go back to the Marketplace App step (if available)
2. Select a marketplace application (e.g., WordPress, Docker)
3. Proceed to Operating System step
4. Observe which operating systems are displayed

**Expected Results:**
- [ ] Only compatible operating systems are shown
- [ ] Incompatible OS images are filtered out
- [ ] The filtering is accurate for the selected app
- [ ] User can still search within compatible images

**Pass/Fail:** ___________

**Selected App:** ___________

**Compatible OS Count:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 6: Monitor API Calls in Browser DevTools

**Objective:** Verify pagination happens server-side and efficiently

**Steps:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Clear network log
4. Navigate to Operating System selection step
5. Observe API calls

**Data to Record:**
- Number of API calls to `/api/vps/digitalocean/images`: ___________
- Number of calls to DigitalOcean API (if visible): ___________
- Response size: ___________

**Expected Results:**
- [ ] Only ONE request from frontend to `/api/vps/digitalocean/images`
- [ ] No multiple requests or polling
- [ ] Response includes all images in a single payload
- [ ] No errors in console

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 7: Verify Response Time is Acceptable

**Objective:** Ensure the feature performs well with pagination

**Steps:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Clear network log
4. Navigate to Operating System selection step
5. Check the timing for `/api/vps/digitalocean/images` request

**Data to Record:**
- Request time: ___________ ms
- Time to first byte (TTFB): ___________ ms
- Total load time: ___________ ms

**Expected Results:**
- [ ] Total response time is under 3 seconds
- [ ] UI remains responsive during loading
- [ ] Loading indicator is shown (if applicable)
- [ ] No timeout errors

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 8: Test Image Selection and VPS Creation

**Objective:** Verify selected OS can be used to create a VPS

**Steps:**
1. Select an operating system (e.g., Ubuntu 22.04)
2. Complete remaining wizard steps (region, plan, etc.)
3. Submit VPS creation request
4. Verify the VPS is created with correct OS

**Expected Results:**
- [ ] OS selection is saved correctly
- [ ] VPS creation succeeds
- [ ] Created VPS has the correct operating system
- [ ] No errors during creation

**Pass/Fail:** ___________

**Selected OS:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 9: Test Error Handling

**Objective:** Verify graceful error handling

**Steps:**
1. Temporarily disable DigitalOcean provider or use invalid token
2. Navigate to Operating System selection step
3. Observe error behavior

**Expected Results:**
- [ ] User-friendly error message is displayed
- [ ] Retry button is available
- [ ] No application crash
- [ ] Error is logged in console

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

### Test 10: Test UI Responsiveness

**Objective:** Verify UI works well with large dataset

**Steps:**
1. Navigate to Operating System selection step
2. Scroll through all images
3. Test on different screen sizes (desktop, tablet, mobile)

**Expected Results:**
- [ ] Scrolling is smooth
- [ ] Images load without lag
- [ ] Grouping is clear and organized
- [ ] UI is responsive on all screen sizes
- [ ] No layout issues with large number of images

**Pass/Fail:** ___________

**Notes:**
_____________________________________________________________________________

---

## Summary

### Overall Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. VPS Creation Flow | _____ | _____ |
| 2. All Distributions Displayed | _____ | _____ |
| 3. Total Image Count | _____ | _____ |
| 4. Search Functionality | _____ | _____ |
| 5. Marketplace Compatibility | _____ | _____ |
| 6. API Call Monitoring | _____ | _____ |
| 7. Response Time | _____ | _____ |
| 8. Image Selection & Creation | _____ | _____ |
| 9. Error Handling | _____ | _____ |
| 10. UI Responsiveness | _____ | _____ |

### Key Metrics

- **Total Images Displayed:** ___________
- **Total Distributions:** ___________
- **Average Response Time:** ___________ ms
- **API Calls per Page Load:** ___________

### Issues Found

1. _____________________________________________________________________________
2. _____________________________________________________________________________
3. _____________________________________________________________________________

### Recommendations

1. _____________________________________________________________________________
2. _____________________________________________________________________________
3. _____________________________________________________________________________

### Sign-off

**Tester Name:** ___________

**Date:** ___________

**Overall Status:** [ ] PASS [ ] FAIL [ ] PASS WITH ISSUES

**Additional Comments:**
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
