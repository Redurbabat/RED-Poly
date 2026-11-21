/**
 * Ordered adapter for the existing progress-v2 Zustand persistence.
 *
 * AsyncStorage operations may resolve out of order when several learning
 * actions happen quickly. Running saves/removes in invocation order prevents
 * an older XP/SRS snapshot from overwriting a newer snapshot.
 *
 * Other AsyncStorage users are NOT covered by this in-process queue.
 */
export function createSerializedProgressStorage(storage, writeGuard) {
  let lastOperation = Promise.resolve();

  const queueWrite = (callback) => {
    const operation = lastOperation.then(callback);
    // Do not strand the queue when a previous save rejects. trackWrite retains
    // the failure, so migrations/backups still refuse to trust that disk state.
    lastOperation = operation.then(
      () => undefined,
      () => undefined,
    );
    return writeGuard.trackWrite(operation);
  };

  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => queueWrite(() => storage.setItem(key, value)),
    removeItem: (key) => queueWrite(() => storage.removeItem(key)),
  };
}
