/**
 * In-process edit barrier for progress-v2 persistence. A migration must only
 * start after all previously submitted Zustand persistence writes have settled.
 * This is NOT a cross-process/AsyncStorage transaction.
 */
export function createProgressWriteGuard() {
  let locked = false;
  let failedWrite = null;
  const pending = new Set();

  const assertUnlocked = () => {
    if (locked) throw new Error("RED POLY progress: edits blocked during migration");
  };

  const trackWrite = (operation) => {
    const result = Promise.resolve(operation);
    pending.add(result);
    // Handle rejections to avoid unhandled side effects when Zustand does
    // not await writes. Retain the error so migration fails rather than
    // trusting stale persisted progress after a failed write.
    void result.then(
      () => { pending.delete(result); },
      (error) => { pending.delete(result); failedWrite = error; }
    );
    return result;
  };

  const acquire = async () => {
    assertUnlocked();
    locked = true;
    try {
      while (pending.size > 0) {
        await Promise.all([...pending]);
      }
      if (failedWrite !== null) {
        throw new Error("RED POLY progress: an earlier save failed; resolve it before migration", {
          cause: failedWrite,
        });
      }
      let released = false;
      return () => {
        if (!released) {
          released = true;
          locked = false;
        }
      };
    } catch (error) {
      locked = false;
      throw error;
    }
  };

  return { assertUnlocked, trackWrite, acquire };
}
