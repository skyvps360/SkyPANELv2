import { query } from './database.js';

const isMissingLabelsTableError = (err: unknown): boolean => {
  const message = String((err as any)?.message || '').toLowerCase();
  return (
    message.includes('provider_marketplace_labels') &&
    (message.includes('does not exist') ||
      message.includes('not exist') ||
      message.includes('not find') ||
      message.includes('could not find'))
  );
};

const normalizeDisplayName = (value: string): string => value.trim();
const normalizeSlugValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export async function fetchMarketplaceDisplayNames(
  providerId: string | null
): Promise<Map<string, string>> {
  const displayNameMap = new Map<string, string>();

  if (!providerId) {
    return displayNameMap;
  }

  try {
    const result = await query(
      `SELECT app_slug, display_name
         FROM provider_marketplace_labels
        WHERE provider_id = $1`,
      [providerId]
    );

    if (result.rows.length === 0) {
      return displayNameMap;
    }

    result.rows.forEach((row: any) => {
      const slug = normalizeSlugValue(row?.app_slug);
      if (!slug) {
        return;
      }

      const rawName = row?.display_name;
      if (typeof rawName === 'string') {
        const normalizedName = normalizeDisplayName(rawName);
        if (normalizedName.length > 0) {
          displayNameMap.set(slug, normalizedName);
        }
      }
    });
  } catch (err) {
    if (!isMissingLabelsTableError(err)) {
      throw err;
    }
  }

  return displayNameMap;
}

export async function replaceMarketplaceDisplayNames(
  providerId: string,
  entries: Map<string, string>
): Promise<void> {
  await query('DELETE FROM provider_marketplace_labels WHERE provider_id = $1', [providerId]);

  if (entries.size === 0) {
    return;
  }

  for (const [slug, name] of entries.entries()) {
    const normalizedSlug = normalizeSlugValue(slug);
    const normalizedName = normalizeDisplayName(name);
    if (!normalizedSlug || !normalizedName) {
      continue;
    }
    await query(
      `INSERT INTO provider_marketplace_labels (provider_id, app_slug, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider_id, app_slug)
       DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()`,
      [providerId, normalizedSlug, normalizedName]
    );
  }
}
