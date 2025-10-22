# Design Document: FAQ Test Infrastructure Removal

## Overview

This design outlines the systematic removal of test infrastructure created for the Admin FAQ Management System. The removal targets automated test scripts, test documentation, and frontend integration tests while preserving all production FAQ functionality. This cleanup ensures the codebase remains focused on production code and essential utilities.

### Scope

**In Scope:**
- Deletion of automated E2E test scripts from `scripts/` directory
- Removal of test documentation from `docs/testing/` directory
- Deletion of frontend integration tests from `src/tests/` directory
- Removal of FAQ-specific npm scripts from `package.json`
- Verification that no broken references remain after deletion

**Out of Scope:**
- Modification of production FAQ code (API routes, frontend components, database migrations)
- Changes to non-FAQ test infrastructure
- Removal of general testing frameworks (Vitest configuration remains)

### Design Rationale

The test infrastructure was created as part of Task 10 in the admin-faq-management spec but is no longer needed. Removing these artifacts:
1. Reduces codebase complexity and maintenance burden
2. Eliminates confusion about which tests are actively maintained
3. Frees up repository space
4. Ensures developers focus on production code quality

## Architecture

### File Deletion Strategy

The removal follows a layered approach to minimize risk:

1. **Layer 1: Test Scripts** - Remove automated test execution scripts
2. **Layer 2: Documentation** - Remove test-specific documentation
3. **Layer 3: Frontend Tests** - Remove integration test files and directory
4. **Layer 4: Configuration** - Clean up npm scripts
5. **Layer 5: Verification** - Ensure no broken references remain

### Affected File Structure

```
Before:
├── scripts/
│   ├── test-faq-e2e.js              [DELETE]
│   ├── test-faq-migration.js        [DELETE]
│   ├── verify-faq-data.js           [DELETE]
│   ├── fix-faq-migration.js         [DELETE]
│   └── run-integration-tests.js     [DELETE]
├── docs/
│   └── testing/
│       ├── faq-testing-guide.md     [DELETE]
│       ├── faq-manual-testing-checklist.md [DELETE]
│       ├── faq-test-execution-summary.md [DELETE]
│       ├── QUICK-START.md           [DELETE]
│       └── README.md                [UPDATE]
├── src/
│   └── tests/
│       ├── faq-integration.test.tsx [DELETE]
│       └── README.md                [DELETE]
└── package.json                     [UPDATE]

After:
├── scripts/
│   └── [other scripts remain]
├── docs/
│   └── testing/
│       └── README.md                [cleaned of FAQ references]
├── src/
│   └── [tests/ directory removed]
└── package.json                     [FAQ test scripts removed]
```

## Components and Interfaces

### File Deletion Component

**Purpose:** Safely delete test-related files from the filesystem

**Operations:**
- Delete individual files using filesystem operations
- Remove empty directories after file deletion
- Verify file existence before deletion attempts
- Report deletion status for each file

**Files to Delete:**

1. **Test Scripts (5 files):**
   - `scripts/test-faq-e2e.js`
   - `scripts/test-faq-migration.js`
   - `scripts/verify-faq-data.js`
   - `scripts/fix-faq-migration.js`
   - `scripts/run-integration-tests.js`

2. **Test Documentation (4 files):**
   - `docs/testing/faq-testing-guide.md`
   - `docs/testing/faq-manual-testing-checklist.md`
   - `docs/testing/faq-test-execution-summary.md`
   - `docs/testing/QUICK-START.md`

3. **Frontend Tests (2 files + directory):**
   - `src/tests/faq-integration.test.tsx`
   - `src/tests/README.md`
   - `src/tests/` (directory, if empty)

### Configuration Update Component

**Purpose:** Remove FAQ-specific test scripts from package.json

**Operations:**
- Parse `package.json` to identify test scripts
- Remove FAQ-specific scripts while preserving others
- Maintain valid JSON formatting
- Preserve existing test infrastructure (test, test:watch)

**Scripts to Remove (if present):**
- `test:faq-e2e`
- `test:faq`
- `test:integration`

**Scripts to Preserve:**
- `test` (general Vitest runner)
- `test:watch` (watch mode)
- Any other non-FAQ test scripts

### Documentation Update Component

**Purpose:** Clean FAQ references from remaining documentation

**Operations:**
- Update `docs/testing/README.md` to remove FAQ-specific sections
- Verify no broken links to deleted files
- Maintain documentation structure for other features

**Update Strategy for docs/testing/README.md:**
- Remove sections specifically about FAQ testing
- Remove links to deleted FAQ test files
- Keep general testing guidance
- Evaluate if directory should be removed if only README.md remains

### Verification Component

**Purpose:** Ensure production FAQ code remains intact and no broken references exist

**Operations:**
- Verify core FAQ files are unchanged
- Check for import statements referencing deleted files
- Scan documentation for broken links
- Validate remaining test configuration

**Files to Verify (unchanged):**
- `api/routes/faq.ts` - Public FAQ API routes
- `api/routes/adminFaq.ts` - Admin FAQ management routes
- `migrations/012_faq_management.sql` - Database schema
- `src/types/faq.ts` - TypeScript type definitions
- `src/components/admin/FaqManagement.tsx` - Admin UI component
- `src/pages/Admin.tsx` - Admin panel integration
- `vitest.config.ts` - Test framework configuration

