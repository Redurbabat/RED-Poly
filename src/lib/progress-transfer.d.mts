import type { PersistedProgressData, ProgressStorageAdapter } from "./progress-data.mjs";
import type { ProgressWriteGuard } from "./progress-write-guard.mjs";

export interface VerifiedProgressTransferOptions {
  storage: ProgressStorageAdapter;
  guard: ProgressWriteGuard;
  isHydrated(): boolean;
  getState(): PersistedProgressData;
  rehydrate(): Promise<unknown>;
}
export function exportVerifiedProgressBackup(
  options: Omit<VerifiedProgressTransferOptions, "rehydrate">
): Promise<string>;
export function restoreVerifiedProgressBackup(
  serialized: string,
  options: VerifiedProgressTransferOptions
): Promise<void>;

/**
 * Explicit, edit-guarded WordPecker migration with persisted-data and
 * in-memory rehydration verification and conditional rollback on failure.
 */
export function importVerifiedWordPeckerVocabulary(
  options: VerifiedProgressTransferOptions
): Promise<{ listsAdded: number; wordsAdded: number }>;
