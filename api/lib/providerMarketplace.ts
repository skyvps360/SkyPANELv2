export const normalizeMarketplaceSlugs = (slugs: string[]): string[] =>
  Array.from(
    new Set(
      slugs
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
    )
  );

export const parseStoredAllowedMarketplaceApps = (rawValue: unknown): string[] => {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return normalizeMarketplaceSlugs(
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
        return normalizeMarketplaceSlugs(
          parsed.filter((value: unknown): value is string => typeof value === "string")
        );
      }
    } catch (err) {
      console.warn("Failed to parse stored allowed marketplace apps", err);
    }
  }

  if (typeof rawValue === "object" && rawValue !== null) {
    try {
      const entries = Object.values(rawValue);
      if (entries.length > 0) {
        return normalizeMarketplaceSlugs(
          entries.filter((value: unknown): value is string => typeof value === "string")
        );
      }
    } catch (err) {
      console.warn("Failed to normalize structured allowed marketplace value", err);
    }
  }

  return [];
};

export const shouldFilterByAllowedMarketplaceApps = (normalizedSlugs: string[]): boolean =>
  normalizedSlugs.length > 0;
