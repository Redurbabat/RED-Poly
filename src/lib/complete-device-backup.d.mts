export interface CompleteDeviceBackupReaders {
  readProgress(): Promise<string>;
  readVocabulary(): Promise<unknown>;
  readConversation(): Promise<unknown>;
}
export interface CompleteDeviceArchive {
  format: "red-poly-device-backup";
  version: 1;
  exportedAt: string;
  restoreSupported: false;
  data: { progress: unknown; vocabulary: unknown; conversation: unknown };
}
export const DEVICE_BACKUP_FORMAT: "red-poly-device-backup";
export const DEVICE_BACKUP_VERSION: 1;
export const MAX_DEVICE_BACKUP_CHARS: 12000000;
export function makeCompleteDeviceBackup(
  data: { progress: unknown; vocabulary: unknown; conversation: unknown },
  now?: number,
): string;
export function inspectCompleteDeviceBackup(serialized: string): CompleteDeviceArchive;
export function exportStableCompleteDeviceBackup(readers: CompleteDeviceBackupReaders, now?: number): Promise<string>;
