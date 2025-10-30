# Implementation Plan

- [ ] 1. Add explicit type filtering for Droplet apps only
  - Add filter after API response to exclude non-droplet apps
  - Add debug logging for filtered apps
  - Add validation warning if non-droplet apps are received despite API filter
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Create comprehensive app name mapping system
  - [ ] 2.1 Define APP_NAME_MAP as private readonly property with all known apps
    - Include vendor-prefixed apps (sharklabs-*, etc.)
    - Include standard apps (wordpress, docker, etc.)
    - Organize by functional groups with comments
    - _Requirements: 2.1, 2.2, 2.4, 5.1, 5.4_
  
  - [ ] 2.2 Refactor formatAppName() to use three-tier lookup
    - Implement exact match lookup
    - Implement partial match with version extraction
    - Implement fallback capitalization
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ] 2.3 Create capitalizeSlug() helper method
    - Handle version numbers
    - Handle special acronyms (JS, UI, API, CMS, VPN, SQL)
    - Capitalize first letter of regular words
    - _Requirements: 2.5_
  
  - [ ] 2.4 Add warning logging for unmapped vendor-prefixed apps
    - Detect vendor prefixes (sharklabs, digitalocean, do)
    - Log warning with app slug
    - _Requirements: 5.5_

- [ ] 3. Create comprehensive category mapping system
  - [ ] 3.1 Define APP_CATEGORY_MAP as private readonly property
    - Map AI/ML tools to Development
    - Map VPN/security tools to Security
    - Map game servers to Gaming
    - Map business tools to Productivity
    - Include all known apps with specific categories
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2, 5.4_
  
  - [ ] 3.2 Refactor getAppCategory() to use two-tier lookup
    - Implement exact match in category map
    - Implement partial match for versioned apps
    - Call categorizeByPattern() as fallback
    - _Requirements: 3.4, 3.5, 3.7_
  
  - [ ] 3.3 Create categorizeByPattern() helper method
    - Implement pattern matching for Databases
    - Implement pattern matching for CMS
    - Implement pattern matching for Containers
    - Implement pattern matching for Development
    - Implement pattern matching for Security (exclude gaming keywords)
    - Implement pattern matching for Gaming (explicit patterns)
    - Implement pattern matching for Monitoring
    - Implement pattern matching for Web Servers
    - Implement pattern matching for E-commerce
    - Implement pattern matching for Communication
    - Implement pattern matching for Media
    - Return 'Other' as default
    - _Requirements: 3.5, 3.7_
  
  - [ ] 3.4 Add API category validation
    - Check if API-provided category exists in known categories
    - Use validated category or fall back to mapping
    - _Requirements: 3.6_

- [ ] 4. Create comprehensive description mapping system
  - [ ] 4.1 Define APP_DESCRIPTION_MAP as private readonly property
    - Include descriptions for all known apps
    - Organize by functional groups
    - _Requirements: 4.2, 5.3, 5.4_
  
  - [ ] 4.2 Refactor getAppDescription() to use mapping lookup
    - Implement exact match lookup
    - Implement partial match for versioned apps
    - Return default description as fallback
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 4.3 Update description priority logic
    - Ensure priority: group_description → short_description → summary → description → mapping
    - _Requirements: 4.4_

- [ ] 5. Update MarketplaceManager to use provider display names
  - [ ] 5.1 Add selectedProvider state to track full provider object
    - Add state: `const [selectedProvider, setSelectedProvider] = useState<ProviderSummary | null>(null)`
    - _Requirements: 6.1_
  
  - [ ] 5.2 Update provider selection handler
    - Find and store full provider object when selection changes
    - Update handleProviderChange or create new handler
    - _Requirements: 6.1_
  
  - [ ] 5.3 Update CardTitle to use provider display name
    - Show "{providerName} Marketplace Controls" when provider selected
    - Show generic "Marketplace Controls" when no provider selected
    - _Requirements: 6.1, 6.3_
  
  - [ ] 5.4 Update CardDescription to use provider display name
    - Reference provider name in description text
    - Use generic text when no provider selected
    - _Requirements: 6.1, 6.4_
  
  - [ ] 5.5 Remove any hardcoded "DigitalOcean" or "Linode" references
    - Search for hardcoded provider names in error messages
    - Replace with provider display name or generic terms
    - _Requirements: 6.2, 6.4_

- [ ] 6. Add comprehensive logging and error handling
  - Add debug logging for type filtering
  - Add warning for unmapped vendor apps
  - Add validation logging for API responses
  - _Requirements: 5.5_

- [ ] 7. Verify and test the implementation
  - [ ] 7.1 Test type filtering
    - Verify only droplet apps appear
    - Check console for filtered app logs
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 7.2 Test name normalization
    - Verify "sharklabs-openwebui" displays as "OpenWebUI"
    - Verify "sharklabs-piholevpn" displays as "Pi-hole + VPN"
    - Verify other vendor-prefixed apps display correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 7.3 Test category accuracy
    - Verify OpenWebUI is in Development category
    - Verify Pi-hole VPN is in Security category
    - Verify Counter-Strike 2 is in Gaming category
    - Verify no gaming apps are miscategorized as Security
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 7.4 Test provider display names
    - Verify provider's custom name appears in UI
    - Verify no hardcoded "DigitalOcean" or "Linode" text
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
