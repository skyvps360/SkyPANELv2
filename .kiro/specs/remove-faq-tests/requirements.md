# Requirements Document

## Introduction

This specification defines the requirements for removing the test infrastructure that was created for the Admin FAQ Management System. The testing components were added as part of Task 10 of the admin-faq-management spec but are no longer needed. This cleanup will remove automated test scripts, manual testing documentation, and frontend integration tests while preserving the core FAQ functionality.

## Glossary

- **E2E Tests**: End-to-end automated tests that verify the complete FAQ workflow via API calls
- **Integration Tests**: Frontend tests that verify FAQ feature functionality with a running backend
- **Test Scripts**: Node.js scripts in the `scripts/` directory used for automated testing
- **Test Documentation**: Markdown files in `docs/testing/` that provide testing guides and checklists
- **Vitest**: The testing framework used for frontend integration tests
- **Test Artifacts**: All files, scripts, and documentation related to testing the FAQ system

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove automated E2E test scripts from the scripts directory, so that the codebase only contains production code and essential utilities.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `scripts/test-faq-e2e.js`
2. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `scripts/test-faq-migration.js`
3. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `scripts/verify-faq-data.js`
4. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `scripts/fix-faq-migration.js`
5. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `scripts/run-integration-tests.js`

### Requirement 2

**User Story:** As a developer, I want to remove test documentation files from the docs directory, so that documentation focuses on production features rather than testing procedures.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `docs/testing/faq-testing-guide.md`
2. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `docs/testing/faq-manual-testing-checklist.md`
3. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `docs/testing/faq-test-execution-summary.md`
4. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `docs/testing/QUICK-START.md`
5. WHEN the FAQ_Test_Removal is executed, THE System SHALL update the file `docs/testing/README.md` to remove all FAQ-specific testing references
6. IF the docs/testing directory contains only README.md after deletions, THEN THE System SHALL evaluate whether to remove the entire directory

### Requirement 3

**User Story:** As a developer, I want to remove frontend integration tests from the src/tests directory, so that the frontend codebase is free of test files.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `src/tests/faq-integration.test.tsx`
2. WHEN the FAQ_Test_Removal is executed, THE System SHALL delete the file `src/tests/README.md`
3. WHEN the FAQ_Test_Removal is executed, THE System SHALL remove the empty `src/tests/` directory

### Requirement 4

**User Story:** As a developer, I want to remove test-related npm scripts from package.json, so that the available scripts reflect only production and development commands.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is executed, THE System SHALL remove the script `test:faq-e2e` from package.json if it exists
2. WHEN the FAQ_Test_Removal is executed, THE System SHALL remove the script `test:faq` from package.json if it exists
3. WHEN the FAQ_Test_Removal is executed, THE System SHALL remove the script `test:integration` from package.json if it exists
4. THE System SHALL preserve existing test scripts that are not FAQ-specific (test, test:watch)

### Requirement 5

**User Story:** As a developer, I want to verify that core FAQ functionality remains intact after test removal, so that I can confirm only test infrastructure was removed.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that all FAQ API routes in `api/routes/faq.ts` remain unchanged
2. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that all admin FAQ routes in `api/routes/adminFaq.ts` remain unchanged
3. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that all FAQ frontend components remain unchanged
4. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that the FAQ database migration `migrations/012_faq_management.sql` remains unchanged
5. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that FAQ TypeScript types in `src/types/faq.ts` remain unchanged

### Requirement 6

**User Story:** As a developer, I want a summary of removed files and preserved functionality, so that I can understand the scope of changes made.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is completed, THE System SHALL provide a count of deleted test script files
2. WHEN the FAQ_Test_Removal is completed, THE System SHALL provide a count of deleted documentation files
3. WHEN the FAQ_Test_Removal is completed, THE System SHALL provide a count of deleted frontend test files
4. WHEN the FAQ_Test_Removal is completed, THE System SHALL confirm that all production FAQ code remains functional
5. WHEN the FAQ_Test_Removal is completed, THE System SHALL list any npm scripts that were removed from package.json

### Requirement 7

**User Story:** As a developer, I want to ensure no broken references remain after test removal, so that the codebase has no dangling imports or references to deleted files.

#### Acceptance Criteria

1. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that no import statements reference deleted test files
2. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that no documentation links point to deleted test files
3. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that the main README.md does not reference deleted test scripts
4. WHEN the FAQ_Test_Removal is completed, THE System SHALL verify that vitest.config.ts remains valid for any remaining tests
