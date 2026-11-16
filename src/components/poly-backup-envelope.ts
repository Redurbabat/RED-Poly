/**
 * UI-only preflight of a RED POLY backup envelope.
 * Must not accept unverified data as safe: Agent 01 validates the *entire*
 * progress snapshot again under its guarded restore operation.
 * This limits work before a destructive confirmation dialog appears.
 */
export const MAX_BACKUP_CHARACTERS = 8_000_000;

export function checkBackupEnvelope(text: string): string | null {
  // Match Core Data's serialized backup length bound before JSON.parse.
  if (text.length > MAX_BACKUP_CHARACTERS) {
    return "Backup ist zu gross (maximal 8 Millionen Zeichen).";
  }
  if (!text.trim()) return "Bitte zuerst ein Backup einfügen.";

  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return "Das Backup enthält kein gültiges JSON.";
  }
  if (
    !document ||
    typeof document !== "object" ||
    Array.isArray(document) ||
    !("format" in document) ||
    document.format !== "red-poly-progress" ||
    !("version" in document) ||
    document.version !== 1 ||
    !("state" in document) ||
    !document.state ||
    typeof document.state !== "object" ||
    Array.isArray(document.state)
  ) {
    return "Unbekanntes Backupformat oder falsche Version.";
  }
  return null;
}
