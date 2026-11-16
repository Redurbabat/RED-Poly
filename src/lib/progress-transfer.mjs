/**
 * Verified device backup/restore coordinator. No React or native dependency.
 * A caller supplies the same write guard used by Zustand persistence.
 */
import {
  PROGRESS_STORAGE_KEY,
  createProgressBackup,
  migrateProgressData,
  parseProgressBackup,
  restoreProgressBackupToStorage,
} from "./progress-data.mjs";
import { importWordPeckerVocabularyToStorage } from "./vocabulary-bridge.mjs";

const assert = (condition, reason) => {
  if (!condition) throw new Error("RED POLY progress transfer: " + reason);
};

const snapshotOf = (value) => JSON.parse(createProgressBackup(value)).state;
const equalSnapshots = (a, b) =>
  JSON.stringify(snapshotOf(a)) === JSON.stringify(snapshotOf(b));

function decodePersisted(raw) {
  assert(typeof raw === "string" && raw.length > 0, "saved progress is missing");
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch { throw new Error("RED POLY progress transfer: corrupt saved progress JSON"); }
  assert(envelope !== null && typeof envelope === "object" &&
    !Array.isArray(envelope) && "state" in envelope, "invalid saved progress envelope");
  return migrateProgressData(envelope.state, envelope.version ?? 0);
}

function requireHydrated(options) {
  assert(options.isHydrated(), "progress must finish loading first");
}

async function takeVerifiedSnapshot(options, allowMissing = false) {
  const original = await options.storage.getItem(PROGRESS_STORAGE_KEY);
  if (original === null) {
    assert(allowMissing, "no saved progress is available to export");
    return { original, state: null };
  }
  const state = decodePersisted(original);
  assert(equalSnapshots(state, options.getState()),
    "in-memory edits differ from saved progress; retry after saving");
  return { original, state };
}

/**
 * Exports the persisted snapshot only after all tracked writes have settled.
 * Never exports data that differs from the live learning state.
 */
export async function exportVerifiedProgressBackup(options) {
  requireHydrated(options);
  const release = await options.guard.acquire();
  try {
    const { state } = await takeVerifiedSnapshot(options);
    return createProgressBackup(state);
  } finally {
    release();
  }
}

/**
 * Restores an explicitly chosen backup under the SAME edit barrier as imports.
 * Validates before any destination write; checks disk/live consistency and
 * fences the original bytes immediately before the restore commit.
 *
 * On a failure after successful disk commit (e.g. rehydration), attempts to
 * restore the old original bytes and to rehydrate the old state.
 */
export async function restoreVerifiedProgressBackup(serialized, options) {
  // Parse before taking the write guard; corrupt backups never touch storage.
  const incoming = parseProgressBackup(serialized);
  requireHydrated(options);
  const release = await options.guard.acquire();
  let committed = false;
  let original = null;
  try {
    ({ original } = await takeVerifiedSnapshot(options, true));
    await restoreProgressBackupToStorage(serialized, options.storage, original);
    committed = true;
    try {
      await options.rehydrate();
      assert(equalSnapshots(options.getState(), incoming),
        "rehydrated data does not match the restored backup");
      // Verify no newer/different persisted state was written by an
      // unexpected writer while the app was rehydrating.
      const actual = decodePersisted(await options.storage.getItem(PROGRESS_STORAGE_KEY));
      assert(equalSnapshots(actual, incoming), "stored backup changed during rehydration");
    } catch (error) {
      // The old checkpoint stays intact. Roll back the just-restored bytes so
      // another learning action cannot silently overwrite lost in-memory work.
      try {
        if (original === null) await options.storage.removeItem(PROGRESS_STORAGE_KEY);
        else await options.storage.setItem(PROGRESS_STORAGE_KEY, original);
        assert(await options.storage.getItem(PROGRESS_STORAGE_KEY) === original,
          "original bytes could not be verified after rollback");
        if (original !== null) {
          await options.rehydrate();
          assert(equalSnapshots(options.getState(), decodePersisted(original)),
            "original learning data could not be rehydrated");
        }
      } catch (rollbackError) {
        throw new Error("RED POLY progress transfer: restore failed and rollback incomplete", {
          cause: rollbackError,
        });
      }
      throw error;
    }
  } finally {
    release();
  }
}


/**
 * Full device migration, including rehydration verification. The underlying
 * WordPecker adapter preserves the original checkpoint and never deletes the
 * legacy vocabulary key. The app edit guard remains held during all steps.
 *
 * If the adapter succeeds but hydration fails, restore original bytes only
 * when the destination is still exactly the snapshot we just imported.
 * Unknown writes must not be clobbered by a blind rollback.
 */
export async function importVerifiedWordPeckerVocabulary(options) {
  requireHydrated(options);
  const release = await options.guard.acquire();
  try {
    const { original } = await takeVerifiedSnapshot(options);
    const result = await importWordPeckerVocabularyToStorage(options.storage);
    const importedBytes = await options.storage.getItem(PROGRESS_STORAGE_KEY);
    assert(importedBytes !== null, "imported progress is missing");

    try {
      await options.rehydrate();
      const persisted = await options.storage.getItem(PROGRESS_STORAGE_KEY);
      assert(persisted === importedBytes,
        "saved progress changed during WordPecker rehydration");
      assert(equalSnapshots(options.getState(), decodePersisted(importedBytes)),
        "rehydrated WordPecker progress does not match storage");
      return result;
    } catch (error) {
      try {
        assert(await options.storage.getItem(PROGRESS_STORAGE_KEY) === importedBytes,
          "progress changed after import; cannot safely roll back");
        await options.storage.setItem(PROGRESS_STORAGE_KEY, original);
        assert(await options.storage.getItem(PROGRESS_STORAGE_KEY) === original,
          "original progress could not be verified after rollback");
        await options.rehydrate();
        assert(equalSnapshots(options.getState(), decodePersisted(original)),
          "original progress could not be rehydrated after rollback");
      } catch (rollbackError) {
        throw new Error(
          "RED POLY progress transfer: WordPecker import failed and rollback incomplete; original checkpoint retained",
          { cause: rollbackError },
        );
      }
      throw error;
    }
  } finally {
    release();
  }
}
