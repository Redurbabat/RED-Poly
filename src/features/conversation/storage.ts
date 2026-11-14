import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCode, Level, Message, Topic } from "./engine";

/** Separate from the existing progress-v2 store: no migrations or XP side effects. */
const KEY = "red-poly-conversation-v1";
export type SavedConversation = { language: LanguageCode; level: Level; topic: Topic; messages: Message[] };
const languages = new Set(["en", "de", "fr", "es", "it", "pt"]);
const topics = new Set(["introductions", "travel", "food", "work"]);
const levels = new Set(["A1", "A2", "B1", "B2", "C1"]);
export async function loadConversation(): Promise<SavedConversation | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const s = value as Partial<SavedConversation>;
    if (!languages.has(s.language ?? "") || !topics.has(s.topic ?? "") || !levels.has(s.level ?? "") || !Array.isArray(s.messages)) return null;
    const messages = s.messages.filter((m): m is Message => !!m && typeof m.id === "string" && (m.role === "learner" || m.role === "tutor") && typeof m.text === "string" && typeof m.at === "number").slice(-100);
    return { language: s.language!, topic: s.topic!, level: s.level!, messages };
  } catch { return null; }
}
export async function saveConversation(value: SavedConversation): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...value, messages: value.messages.slice(-100) }));
}
