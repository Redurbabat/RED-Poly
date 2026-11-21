/**
 * Development-only visual QA route for the shared RED POLY primitives.
 * Navigate to /design-lab in an Expo development build.
 * The published app redirects to the existing tab home instead.
 */
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PolyButton,
  PolyCard,
  PolyDialog,
  PolyError,
  PolyGlassSurface,
  PolyLoading,
  PolyNavItem,
  PolyProgress,
  PolyTextField,
  usePolyMotion,
} from "@/components/red-poly-ui";
import { useResolvedScheme, useThemeColors } from "@/lib/theme";

export default function DesignLabRoute() {
  return __DEV__ ? <DesignLab /> : <Redirect href="/(tabs)" />;
}

function DesignLab() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const { reducedMotion } = usePolyMotion();
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState(0.35);
  const [selected, setSelected] = useState<"learn" | "practice">("learn");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("Noch keine Aktion");

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            RED POLY · Design Lab
          </Text>
          <Text style={{ color: colors.textMuted }}>
            Entwicklungsansicht für die gemeinsame UI-Bibliothek. Keine Lerndaten werden geändert.
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {Platform.OS} · {scheme} · {reducedMotion ? "Reduce Motion" : "Motion aktiv"}
          </Text>
          <PolyButton tone="secondary" label="Zur App" onPress={() => router.replace("/(tabs)")} />
        </View>

        <PolyGlassSurface>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Optical Glass</Text>
          <Text style={{ color: colors.textMuted }}>
            Native Darstellung nur auf unterstütztem iOS. Sonst lesbarer Fallback.
          </Text>
        </PolyGlassSurface>

        <PolyCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktionen</Text>
          <PolyButton label="Primäre Aktion" onPress={() => setFeedback("Primäre Aktion ausgeführt")} />
          <PolyButton tone="secondary" label="Dialog öffnen" onPress={() => setDialogOpen(true)} />
          <PolyButton tone="danger" label="Fehlerzustand testen" onPress={() => setFeedback("Fehleraktion ausgelöst")} />
          <PolyButton label="Deaktivierte Aktion" disabled onPress={() => setFeedback("Dies darf nicht erscheinen")} />
          <PolyButton label="Ladezustand" loading onPress={() => setFeedback("Dies darf nicht erscheinen")} />
          <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted }}>
            {feedback}
          </Text>
        </PolyCard>

        <PolyCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Eingabe</Text>
          <PolyTextField
            label="Beispieltext"
            value={query}
            onChangeText={setQuery}
            placeholder="Hier schreiben"
            error={query.length > 0 && query.length < 3 ? "Mindestens drei Zeichen" : undefined}
          />
          <View style={styles.navRow}>
            <PolyNavItem label="Lernen" selected={selected === "learn"} onPress={() => setSelected("learn")} />
            <PolyNavItem label="Üben" selected={selected === "practice"} onPress={() => setSelected("practice")} />
          </View>
        </PolyCard>

        <PolyCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Status und Fortschritt</Text>
          <PolyProgress progress={progress} label="Beispiel-Fortschritt" />
          <View style={styles.navRow}>
            <View style={styles.flexButton}>
              <PolyButton tone="secondary" label="− 10 %" onPress={() => setProgress((v) => Math.max(0, v - 0.1))} />
            </View>
            <View style={styles.flexButton}>
              <PolyButton tone="secondary" label="+ 10 %" onPress={() => setProgress((v) => Math.min(1, v + 0.1))} />
            </View>
          </View>
          <PolyLoading label="Beispiel wird geladen" />
          <PolyError
            message="Testfehler – offline oder erneut versuchen"
            onRetry={() => setFeedback("Erneut versuchen gedrückt")}
          />
        </PolyCard>
      </ScrollView>

      <PolyDialog
        visible={dialogOpen}
        title="Testdialog"
        message="Prüfe Fokus, Tastatur, Kontrast und Reduce Motion."
        confirmLabel="Bestätigen"
        onConfirm={() => { setDialogOpen(false); setFeedback("Dialog bestätigt"); }}
        onCancel={() => { setDialogOpen(false); setFeedback("Dialog abgebrochen"); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 18, paddingBottom: 48, gap: 16, width: "100%", maxWidth: 680, alignSelf: "center" },
  header: { gap: 12, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  flexButton: { flexGrow: 1, minWidth: 110 },
});
