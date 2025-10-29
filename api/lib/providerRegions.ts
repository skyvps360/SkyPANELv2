export const DEFAULT_DIGITALOCEAN_ALLOWED_REGIONS = [
  "nyc1",
  "nyc3",
  "ams3",
  "sfo3",
  "sgp1",
  "lon1",
  "fra1",
  "tor1",
  "blr1",
  "syd1",
];

export const DEFAULT_LINODE_ALLOWED_REGIONS = [
  "us-east",
  "us-west",
  "us-central",
  "us-southeast",
  "eu-west",
  "eu-central",
  "ap-south",
  "ap-southeast",
  "ap-northeast",
  "ca-central",
];

export const DIGITALOCEAN_REGION_COUNTRY_MAP: Record<string, string> = {
  nyc1: "United States",
  nyc2: "United States",
  nyc3: "United States",
  sfo1: "United States",
  sfo2: "United States",
  sfo3: "United States",
  sea1: "United States",
  ams2: "Netherlands",
  ams3: "Netherlands",
  sgp1: "Singapore",
  lon1: "United Kingdom",
  fra1: "Germany",
  fra2: "Germany",
  tor1: "Canada",
  blr1: "India",
  syd1: "Australia",
  mad1: "Spain",
  bom1: "India",
};

const normalizedDigitalOceanDefaults = new Set(
  DEFAULT_DIGITALOCEAN_ALLOWED_REGIONS.map((region) => region.toLowerCase())
);

const normalizedLinodeDefaults = new Set(
  DEFAULT_LINODE_ALLOWED_REGIONS.map((region) => region.toLowerCase())
);

export const normalizeRegionList = (regions: string[]): string[] =>
  Array.from(
    new Set(
      regions
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
    )
  );

export const matchesDefaultAllowedRegions = (
  providerType: "linode" | "digitalocean",
  normalizedRegions: string[]
): boolean => {
  if (normalizedRegions.length === 0) {
    return false;
  }

  if (providerType === "linode") {
    if (normalizedRegions.length !== normalizedLinodeDefaults.size) {
      return false;
    }
    return normalizedRegions.every((region) =>
      normalizedLinodeDefaults.has(region)
    );
  }

  if (providerType === "digitalocean") {
    if (normalizedRegions.length !== normalizedDigitalOceanDefaults.size) {
      return false;
    }
    return normalizedRegions.every((region) =>
      normalizedDigitalOceanDefaults.has(region)
    );
  }

  return false;
};

export const shouldFilterByAllowedRegions = (
  providerType: "linode" | "digitalocean",
  normalizedRegions: string[]
): boolean =>
  normalizedRegions.length > 0 &&
  !matchesDefaultAllowedRegions(providerType, normalizedRegions);

export const parseStoredAllowedRegions = (rawValue: unknown): string[] => {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return normalizeRegionList(
      rawValue.filter((value: unknown): value is string => typeof value === "string")
    );
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeRegionList(
          parsed.filter((value: unknown): value is string => typeof value === "string")
        );
      }
    } catch (err) {
      console.warn("Failed to parse stored allowed_regions value", err);
    }
  }

  if (typeof rawValue === "object" && rawValue !== null) {
    // Handle JSONB objects that might resemble {"0": "region"}
    try {
      const entries = Object.values(rawValue);
      if (entries.length > 0) {
        return normalizeRegionList(
          entries.filter((value: unknown): value is string => typeof value === "string")
        );
      }
    } catch (err) {
      console.warn("Failed to normalize structured allowed_regions value", err);
    }
  }

  return [];
};
