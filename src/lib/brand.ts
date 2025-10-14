// Frontend brand name sourced from environment variables
// Prefer COMPANY-NAME, fallback to VITE_COMPANY_NAME, then default
export const BRAND_NAME: string =
  (import.meta.env['COMPANY-NAME'] as string) ||
  (import.meta.env.VITE_COMPANY_NAME as string) ||
  'ContainerStacks';