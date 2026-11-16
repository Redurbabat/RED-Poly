export interface ProgressWriteGuard {
  assertUnlocked(): void;
  trackWrite<T>(operation: Promise<T>): Promise<T>;
  /** Waits for tracked writes, then holds a synchronous edit barrier. */
  acquire(): Promise<() => void>;
  /** Waits for writes started during the held barrier, before releasing it. */
  drain(): Promise<void>;
}
export function createProgressWriteGuard(): ProgressWriteGuard;
