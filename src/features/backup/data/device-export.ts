import AsyncStorage from "@react-native-async-storage/async-storage";
import { exportStableCompleteDeviceBackup } from "@/lib/complete-device-backup.mjs";
import { loadVocabulary } from "@/features/vocabulary/storage";
import { CONVERSATION_STORAGE_KEY, loadConversation } from "@/features/conversation/storage";
import { exportPersistedProgressBackup } from "@/lib/store";

/**
 * Exports course progress, personal vocabulary, and current conversation.
 * No restore, upload or account access is performed.
 */
export async function exportCompleteDeviceBackup(): Promise<string> {
  return exportStableCompleteDeviceBackup({
    readProgress: exportPersistedProgressBackup,
    readVocabulary: loadVocabulary,
    readConversation: async () => {
      // loadConversation waits for pending writes and discards invalid messages;
      // never silently issue a "complete" backup with partially corrupt history.
      const conversation = await loadConversation();
      const stored = await AsyncStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (stored !== null) {
        if (conversation === null) {
          throw new Error("Saved conversation is unreadable; abort complete backup.");
        }
        let raw: unknown;
        try { raw = JSON.parse(stored); }
        catch { throw new Error("Saved conversation contains invalid JSON."); }
        if (!raw || typeof raw !== "object" || !("messages" in raw) ||
            !Array.isArray(raw.messages) || raw.messages.length !== conversation.messages.length) {
          throw new Error("Conversation history cannot be fully verified.");
        }
      }
      return conversation;
    },
  });
}
