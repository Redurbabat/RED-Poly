/**
 * RED POLY conversation domain. Concepts adapted from Mural's TeachingPolicy,
 * ConversationPace, Languages and ConversationProviders (MIT).
 * No native Swift/Kotlin code, network calls or Mural account services copied.
 */
export type LanguageCode = "en" | "de" | "fr" | "es" | "it" | "pt";
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export type Topic = "introductions" | "travel" | "food" | "work";
export type Message = { id: string; role: "learner" | "tutor"; text: string; at: number };
export type VocabularySuggestion = { word: string; meaning: string; source: "demo" | "provider" };
export type Correction = { original: string; corrected: string; explanation: string };
export type TutorReply = { text: string; corrections: Correction[]; suggestions: VocabularySuggestion[]; simulated: boolean };
export type ChatRequest = { language: LanguageCode; level: Level; topic: Topic; messages: Message[] };
export interface ConversationProvider {
  readonly id: string;
  readonly isDemo: boolean;
  reply(request: ChatRequest, signal: AbortSignal): Promise<TutorReply>;
}
export const LANGUAGES: { code: LanguageCode; name: string; locale: string }[] = [
  { code: "en", name: "English", locale: "en-US" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "it", name: "Italiano", locale: "it-IT" },
  { code: "pt", name: "Português", locale: "pt-PT" },
];
export const TOPICS: { id: Topic; label: string }[] = [
  { id: "introductions", label: "Kennenlernen" },
  { id: "travel", label: "Reisen" },
  { id: "food", label: "Essen" },
  { id: "work", label: "Arbeit" },
];
const examples: Record<LanguageCode, Record<Topic, [string, string, string]>> = {
  en: { introductions: ["What is your name?", "What do you enjoy doing?", "Tell me about yourself."], travel: ["Where would you like to travel?", "How do you usually travel?", "Describe your ideal journey."], food: ["What is your favourite food?", "Do you like cooking?", "Describe a meal you remember."], work: ["What do you do?", "What do you enjoy about your work?", "What would you change about your work?"] },
  de: { introductions: ["Wie heisst du?", "Was machst du gern?", "Erzähl mir etwas über dich."], travel: ["Wohin möchtest du reisen?", "Wie reist du am liebsten?", "Beschreibe deine Traumreise."], food: ["Was isst du gern?", "Kochst du gern?", "Beschreibe ein besonderes Essen."], work: ["Was arbeitest du?", "Was gefällt dir an deiner Arbeit?", "Was würdest du an deiner Arbeit ändern?"] },
  fr: { introductions: ["Comment tu t'appelles ?", "Qu'est-ce que tu aimes faire ?", "Parle-moi de toi."], travel: ["Où veux-tu voyager ?", "Comment préfères-tu voyager ?", "Décris ton voyage idéal."], food: ["Quel plat aimes-tu ?", "Tu aimes cuisiner ?", "Décris un repas spécial."], work: ["Quel est ton métier ?", "Qu'est-ce que tu aimes dans ton travail ?", "Que changerais-tu au travail ?"] },
  es: { introductions: ["¿Cómo te llamas?", "¿Qué te gusta hacer?", "Háblame de ti."], travel: ["¿Adónde quieres viajar?", "¿Cómo prefieres viajar?", "Describe tu viaje ideal."], food: ["¿Qué comida te gusta?", "¿Te gusta cocinar?", "Describe una comida especial."], work: ["¿En qué trabajas?", "¿Qué te gusta de tu trabajo?", "¿Qué cambiarías de tu trabajo?"] },
  it: { introductions: ["Come ti chiami?", "Che cosa ti piace fare?", "Parlami di te."], travel: ["Dove vuoi viaggiare?", "Come preferisci viaggiare?", "Descrivi il tuo viaggio ideale."], food: ["Quale cibo ti piace?", "Ti piace cucinare?", "Descrivi un pasto speciale."], work: ["Che lavoro fai?", "Cosa ti piace del tuo lavoro?", "Cosa cambieresti del tuo lavoro?"] },
  pt: { introductions: ["Como te chamas?", "O que gostas de fazer?", "Fala-me de ti."], travel: ["Para onde queres viajar?", "Como preferes viajar?", "Descreve a tua viagem ideal."], food: ["De que comida gostas?", "Gostas de cozinhar?", "Descreve uma refeição especial."], work: ["Em que trabalhas?", "De que gostas no teu trabalho?", "O que mudarias no teu trabalho?"] },
};
export function openingLine(language: LanguageCode, topic: Topic): string {
  return examples[language][topic][0];
}
export class DemoConversationProvider implements ConversationProvider {
  readonly id = "offline-demo";
  readonly isDemo = true;
  async reply(request: ChatRequest, signal: AbortSignal): Promise<TutorReply> {
    if (signal.aborted) throw new Error("ABORTED");
    const count = request.messages.filter((m) => m.role === "learner").length;
    const prompts = examples[request.language][request.topic];
    const index = request.level === "A1" ? Math.min(count, 1) : Math.min(count, 2);
    // Fixed practice prompts, not an AI evaluation of the learner's response.
    return { text: prompts[index], corrections: [], suggestions: [], simulated: true };
  }
}
export const demoProvider = new DemoConversationProvider();
export function makeMessage(role: Message["role"], text: string): Message {
  return { id: Math.random().toString(36).slice(2) + Date.now().toString(36), role, text, at: Date.now() };
}
