/**
 * Development-only demonstration. No real progress is read, written, or restored.
 * Actual device integration happens only after Core Data PR #5 is merged.
 */
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PolyBackupTransfer } from "@/components/poly-backup-transfer";
import { PolyButton } from "@/components/red-poly-ui";
import { useThemeColors } from "@/lib/theme";

const DEMO_BACKUP = JSON.stringify({
  format: "red-poly-progress",
  version: 1,
  exportedAt: "2026-11-16T00:00:00.000Z",
  state: { onboardingDone: true, dailyGoal: 30, courses: {} },
});

export default function BackupLabRoute() {
  return __DEV__ ? <BackupLab /> : <Redirect href="/(tabs)" />;
}

function BackupLab() {
  const c = useThemeColors();
  const [restores, setRestores] = useState(0);
  const [failNextRestore, setFailNextRestore] = useState(false);
  const [imports, setImports] = useState(0);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          RED POLY · Backup Lab
        </Text>
        <Text style={{ color: c.roseDark, fontWeight: "700" }}>
          NUR SIMULATION – keine echten Lernstände werden gelesen oder ersetzt.
        </Text>
        <PolyButton
          tone="secondary"
          label="Zur App"
          onPress={() => router.replace("/(tabs)")}
        />
        <PolyButton
          tone="secondary"
          label="Nächste Wiederherstellung fehlschlagen lassen"
          onPress={() => setFailNextRestore(true)}
        />
        <PolyBackupTransfer
          exportPersistedBackup={async () => DEMO_BACKUP}
          restorePersistedBackup={async () => {
            if (failNextRestore) {
              setFailNextRestore(false);
              throw new Error("Simulierter Restore-Fehler");
            }
            setRestores((n) => n + 1);
          }}
          importLegacyVocabulary={async () => {
            setImports((n) => n + 1);
            return { listsAdded: 2, wordsAdded: 5 };
          }}
        />
        <View style={styles.foot}>
          <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>
            Test-Wiederherstellungen: {restores}
          </Text>
          <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>
            Test-Importe: {imports}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 18, paddingBottom: 48, gap: 18, maxWidth: 680, width: "100%", alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  foot: { gap: 8, padding: 8 },
});
