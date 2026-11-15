import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { demoProvider, LANGUAGES, TOPICS, makeMessage, openingLine, type LanguageCode, type Level, type Message, type Topic } from "@/features/conversation/engine";
import { loadConversation, saveConversation } from "@/features/conversation/storage";
import { createWebSpeechSession, isWebSpeechSupported, type SpeechSession } from "@/features/conversation/web-speech";
import { useThemeColors } from "@/lib/theme";

const OPTIONS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
export default function ConversationScreen() {
  const colors = useThemeColors();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [level, setLevel] = useState<Level>("A1");
  const [topic, setTopic] = useState<Topic>("introductions");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [speechConsentVisible, setSpeechConsentVisible] = useState(false);
  const [speechApproved, setSpeechApproved] = useState(false);
  const [speechStarting, setSpeechStarting] = useState(false);
  const [speechListening, setSpeechListening] = useState(false);
  const speechSession = useRef<SpeechSession | null>(null);
  const webSpeechAvailable = Platform.OS === "web" && isWebSpeechSupported();
  const active = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    let mounted = true;
    loadConversation().then((saved) => {
      if (!mounted) return;
      if (saved) { setLanguage(saved.language); setLevel(saved.level); setTopic(saved.topic); setMessages(saved.messages); }
      setLoaded(true);
    });
    return () => { mounted = false; active.current?.abort(); speechSession.current?.abort(); speechSession.current = null; Speech.stop(); };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveConversation({ language, level, topic, messages }).catch(() => setError("Gesprächsverlauf konnte nicht gespeichert werden."));
  }, [language, level, topic, messages, loaded]);
  const stopDictation = useCallback(() => {
    const current = speechSession.current;
    speechSession.current = null;
    current?.abort();
    setSpeechListening(false);
    setSpeechStarting(false);
    setSpeechConsentVisible(false);
  }, []);
  const startDictation = () => {
    if (!webSpeechAvailable || speechSession.current) return;
    setSpeechConsentVisible(false);
    setError("");
    Speech.stop();
    const languageTag = LANGUAGES.find((item) => item.code === language)?.locale ?? "en-US";
    const session = createWebSpeechSession(languageTag, {
      onStart: () => {
        if (speechSession.current === session) { setSpeechStarting(false); setSpeechListening(true); }
      },
      onText: (text) => {
        if (speechSession.current === session) setInput((previous) => (previous.trim() ? previous.trim() + " " + text : text).slice(0, 1000));
      },
      onEnd: () => {
        if (speechSession.current === session) {
          speechSession.current = null; setSpeechStarting(false); setSpeechListening(false);
        }
      },
      onError: (reason) => {
        if (speechSession.current !== session) return;
        setError(reason === "permission" ? "Mikrofonzugriff verweigert."
          : reason === "network" ? "Spracherkennung benötigt derzeit eine Netzwerkverbindung."
          : reason === "no-speech" ? "Keine Sprache erkannt. Bitte erneut versuchen."
          : "Spracherkennung nicht verfügbar.");
      },
    });
    if (!session) { setError("Dieser Browser unterstützt die Spracheingabe nicht."); return; }
    speechSession.current = session;
    setSpeechStarting(true);
    try { session.start(); }
    catch { stopDictation(); setError("Die Spracherkennung konnte nicht gestartet werden."); }
  };
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setPending(false);
    stopDictation();
    Speech.stop();
  }, [stopDictation]);
  const begin = useCallback(() => {
    cancel();
    setError("");
    setMessages([makeMessage("tutor", openingLine(language, topic))]);
  }, [language, topic, cancel]);
  const send = useCallback(async () => {
    const trimmed = input.trim().slice(0, 1000);
    if (!trimmed || pending || !loaded) return;
    stopDictation();
    const next = [...messages, makeMessage("learner", trimmed)];
    setMessages(next);
    setInput("");
    setError("");
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    try {
      const reply = await demoProvider.reply({ language, level, topic, messages: next }, controller.signal);
      if (!controller.signal.aborted) setMessages((old) => [...old, makeMessage("tutor", reply.text)]);
    } catch {
      if (!controller.signal.aborted) setError("Antwort fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      if (active.current === controller) { active.current = null; setPending(false); }
    }
  }, [input, pending, loaded, messages, language, level, topic, stopDictation]);
  const change = (type: "language" | "level" | "topic", value: string) => {
    cancel(); setMessages([]); setError("");
    if (type === "language") setLanguage(value as LanguageCode);
    if (type === "level") setLevel(value as Level);
    if (type === "topic") setTopic(value as Topic);
  };
  const speak = (text: string) => {
    Speech.stop();
    try { Speech.speak(text, { language: LANGUAGES.find((l) => l.code === language)?.locale, rate: level === "A1" ? 0.8 : 0.95, onError: () => setError("Sprachausgabe nicht verfügbar.") }); }
    catch { setError("Sprachausgabe nicht verfügbar."); }
  };
  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.selectedBg : colors.surface, borderColor: selected ? colors.sky : colors.neutral200 }]}>
      <Text style={{ color: colors.text, fontWeight: selected ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.header}>
      <Pressable onPress={() => { cancel(); router.back(); }} accessibilityRole="button" accessibilityLabel="Zurück"><Ionicons name="arrow-back" size={26} color={colors.text} /></Pressable>
      <Text style={[styles.title, { color: colors.text }]}>RED POLY · Gespräch</Text>
      <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="Abbrechen"><Ionicons name="stop-circle-outline" size={27} color={colors.text} /></Pressable>
    </View>
    <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={[styles.notice, { color: colors.text }]}>OFFLINE-DEMO · Keine echte KI. Antworten sind vorbereitete Übungssätze. Keine Grammatikprüfung oder Transkription.</Text>
      <Text style={{ color: colors.textMuted }}>Sprache</Text>
      <View style={styles.row}>{LANGUAGES.map((l) => chip(l.name, language === l.code, () => change("language", l.code)))}</View>
      <Text style={{ color: colors.textMuted }}>Niveau</Text>
      <View style={styles.row}>{OPTIONS.map((v) => chip(v, level === v, () => change("level", v)))}</View>
      <Text style={{ color: colors.textMuted }}>Thema</Text>
      <View style={styles.row}>{TOPICS.map((t) => chip(t.label, topic === t.id, () => change("topic", t.id)))}</View>
      <Pressable onPress={begin} style={[styles.action, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.actionText}>{messages.length ? "Neues Gespräch" : "Gespräch starten"}</Text></Pressable>
      {messages.map((m) => <View key={m.id} style={[styles.bubble, { backgroundColor: m.role === "learner" ? colors.selectedBg : colors.neutral100, alignSelf: m.role === "learner" ? "flex-end" : "flex-start" }]}>
        <Text style={{ color: colors.text }}>{m.text}</Text>
        {m.role === "tutor" && <Pressable accessibilityRole="button" accessibilityLabel="Satz vorlesen" onPress={() => speak(m.text)} style={styles.listen}><Ionicons name="volume-medium-outline" size={20} color={colors.sky} /><Text style={{ color: colors.textMuted }}>Vorlesen</Text></Pressable>}
      </View>)}
      {pending && <ActivityIndicator />}
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.rose }}>{error}</Text>}
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {Platform.OS === "web"
          ? "Optionales Web-Diktat: Nur mit Einwilligung. Je nach Browser wird Audio an dessen Spracherkennungsdienst übertragen. Der erkannte Text wird nicht automatisch gesendet."
          : "Native Spracherkennung ist noch nicht integriert. Es werden keine Mikrofonaufnahmen gemacht oder übertragen."}
        {" "}Gesprächsverlauf bleibt lokal gespeichert.
      </Text>
      {speechConsentVisible && <View style={[styles.consent, { backgroundColor: colors.surface, borderColor: colors.sky }]}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Web-Spracherkennung erlauben?</Text>
        <Text style={{ color: colors.text }}>
          Nach deiner Zustimmung kann der Browser das Mikrofon öffnen und Audio an seinen Erkennungsdienst übertragen.
          Das kann Internet erfordern. RED POLY sendet selbst kein Audio an einen KI-Anbieter.
          Das Ergebnis wird nur in das Eingabefeld eingefügt, nicht automatisch gesendet.
        </Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => setSpeechConsentVisible(false)} style={[styles.chip, { borderColor: colors.neutral200 }]}><Text style={{ color: colors.text }}>Abbrechen</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setSpeechApproved(true); startDictation(); }} style={[styles.chip, { borderColor: colors.sky }]}><Text style={{ color: colors.text, fontWeight: "700" }}>Zustimmen und starten</Text></Pressable>
        </View>
      </View>}
    </ScrollView>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.composer, { borderTopColor: colors.neutral200 }]}>
        <Pressable disabled={!webSpeechAvailable || !loaded || !messages.length || pending}
          onPress={() => {
            if (speechSession.current) stopDictation();
            else if (speechApproved) startDictation();
            else setSpeechConsentVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={!webSpeechAvailable ? "Spracherkennung auf dieser Plattform nicht verfügbar" : speechListening || speechStarting ? "Diktat abbrechen" : "Diktat starten"}
          style={styles.mic}>
          <Ionicons name={!webSpeechAvailable ? "mic-off-outline" : speechListening || speechStarting ? "stop-circle-outline" : "mic-outline"} size={24} color={speechListening ? colors.rose : colors.textMuted} />
        </Pressable>
        <TextInput value={input} onChangeText={setInput} placeholder="Schreibe eine Antwort …" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.neutral200 }]} multiline maxLength={1000} editable={messages.length > 0 && !pending} />
        <Pressable onPress={send} disabled={!input.trim() || !messages.length || pending} accessibilityRole="button" accessibilityLabel="Text senden" style={styles.mic}><Ionicons name="send" size={23} color={colors.green} /></Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: "800" }, body: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  notice: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#888", fontSize: 13 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
  action: { padding: 14, borderRadius: 14, alignItems: "center" }, actionText: { color: "#102014", fontWeight: "800" },
  consent: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  bubble: { maxWidth: "88%", padding: 14, borderRadius: 16, gap: 8 }, listen: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  composer: { flexDirection: "row", alignItems: "center", padding: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, mic: { padding: 8 },
});
