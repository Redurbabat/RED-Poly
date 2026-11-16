import type { ProgressWriteGuard } from "./progress-write-guard.mjs";
import type { ProgressStorageAdapter } from "./progress-data.mjs";

/** Serializes writes while allowing reads of the underlying storage. */
export function createSerializedProgressStorage(
  storage: ProgressStorageAdapter,
  writeGuard: ProgressWriteGuard
): ProgressStorageAdapter;
