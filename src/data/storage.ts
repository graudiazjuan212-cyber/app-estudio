export interface StorageLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}
export async function requestPersistence(storage: StorageLike | undefined): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!storage?.persist) return 'unsupported';
  try {
    if (await storage.persisted?.()) return 'granted';
    return await storage.persist() ? 'granted' : 'denied';
  } catch { return 'denied'; }
}
export async function storageStatus(storage: StorageLike | undefined): Promise<{
  persisted: boolean | null; usageBytes: number | null; quotaBytes: number | null;
}> {
  let persisted: boolean | null = null;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  try { persisted = await storage?.persisted?.() ?? null; } catch { /* Unavailable. */ }
  try {
    const estimate = await storage?.estimate?.();
    if (typeof estimate?.usage === 'number' && Number.isFinite(estimate.usage) && estimate.usage >= 0) usageBytes = estimate.usage;
    if (typeof estimate?.quota === 'number' && Number.isFinite(estimate.quota) && estimate.quota >= 0) quotaBytes = estimate.quota;
  } catch { /* Unavailable. */ }
  return { persisted, usageBytes, quotaBytes };
}
export function canShareFile(nav: { canShare?: (data: ShareData) => boolean; share?: unknown } | undefined, file: File): boolean {
  if (typeof nav?.share !== 'function' || !nav.canShare) return false;
  try { return nav.canShare({ files: [file] }); } catch { return false; }
}
