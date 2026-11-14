import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProgress } from "@/lib/store";
import { makeThemedStyles } from "@/lib/theme";
import {
  applyVocabularyReview, dueVocabularyWords, emptyVocabulary, loadVocabulary,
  saveVocabulary, vocabularyId, type VocabularyData, type VocabularyList,
  type VocabularyWord,
} from "@/features/vocabulary/storage";

export default function VocabularyScreen() {
  const styles = useStyles();
  const courseId = useProgress((s) => s.activeCourseId);
  const [data, setData] = useState<VocabularyData>(emptyVocabulary);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [listName, setListName] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadVocabulary()
      .then((loaded) => { if (mounted) { setData(loaded); setReady(true); } })
      .catch((e: unknown) => { if (mounted) setError(e instanceof Error ? e.message : "Could not load vocabulary."); });
    return () => { mounted = false; };
  }, []);

  const update = useCallback(async (next: VocabularyData) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await saveVocabulary(next);
      setData(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const lists = data.lists.filter((list) => list.courseId === courseId);
  const selected = lists.find((list) => list.id === selectedId) ?? null;
  const due = selected ? dueVocabularyWords(selected) : [];
  const reviewWord = selected?.words.find((w) => w.id === reviewId) ?? null;

  const addList = async () => {
    const title = listName.trim();
    if (!title) { setError("Enter a list name."); return; }
    const list: VocabularyList = { id: vocabularyId(), title, category: category.trim(), courseId, words: [] };
    if (await update({ ...data, lists: [...data.lists, list] })) {
      setSelectedId(list.id);
      setListName("");
      setCategory("");
    }
  };
  const saveWord = async () => {
    if (!selected) return;
    const wordValue = value.trim();
    const wordTranslation = translation.trim();
    if (!wordValue || !wordTranslation) { setError("Enter a word and a translation."); return; }
    const now = Date.now();
    const existing = selected.words.find((w) => w.id === editId);
    const word: VocabularyWord = {
      id: existing?.id ?? vocabularyId(),
      value: wordValue, translation: wordTranslation, example: example.trim(),
      createdAt: existing?.createdAt ?? now, updatedAt: now,
      correct: existing?.correct ?? 0, wrong: existing?.wrong ?? 0,
      review: existing?.review,
    };
    if (!existing && selected.words.some((w) => w.value.toLocaleLowerCase() === wordValue.toLocaleLowerCase())) {
      setError("This word already exists in this list."); return;
    }
    const next = { ...data, lists: data.lists.map((l) => l.id !== selected.id ? l : {
      ...l, words: existing ? l.words.map((w) => w.id === existing.id ? word : w) : [...l.words, word],
    }) };
    if (await update(next)) { setValue(""); setTranslation(""); setExample(""); setEditId(null); }
  };
  const deleteWord = (word: VocabularyWord) => {
    if (!selected) return;
    Alert.alert("Delete word?", word.value, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        void update({ ...data, lists: data.lists.map((l) => l.id !== selected.id ? l : {
          ...l, words: l.words.filter((w) => w.id !== word.id),
        }) });
        if (editId === word.id) { setEditId(null); setValue(""); setTranslation(""); setExample(""); }
      } },
    ]);
  };
  const deleteList = () => {
    if (!selected) return;
    Alert.alert("Delete list?", `Delete "${selected.title}" and all its words?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (await update({ ...data, lists: data.lists.filter((l) => l.id !== selected.id) })) {
          setSelectedId(null); setReviewId(null); setEditId(null);
        }
      } },
    ]);
  };
  const answer = async (correct: boolean) => {
    if (!selected || !reviewWord) return;
    if (await update(applyVocabularyReview(data, selected.id, reviewWord.id, correct))) {
      setReviewId(null); setFlipped(false);
    }
  };
  const startReview = () => { setReviewId(due[0]?.id ?? null); setFlipped(false); };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => { if (selected) { setSelectedId(null); setReviewId(null); } else router.back(); }} accessibilityRole="button">
          <Text style={styles.link}>‹ {selected ? "My lists" : "Practice"}</Text>
        </Pressable>
        <Text style={styles.heading}>Vocabulary</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!ready ? <Text style={styles.muted}>Loading local vocabulary…</Text> : null}
        {ready && !selected ? (
          <>
            <Text style={styles.subheading}>Create a list</Text>
            <TextInput style={styles.input} placeholder="List name" placeholderTextColor="#888" value={listName} onChangeText={setListName} accessibilityLabel="List name" />
            <TextInput style={styles.input} placeholder="Category or topic (optional)" placeholderTextColor="#888" value={category} onChangeText={setCategory} accessibilityLabel="Category" />
            <Action label="Create list" onPress={() => void addList()} disabled={busy} />
            <Text style={styles.subheading}>Your lists ({lists.length})</Text>
            {lists.length === 0 ? <Text style={styles.muted}>No lists yet for this course. Create one to start learning offline.</Text> : null}
            {lists.map((list) => (
              <Pressable accessibilityRole="button" key={list.id} style={styles.card} onPress={() => setSelectedId(list.id)}>
                <Text style={styles.cardTitle}>{list.title}</Text>
                <Text style={styles.muted}>{list.category ? list.category + " · " : ""}{list.words.length} words · {dueVocabularyWords(list).length} due</Text>
              </Pressable>
            ))}
          </>
        ) : null}
        {ready && selected && !reviewWord ? (
          <>
            <Text style={styles.subheading}>{selected.title}</Text>
            <Text style={styles.muted}>{selected.category || "Personal list"} · {selected.words.length} words · {due.length} due now</Text>
            <Action label={due.length ? `Review flashcards (${due.length})` : "No reviews due"} onPress={startReview} disabled={busy || due.length === 0} />
            <Text style={styles.subheading}>{editId ? "Edit word" : "Add word"}</Text>
            <TextInput accessibilityLabel="Word" style={styles.input} placeholder="Word" placeholderTextColor="#888" value={value} onChangeText={setValue} />
            <TextInput accessibilityLabel="Translation" style={styles.input} placeholder="Translation" placeholderTextColor="#888" value={translation} onChangeText={setTranslation} />
            <TextInput accessibilityLabel="Example sentence" style={styles.input} placeholder="Example sentence (optional)" placeholderTextColor="#888" value={example} onChangeText={setExample} multiline />
            <Action label={editId ? "Save changes" : "Add word"} onPress={() => void saveWord()} disabled={busy} />
            {editId ? <Action label="Cancel editing" onPress={() => { setEditId(null); setValue(""); setTranslation(""); setExample(""); }} /> : null}
            {selected.words.map((word) => (
              <View key={word.id} style={styles.card}>
                <Text style={styles.cardTitle}>{word.value}</Text>
                <Text style={styles.muted}>{word.translation}</Text>
                {word.example ? <Text style={styles.muted}>{word.example}</Text> : null}
                <Text style={styles.muted}>Correct: {word.correct} · Retry: {word.wrong}</Text>
                <View style={styles.row}>
                  <Action label="Edit" onPress={() => { setEditId(word.id); setValue(word.value); setTranslation(word.translation); setExample(word.example); }} />
                  <Action label="Delete" onPress={() => deleteWord(word)} />
                </View>
              </View>
            ))}
            <Action label="Delete list" onPress={deleteList} disabled={busy} />
          </>
        ) : null}
        {ready && selected && reviewWord ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Flashcard · {due.length} due</Text>
            <Text style={styles.flashcard}>{reviewWord.value}</Text>
            {flipped ? (
              <>
                <Text style={styles.cardTitle}>{reviewWord.translation}</Text>
                {reviewWord.example ? <Text style={styles.muted}>{reviewWord.example}</Text> : null}
                <View style={styles.row}>
                  <Action label="Again" onPress={() => void answer(false)} disabled={busy} />
                  <Action label="Remembered" onPress={() => void answer(true)} disabled={busy} />
                </View>
              </>
            ) : <Action label="Show answer" onPress={() => setFlipped(true)} />}
            <Action label="Finish review" onPress={() => { setReviewId(null); setFlipped(false); }} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useStyles();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled}
    onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>;
}
const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, paddingBottom: 70, gap: 12 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subheading: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 12 },
  link: { color: colors.indigo, fontSize: 16, fontWeight: "700", paddingVertical: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.rose, fontSize: 14, paddingVertical: 8 },
  card: { padding: 18, borderRadius: 18, borderWidth: 2, borderColor: colors.neutral200, gap: 9, backgroundColor: colors.surface },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  input: { backgroundColor: colors.surface, borderColor: colors.neutral300, color: colors.text, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
  action: { borderRadius: 12, borderWidth: 1, borderColor: colors.neutral300, paddingVertical: 12, paddingHorizontal: 15, minHeight: 44, justifyContent: "center", backgroundColor: colors.neutral100 },
  actionText: { color: colors.text, textAlign: "center", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  flashcard: { color: colors.text, fontSize: 30, fontWeight: "800", textAlign: "center", paddingVertical: 35 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
}));
