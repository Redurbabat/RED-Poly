import React, { useRef, useState } from "react";
import { Platform, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { PolyButton, PolyCard } from "@/components/red-poly-ui";
import { exportCompleteDeviceBackup } from "@/features/backup/device-export";
import { useThemeColors } from "@/lib/theme";

/**
 * Explicit export of all three local data stores.
 * No destructive restore is offered until a verified cross-store rollback
 * mechanism exists; never imply that a partial import is safe.
 */
export function CompleteBackupExport() {
  const colors = useThemeColors();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const generate = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setArchive(""); // Never expose stale data after an unsuccessful export.
    setError("");
    setFeedback("");
    try {
      const result = await exportCompleteDeviceBackup();
      setArchive(result);
      setFeedback("Gesamtarchiv bereit. Speichere es privat als JSON-Datei.");
    } catch {
      setError("Gesamtarchiv konnte nicht vollständig geprüft werden. Daten nicht verändert. Erneut versuchen, ohne gleichzeitig zu lernen.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const download = () => {
    if (!archive || Platform.OS !== "web" || typeof document === "undefined") return;
    try {
      const file = new Blob([archive], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = "red-poly-gesamtbackup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback("JSON-Download gestartet. Bitte überprüfe, ob die Datei gespeichert wurde.");
    } catch {
      setError("Der Download konnte nicht gestartet werden.");
    }
  };

  const share = async () => {
    if (!archive || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await Share.share({ title: "RED POLY Gesamtbackup", message: archive });
      setFeedback("System-Teilen geöffnet. Prüfe, ob das Ziel die Daten gespeichert hat.");
    } catch {
      setError("Teilen nicht möglich. Das Archiv wurde nicht automatisch gespeichert.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <PolyCard>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Alle Daten sichern
        </Text>
        <Text style={{ color: colors.textMuted }}>
          Ein JSON-Archiv für Lernfortschritt, eigene Wortlisten und den letzten Gesprächsverlauf.
          Es bleibt auf deinem Gerät, bis du es ausdrücklich herunterlädst oder teilst.
          Die Daten enthalten persönliche Informationen und sind nicht verschlüsselt.
        </Text>
        <Text style={{ color: colors.roseDark, fontWeight: "600" }}>
          Nur Export. Eine automatische vollständige Wiederherstellung ist noch nicht verfügbar.
          Alte Daten bitte nicht löschen. Dieses Archiv ist kein Cloud-Sync.
        </Text>
        <PolyButton label="Gesamtes Archiv erzeugen" onPress={() => { void generate(); }} loading={busy} />
        {archive.length > 0 && (
          <>
            <Text style={{ color: colors.textMuted }}>
              Archiv geprüft ({archive.length} Zeichen). Die folgende Vorschau ist gekürzt.
              Zum Sichern die vollständige Datei herunterladen oder teilen.
            </Text>
            <TextInput
              accessibilityLabel="Gesamtarchiv Vorschau"
              editable={false}
              multiline
              selectTextOnFocus
              value={archive.slice(0, 1000) + (archive.length > 1000 ? "\n… (Vorschau gekürzt)" : "")}
              style={[styles.preview, { color: colors.text, borderColor: colors.neutral300, backgroundColor: colors.surface }]}
            />
            {Platform.OS === "web" ? (
              <PolyButton label="Gesamtarchiv als JSON herunterladen" onPress={download} />
            ) : (
              <PolyButton label="Gesamtarchiv über System teilen" onPress={() => { void share(); }} disabled={busy} />
            )}
            <PolyButton tone="secondary" label="Archiv aus Anzeige löschen" onPress={() => {
              setArchive("");
              setFeedback("Archiv aus der Ansicht gelöscht.");
            }} disabled={busy} />
          </>
        )}
        {!!feedback && <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{feedback}</Text>}
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.roseDark }}>{error}</Text>}
      </View>
    </PolyCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  title: { fontSize: 20, fontWeight: "800" },
  preview: { borderWidth: 1, borderRadius: 12, minHeight: 85, maxHeight: 150, padding: 12, fontSize: 12 },
});
