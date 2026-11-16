/**
 * UI-only backup/restore controls for the eventual Core Data integration.
 * No store access, AsyncStorage writes, cloud calls, or automatic transfer.
 * Callers MUST supply Agent 01's guarded asynchronous device APIs.
 */
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { checkBackupEnvelope } from "@/components/poly-backup-envelope";
import { PolyButton, PolyCard, PolyDialog, PolyError } from "@/components/red-poly-ui";
import { radius, useThemeColors } from "@/lib/theme";

export type PolyBackupTransferHandlers = {
  exportPersistedBackup: () => Promise<string>;
  restorePersistedBackup: (backupJSON: string) => Promise<void>;
  importLegacyVocabulary?: () => Promise<{ listsAdded: number; wordsAdded: number }>;
};

type Operation = "export" | "restore" | "import" | "share" | null;

export { checkBackupEnvelope } from "@/components/poly-backup-envelope";

export function PolyBackupTransfer({
  exportPersistedBackup,
  restorePersistedBackup,
  importLegacyVocabulary,
}: PolyBackupTransferHandlers) {
  const c = useThemeColors();
  const busyRef = useRef(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exported, setExported] = useState("");
  const [incoming, setIncoming] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);

  const isBusy = operation !== null;

  function execute(kind: Exclude<Operation, null>, callback: () => Promise<void>) {
    // Protect against double-taps before React updates disabled state.
    if (busyRef.current) return;
    busyRef.current = true;
    setOperation(kind);
    setError(null);
    setFeedback(null);
    void (async () => {
      try {
        await callback();
      } catch {
        setError(
          kind === "export"
            ? "Export fehlgeschlagen. Bitte gespeicherten Lernstand prüfen und erneut versuchen."
            : kind === "share"
              ? "Teilen nicht möglich. Bitte Backup manuell kopieren."
            : kind === "restore"
              ? "Wiederherstellung fehlgeschlagen. Bitte Backup und aktuellen Lernstand prüfen."
              : "Wortlistenimport fehlgeschlagen. Bestehende Daten nicht löschen."
        );
      } finally {
        busyRef.current = false;
        setOperation(null);
      }
    })();
  }

  function prepareRestore() {
    if (busyRef.current) return;
    setError(null);
    setFeedback(null);
    const validation = checkBackupEnvelope(incoming);
    if (validation) {
      setError(validation);
      return;
    }
    // A frozen copy is used, not any input altered during confirmation.
    setPending(incoming);
    setConfirmation("");
    setConfirmVisible(true);
  }

  function cancelRestore() {
    if (busyRef.current) return;
    setConfirmVisible(false);
    setPending(null);
    setConfirmation("");
  }

  function confirmRestore() {
    if (busyRef.current || pending === null || confirmation !== "ERSETZEN") return;
    const backup = pending;
    setConfirmVisible(false);
    setPending(null);
    setConfirmation("");
    execute("restore", async () => {
      await restorePersistedBackup(backup);
      setIncoming("");
      setFeedback("Wiederherstellung durch den verbundenen Datenkern bestätigt.");
    });
  }

  return (
    <View style={styles.root}>
      <PolyCard>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Lernstand exportieren
        </Text>
        <Text style={{ color: c.textMuted }}>
          Der Datenkern muss zuerst den gespeicherten Stand verifizieren. Der Export
          erscheint nur hier auf dem Gerät, bis du ihn selbst kopierst.
        </Text>
        <PolyButton
          label="Backup erzeugen"
          disabled={isBusy}
          loading={operation === "export"}
          onPress={() => execute("export", async () => {
            // Hide a previous snapshot immediately. A failed export must never
            // present old bytes as if they were freshly verified.
            setExported("");
            const result = await exportPersistedBackup();
            const validation = checkBackupEnvelope(result);
            if (validation) throw new Error(validation);
            setExported(result);
            setFeedback("Backup vorbereitet. Bitte vollständig kopieren und sicher speichern.");
          })}
        />
        {exported.length > 0 && (
          <>
            <Text style={[styles.label, { color: c.text }]}>Exportiertes Backup (nicht automatisch gespeichert)</Text>
            <TextInput
              accessibilityLabel="Exportiertes Backup"
              value={exported}
              editable={false}
              multiline
              selectTextOnFocus
              style={[styles.input, styles.jsonField, { color: c.text, backgroundColor: c.surface, borderColor: c.neutral300 }]}
            />
            <Text style={{ color: c.roseDark }}>
              Ein Backup enthält persönliche Lerndaten. Nur an einen privaten,
              vertrauenswürdigen Speicherort weitergeben.
            </Text>
            {Platform.OS !== "web" && (
              <PolyButton
                tone="secondary"
                label="Backup über System teilen"
                disabled={isBusy}
                loading={operation === "share"}
                onPress={() => execute("share", async () => {
                  // Native share sheet is user-initiated, never automatic.
                  // Its completion does not prove the destination saved data.
                  await Share.share(
                    { message: exported, title: "RED POLY Backup" },
                    { dialogTitle: "RED POLY Backup sichern" },
                  );
                })}
              />
            )}
            <PolyButton
              tone="secondary"
              label="Exportanzeige löschen"
              disabled={isBusy}
              onPress={() => { setExported(""); setFeedback("Exportanzeige gelöscht."); }}
            />
          </>
        )}
      </PolyCard>

      <PolyCard>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Lernstand wiederherstellen
        </Text>
        <Text style={{ color: c.roseDark }}>
          Achtung: Dies ersetzt den vorhandenen Lernfortschritt. Ein fehlerhaftes
          Backup kann zu Datenverlust führen. Sichere zuerst den aktuellen Stand.
        </Text>
        <Text style={[styles.label, { color: c.text }]}>Backup-JSON einfügen</Text>
        <TextInput
          accessibilityLabel="Backup JSON zum Wiederherstellen"
          multiline
          value={incoming}
          onChangeText={(value) => { setIncoming(value); setError(null); }}
          placeholder="Backup hier einfügen"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isBusy}
          style={[styles.input, styles.jsonField, { color: c.text, backgroundColor: c.surface, borderColor: c.neutral300 }]}
        />
        <PolyButton
          tone="danger"
          label="Wiederherstellung vorbereiten"
          disabled={isBusy}
          onPress={prepareRestore}
        />
      </PolyCard>

      {importLegacyVocabulary && (
        <PolyCard>
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
            Alte Wortlisten importieren
          </Text>
          <Text style={{ color: c.textMuted }}>
            Importiere die bisherigen WordPecker-Wortlisten erst nach einer
            Sicherung. Der getrennte alte Speicher darf nicht gelöscht werden.
          </Text>
          <PolyButton
            tone="secondary"
            label="Wortlistenimport vorbereiten"
            disabled={isBusy}
            onPress={() => { setError(null); setImportVisible(true); }}
          />
        </PolyCard>
      )}

      {operation !== null && (
        <Text accessibilityLiveRegion="polite" style={{ color: c.textMuted }}>
          {operation === "export" ? "Export wird geprüft" :
            operation === "share" ? "System-Teilen wird geöffnet" :
              operation === "restore" ? "Wiederherstellung läuft" : "Wortlisten werden importiert"}
        </Text>
      )}
      {!!feedback && (
        <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>{feedback}</Text>
      )}
      {!!error && <PolyError message={error} />}

      <Modal
        visible={confirmVisible}
        transparent
        animationType="none"
        onRequestClose={cancelRestore}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <ScrollView
          style={styles.modalScroller}
          contentContainerStyle={styles.modalScrollBody}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Bestätigung der Lernstand-Wiederherstellung"
        >
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={cancelRestore}
            style={[styles.modal, { backgroundColor: c.surface, borderColor: c.neutral300 }]}
          >
            <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
              Lernstand wirklich ersetzen?
            </Text>
            <Text style={{ color: c.text }}>
              Alle aktuellen XP, Lektionen und Wiederholungen können durch den
              Stand aus dem Backup ersetzt werden. Nur mit einer eigenen,
              sicheren Sicherung fortfahren.
            </Text>
            <Text style={[styles.label, { color: c.text }]}>
              Zur Bestätigung ERSETZEN eingeben
            </Text>
            <TextInput
              accessibilityLabel="Bestätigungscode ERSETZEN"
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="ERSETZEN"
              placeholderTextColor={c.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isBusy}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.neutral300 }]}
            />
            <PolyButton
              tone="danger"
              label="Lernstand endgültig ersetzen"
              disabled={confirmation !== "ERSETZEN" || isBusy}
              onPress={confirmRestore}
            />
            <PolyButton tone="secondary" label="Abbrechen" disabled={isBusy} onPress={cancelRestore} />
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {importLegacyVocabulary && (
        <PolyDialog
          visible={importVisible}
          title="Alte Wortlisten übernehmen?"
          message="Nur nach Sicherung und eigener Bestätigung. Der alte Wortlistenspeicher bleibt erhalten. Bei Konflikten muss der Datenkern abbrechen."
          confirmLabel="Wortlisten importieren"
          onCancel={() => setImportVisible(false)}
          onConfirm={() => {
            setImportVisible(false);
            execute("import", async () => {
              const result = await importLegacyVocabulary();
              setFeedback(
                "Import bestätigt: " + result.listsAdded +
                " Listen und " + result.wordsAdded + " Wörter übernommen."
              );
            });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  title: { fontSize: 19, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600" },
  input: { borderRadius: radius.md, borderWidth: 1, minHeight: 48, padding: 12, fontSize: 14 },
  jsonField: { minHeight: 104, maxHeight: 180, textAlignVertical: "top", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", padding: 18 },
  // A short viewport (or an open iPhone keyboard) must not hide Cancel/Confirm.
  // The dialog grows up to its natural height; the outer ScrollView takes over.
  modalScroller: { flex: 1, width: "100%" },
  modalScrollBody: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 16 },
  modal: { borderWidth: 1, borderRadius: radius.xl, padding: 18, gap: 16, width: "100%", maxWidth: 480, alignSelf: "center" },
});