## Data Models

### Deletion Report Model

```typescript
interface DeletionReport {
  testScriptsDeleted: number;
  documentationFilesDeleted: number;
  frontendTestsDeleted: number;
  npmScriptsRemoved: string[];
  directoriesRemoved: string[];
  verificationStatus: {
    productionCodeIntact: boolean;
    noBrokenImports: boolean;
    noBrokenLinks: boolean;
    vitestConfigValid: boolean;
  };
  deletedFiles: string[];
}
```

### File Verification Model

```typescript
interface FileVerification {
  path: string;
  exists: boolean;
  unchanged: boolean;
  checksum?: string;
}
```

## Error Handling

### File Deletion Errors

**Scenario:** File does not exist when attempting deletion
- **Handling:** Log warning but continue (file may have been manually deleted)
- **Recovery:** Mark as already deleted in report

**Scenario:** Permission denied when deleting file
- **Handling:** Log error with file path and permissions
- **Recovery:** Skip file and report in final summary

**Scenario:** Directory not empty when attempting removal
- **Handling:** List remaining files and skip directory deletion
- **Recovery:** Report directory as not removed with reason

### Configuration Update Errors

**Scenario:** package.json is malformed or cannot be parsed
- **Handling:** Log error and skip npm script removal
- **Recovery:** Manual intervention required, provide instructions

**Scenario:** Script to remove does not exist in package.json
- **Handling:** Log info message (already removed or never existed)
- **Recovery:** Continue with other scripts

### Verification Errors

**Scenario:** Production FAQ file is missing or modified
- **Handling:** Log critical error with file details
- **Recovery:** Halt operation and report issue (indicates broader problem)

**Scenario:** Broken import detected in remaining code
- **Handling:** Log error with file and line number
- **Recovery:** Report for manual fix

## Testing Strategy

### Pre-Deletion Verification

1. **File Existence Check**
   - Verify all target files exist before deletion
   - Report which files are already missing
   - Confirm production FAQ files are present

2. **Backup Recommendation**
   - Suggest creating git commit before deletion
   - Verify working directory is clean
   - Confirm user has version control

### Post-Deletion Verification

1. **Production Code Integrity**
   - Verify FAQ API routes unchanged
   - Verify FAQ frontend components unchanged
   - Verify FAQ database migration unchanged
   - Verify FAQ TypeScript types unchanged

2. **Reference Validation**
   - Scan for imports of deleted test files
   - Check documentation for broken links
   - Verify no references in README.md
   - Validate vitest.config.ts syntax

3. **Build Validation**
   - Ensure TypeScript compilation succeeds
   - Verify no import errors
   - Confirm Vitest configuration is valid

### Manual Testing Checklist

After automated removal:
1. Run `npm run build` to verify no build errors
2. Run `npm run check` to verify TypeScript types
3. Start development server to verify FAQ functionality
4. Test FAQ CRUD operations in admin panel
5. Verify public FAQ display works correctly

## Implementation Notes

### Execution Order

The removal must follow this strict order to prevent issues:

1. **Phase 1: Pre-flight Checks**
   - Verify git status is clean (recommend commit)
   - Check all target files exist
   - Verify production FAQ files are present

2. **Phase 2: Delete Test Scripts**
   - Remove 5 test script files from `scripts/`
   - Report deletion status for each

3. **Phase 3: Delete Test Documentation**
   - Remove 4 test documentation files from `docs/testing/`
   - Update `docs/testing/README.md`
   - Evaluate if `docs/testing/` directory should be removed

4. **Phase 4: Delete Frontend Tests**
   - Remove 2 test files from `src/tests/`
   - Remove `src/tests/` directory if empty

5. **Phase 5: Update Configuration**
   - Remove FAQ test scripts from `package.json`
   - Preserve non-FAQ test scripts

6. **Phase 6: Verification**
   - Verify production FAQ code unchanged
   - Check for broken references
   - Validate build and type checking
   - Generate deletion report

### Rollback Strategy

If issues are detected during verification:
1. Use `git reset --hard` to restore deleted files
2. Review verification errors
3. Fix any unexpected issues
4. Re-run deletion process

### Success Criteria

The removal is successful when:
- All 11 test files are deleted
- `src/tests/` directory is removed
- FAQ test scripts removed from `package.json`
- No broken imports or references remain
- Production FAQ functionality is verified intact
- TypeScript compilation succeeds
- Vitest configuration remains valid
- Deletion report shows all operations completed

## Dependencies

### External Dependencies
- Node.js filesystem operations (fs/promises)
- Git (recommended for version control safety)

### Internal Dependencies
- Production FAQ code must remain untouched
- Vitest configuration must remain valid for other tests
- General test scripts (test, test:watch) must be preserved

### No Breaking Changes
This removal should not affect:
- FAQ API functionality
- FAQ admin panel features
- FAQ database operations
- FAQ frontend display
- Other test infrastructure
- Build or deployment processes
