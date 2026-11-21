import { Stack, router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PolyBackupTransfer } from "@/components/poly-backup-transfer";
import { PolyButton } from "@/components/red-poly-ui";
import { exportPersistedProgressBackup, restoreProgressBackup } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

/**
 * Real, explicit device backup/restore using the guarded Core Data APIs.
 * Personal data is never sent to a server or automatically restored.
 * The separate WordPecker vocabulary-v1 store has its own JSON export.
 */
export default function BackupScreen() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            RED POLY · Backup
          </Text>
          <PolyButton tone="secondary" label="Back to profile" onPress={() => router.back()} />
        </View>
        <Text style={{ color: colors.textMuted }}>
          Exports and restores your course progress locally. Personal vocabulary
          lists currently use a separate JSON export in the Vocabulary screen.
          Keep a private copy before changing device or installing a differently
          identified app. Restoring replaces your existing course progress.
        </Text>
        <PolyBackupTransfer
          exportPersistedBackup={exportPersistedProgressBackup}
          restorePersistedBackup={restoreProgressBackup}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 18, paddingBottom: 60, gap: 18, maxWidth: 680, width: "100%", alignSelf: "center" },
  heading: { gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
});
