# RED POLY — Core Data API (Agent 01)

**Stand:** 16.11.2026 · **Branch:** `agent/01-core-data` · **Status:** Datenkern implementiert; UI und echte Geräte nicht abgenommen.

## Geltungsbereich

Die vorhandene Expo-App und `src/lib/store.ts` bleiben die einzige Quelle für Lernfortschritt. **Kein zweiter Zustand-/AsyncStorage-Store** für WordPecker oder Mural. Bestehende `src/lib/types.ts`-Content-Packs, Kurs-IDs, Lektions-IDs, XP, Serien, Fehler und SRS-Schlüssel werden nicht umbenannt.

Implementierte Dateien:
- `src/lib/progress-data.mjs`: pure, offlinefähige Migration, Backups, Listen und SRS-Schlüssel.
- `src/lib/progress-data.d.mts`: TypeScript-Verträge, ohne zusätzliche Runtime-Abhängigkeiten.
- `src/lib/store.ts`: Aktionen für Wortlisten, gemeinsame Reviews und Spracheinstellungen; Upgrade bei bestehendem Persistenzschlüssel.
- `tests/progress-data.test.mjs` und `tests/vocabulary-bridge.test.mjs`: isolierte Regressionen.
- `src/lib/vocabulary-bridge.mjs` / `.d.mts`: validierter Import aus dem getrennten Vokabelspeicher von Agent 02.
- `src/lib/progress-write-guard.mjs` / `.d.mts`: lokale Schreibsperre mit Abschlussprüfung ausstehender Persistenzoperationen.
- `src/lib/progress-storage.mjs` / `.d.mts`: serialisierter AsyncStorage-Adapter; verhindert, dass alte Zustand-Snapshots neuere XP-/SRS-Werte durch verspätete Writes überschreiben.
- `tests/progress-write-guard.test.mjs`: überprüft Sperre, parallele Importe und fehlerhafte Speicheroperationen.
- `tests/progress-storage.test.mjs`: prüft die Reihenfolge von zwei XP-Saves, Storage-Deletes, Write-Drain bei Migration und die Fehlerbehandlung.
- `src/lib/progress-transfer.mjs` / `.d.mts`: überprüfter Geräte-Export, abgesicherter Restore und WordPecker-Import mit Rehydrationsprüfung und bedingtem Rollback unter einer gemeinsamen Schreibsperre.
- `tests/progress-transfer.test.mjs`: prüft Backup aus verifiziertem Speicherstand, den Restore-Ablauf, erneutes Einlesen und Rollback, einschliesslich fünf neuer WordPecker-Geräteimport-Regressionen.

## Persistenz / Migration

- Zustand/AsyncStorage **bleibt** `progress-v2`; Schema `version: 1`.
- Die bisherige Version ohne Versionsangabe wird als Zustand-Version **0** gelesen. `migrateProgressData(existing, 0)` unterstützt sowohl flache v1-artige Legacy-Daten als auch kursbezogene Daten.
- Alle bisherigen XP-, Lektions-, Serien-, Tagesaktivitäts- und SRS-Werte werden übernommen. Neue Felder: `vocabularyLists: []`, `languagePreferences: { uiLanguage: "en", nativeLanguage: "en" }`. Dies sind initiale Einstellungen, keine Änderung der vorhandenen Kursinhalte.
- Für eine unbekannte Zukunftsversion oder inkonsistente Datensätze wird abgebrochen, statt eine leere Struktur über die alten Bytes zu schreiben. **Version-1-Datensätze müssen sämtliche Pflichtfelder enthalten**; nur alte Version-0-Daten erhalten Migrationsstandardwerte. Fehler müssen in einer UI separat angezeigt werden; **kein automatisches Reset**.
- `courseId` bleibt das bestehende Sprachpaar, z. B. `es-en`. `targetCode` und `nativeCode` im Wortlistenobjekt bezeichnen Lern- und Quellsprache; `uiLanguage` ist unabhängig davon. Kurmancî/Sorani müssen getrennte Sprachcodes/Inhalte bekommen.

## Reihenfolge von Lernfortschritts-Schreibvorgängen

Zustand schreibt nach Lernaktionen asynchron nach AsyncStorage. Zwei schnelle Aktionen können dabei sonst ausser Reihenfolge abgeschlossen werden: Ein später fertig werdender alter Snapshot kann die neueren XP, Lektionen und SRS-Werte auf dem Gerät überschreiben.

- `src/lib/store.ts` verwendet `createSerializedProgressStorage(AsyncStorage, progressWriteGuard)` für die bestehende `progress-v2`-Persistenz.
- Die Operationen `setItem` und `removeItem` werden **in ihrer Aufrufreihenfolge** nacheinander ausgeführt. `getItem` bleibt ein direkter Lesezugriff.
- Alle geplanten Schreibvorgänge werden sofort im `progressWriteGuard` registriert. Backup, Restore und Wortlistenimport warten, bis die Warteschlange vollständig abgeschlossen ist.
- Ein fehlgeschlagener Schreibvorgang blockiert die Warteschlange nicht dauerhaft. Die Fehlermeldung bleibt jedoch im Guard erhalten: Ein anschliessender Import/Restore darf die Persistenz nicht als zuverlässig behandeln, solange ein früherer Speicherfehler ungeklärt ist.
- Schutz gilt für die gemeinsame Zustand-Speicherschnittstelle **innerhalb dieses App-Prozesses**. Fremde direkte AsyncStorage-Schreiber und andere Prozesse sind nicht erfasst; AsyncStorage stellt keine atomare Transaktion bereit.

## Agent 02 — Vokabellisten / SRS

```ts
import { useProgress } from "@/lib/store";
import { vocabularyReviewKey } from "@/lib/progress-data.mjs";
import type { VocabularyList, VocabularyWord } from "@/lib/progress-data.mjs";

const list: VocabularyList = {
  id: "stable-list-id",
  title: "Travel",
  courseId: "es-en",
  targetCode: "es",
  nativeCode: "en",
  words: [],
};

useProgress.getState().addVocabularyList(list);
const word: VocabularyWord = { id: "stable-word-id", target: "hola", native: "hello" };
useProgress.getState().addVocabularyWord(list.id, word);

// Existing course progress; vocabulary keys cannot collide with pack word "hola".
useProgress.getState().reviewLearningItem(
  list.courseId, vocabularyReviewKey(list.id, word.id), true
);
```

- `id` muss stabil bleiben. Dieselbe Liste / dasselbe Wort noch einmal einzufügen ist idempotent; ein Konflikt mit gleichem `id` und anderem Inhalt wirft einen Fehler, statt Daten zu überschreiben.
- Gleicher Lernkern: `courses[courseId].wordStats[reviewKey]` und `.srs[reviewKey]` verwenden weiterhin `reviewWord()` aus `src/lib/srs.ts`. Der vorhandene SRS-Algorithmus wird **nicht** ersetzt.
- `dueReviewKeys(courseProgress, now)` liefert fällige SRS-Schlüssel aus dem gemeinsamen Kurszustand. Bestehende `dueSrsWords`-Logik bleibt erhalten. **Wortlisten müssen im Agent-02-UI noch in Wiederholungskarten aufgelöst werden**; die bisherige Practice-Ansicht rendert nur Wörter aus Kurs-Packs.
- Keine eigene Wortlisten-Datenbank / MongoDB / zweite Navigation aktivieren.

## Agent 03 — Konversation

- Bestätigte Vokabel-Lernergebnisse mit bekanntem `courseId` und stabilem Schlüssel über `useProgress.getState().reviewLearningItem(courseId, key, correct)` erfassen. Für ein aus dem Gespräch neu aufgenommenes Wort zunächst eine eigene Liste und einen Wortdatensatz wie oben erzeugen.
- Die Methode verändert SRS/Statistik, **vergibt keine XP** und markiert **keine Lektion** als abgeschlossen. Diese Vergabe darf Agent 03 nicht implizit erfinden.
- Sprachaufnahmen, Transkripte, Provider-Tokens und persönliche Gesprächsdaten sind **nicht Teil** dieses Persistenzschemas. Nutzereinwilligung und getrennten Datenlebenszyklus vor Implementierung klären.
- Gesprächssitzung/Provider/Audio sind **nicht** durch diesen PR implementiert.


## Übergang von Agent 02: vorhandene WordPecker-Wortlisten

Agent 02 verwendet vor der Integration den lokalen AsyncStorage-Schlüssel `red-poly:vocabulary-v1` mit Wortfeldern `value`, `translation`, `example`, `correct`, `wrong`, `review`. Diese Daten sind **nicht** bereits Bestandteil von `progress-v2` und dürfen bei der Zusammenführung nicht verloren gehen.

Agent 01 stellt zwei explizite Schnittstellen bereit:

- **Reine Vorprüfung / In-Memory-Merge:** `mergeWordPeckerVocabulary(progress, legacy)` und `useProgress.getState().importWordPeckerVocabulary(legacy)`; dies ist **kein** Nachweis einer erfolgreichen AsyncStorage-Persistierung.
- **Verifizierter, dauerhafter Speicherimport:** `importWordPeckerVocabularyToStorage(storage)` übernimmt Daten aus beiden lokalen Keys, erstellt eine Sicherheitskopie der ursprünglichen `progress-v2`-Bytes, prüft unmittelbar vor dem Schreiben nochmals die **exakten vorherigen Fortschrittsbytes**, schreibt den gemeinsamen Zustand, liest ihn erneut und bestätigt die Lernhistorie. Parallele Aufrufe dieses Imports werden abgewiesen.

```ts
import { importWordPeckerVocabularyFromDevice } from "@/lib/store";

// NUR nach ausdrücklicher Nutzeraktion, mit Fehleranzeige in der UI.
// Wartet auf getrackte Speicheroperationen, sperrt reguläre Store-Actions,
// vergleicht App-Snapshot mit gespeicherten Bytes, führt den Import
// überprüft aus, kontrolliert die Rehydration und versucht bei Fehlern
// eine verifizierte Rücknahme auf die ursprünglichen progress-v2-Bytes.
const result = await importWordPeckerVocabularyFromDevice();
// result: { listsAdded, wordsAdded }
```

**Hydrationsfehler / Rollback:** Falls der WordPecker-Import gespeichert wurde, aber die App den neuen Lernstand nicht korrekt laden kann, stellt die koordinierende Funktion die alten `progress-v2`-Bytes wieder her und prüft den alten Lernstand nach erneutem Laden. Dies geschieht **nur**, wenn `progress-v2` noch exakt dem soeben importierten Stand entspricht. Bei neueren fremden Änderungen erfolgt kein blindes Überschreiben; die unveränderte WordPecker-Quelle und das Original-Checkpoint bleiben als Rettungsweg vorhanden. Ein fehlgeschlagener Rollback wird ausdrücklich gemeldet.

**Fehler nach dem Speichern:** Auch die abschliessende Prüfung des Legacy-Schlüssels kann noch fehlschlagen (z. B. wenn eine separate WordPecker-Oberfläche ihn während des Imports verändert). Der Low-Level-Adapter nimmt in diesem Fall den gespeicherten Fortschritt **nur dann** zurück, wenn noch die exakten Bytes des gerade importierten Zustands vorhanden sind; neue externe XP/SRS-Änderungen werden nicht mit alten Daten überschrieben. Falls ein externer Fortschrittsstand erhalten bleiben muss, liest `importVerifiedWordPeckerVocabulary()` ihn vor dem Aufheben der App-Sperre neu in Zustand ein und verifiziert die Übereinstimmung. Scheitert diese Rettung, wird ein expliziter Fehler mit Aufforderung zum Neuladen des Lernstands ausgegeben. Beide Legacy-Keys und das Checkpoint bleiben unverändert bzw. verfügbar. Die verbleibende Lücke zwischen Prüfen und Schreiben kann ohne atomare Speichertransaktionen nicht vollständig beseitigt werden.

**Grenze:** Die App-Funktion sperrt **reguläre** `useProgress`-Aktionen, wartet auf bereits getrackte Store-Schreibvorgänge und lehnt fehlgeschlagene vorherige Speichervorgänge ab. Die Sperre deckt aber keine fremden direkten Aufrufe von `AsyncStorage.setItem`, externe Prozesse oder eigene `useProgress.setState`-Aufrufe ab. **AsyncStorage hat keine atomare Compare-and-Swap-Transaktion.** Die UI muss auch diese externen Schreibpfade pausieren, Fehler sichtbar anzeigen und erst nach der Abnahme den alten Zustand archivieren. Der bestehende Legacy-Key `red-poly:vocabulary-v1` bleibt unverändert.

- Die importierte Liste und jedes Wort erhalten ihre bisherigen stabilen IDs, Beispiele, Zeitstempel und Kategorie. Sprachcodes werden aus gültigen Kurs-IDs (z. B. `es-en`) abgeleitet.
- `wordStats` und `srs` landen kursbezogen im einzigen Zustand unter `vocabularyReviewKey(listId, wordId)`. Bereits vorhandene XP, Lektionen und SRS werden nicht verändert.
- Wiederholter Import ist idempotent. Zusätzliche neue Legacy-Wörter werden angehängt; bereits importierte IDs überschreiben niemals inzwischen neuere Reviews. Konflikte im Worttext oder Kurs werden **abgelehnt**.
- **Keine automatische Migration beim Start**, kein Löschen oder Überschreiben von `red-poly:vocabulary-v1`. Auch nach `setState` schreibt die Zustand-Persistenz asynchron: Die UI muss eine persistierte und verifizierte Übernahme sicherstellen, bevor der separate Speicher irgendwann entfernt wird.
- **Wichtig:** Nur diese Schnittstelle allein vereinheitlicht nicht die aktuelle Agent-02-UI. Vor dem Merge muss Agent 02 die Wortlistenoberfläche auf `useProgress` umstellen oder eine koordinierte Übernahme mit anschliessender Datenverifikation durchführen. Beide unabhängigen Schreibpfade gleichzeitig dauerhaft zu nutzen wäre ein Fehler.
- Agent 03 hat eine separate Speicherung für Gesprächstranskripte. Diese ist zulässig, solange keine zweite Quelle für XP/Statistik/SRS entsteht.

Tests: `tests/vocabulary-bridge.test.mjs` prüft Übernahme und Erhalt von Review-Historie, Konflikte, idempotentes Wiederholen, inkrementellen Import sowie einen **simulierten** Offline-Neustart mit AsyncStorage-kompatiblem In-Memory-Adapter. Ein echter React-Native-AsyncStorage-Gerätetest bleibt offen.

## Export / Restore

```ts
import {
  exportPersistedProgressBackup,
  restoreProgressBackup,
} from "@/lib/store";

// NUR nach expliziter Nutzeraktion und mit Fehlerbehandlung in der UI.
const backupJSON = await exportPersistedProgressBackup();
// UI zeigt Warnung: Restore ersetzt den aktuell gespeicherten Lernstand.
// Nach expliziter Bestätigung und ohne direkte externe AsyncStorage-Schreibende:
await restoreProgressBackup(backupJSON);
```

- **`exportPersistedProgressBackup()` bevorzugen:** Wartet auf ausstehende Zustand-Persistenzschreibvorgänge, sperrt reguläre Store-Aktionen vorübergehend, vergleicht Disk-Daten mit dem Arbeitsspeicher und exportiert nur die verifizierte Version. Fehlt ein persistierter Stand oder sind Daten unterschiedlich, wird der Export ohne schreibenden Eingriff abgebrochen.
- **`exportProgressBackup()` bleibt als synchrone Kompatibilitäts-API:** Sie exportiert nur den aktuellen Arbeitsspeicher und prüft nicht den gespeicherten Stand. Für die Export-UI ist deshalb die verifizierte asynchrone API vorgesehen.
- **`restoreProgressBackup(json)` ist ebenfalls durch denselben Schreibschutz abgesichert:** Validiert das Backup, wartet auf ausstehende Saves, prüft vorhandene Disk-/App-Snapshots vor dem Überschreiben und hydratisiert Zustand nach dem Schreiben neu. **Zusätzlich prüft `restoreProgressBackupToStorage` die originalen Speicherbytes nach der asynchronen Checkpoint-Erstellung erneut**, unmittelbar vor dem eigentlichen Schreiben. So wird ein neuerer XP-/SRS-Stand, der während der Sicherheitskopie gespeichert wurde, nicht mit dem Restore überschrieben. Scheitert die Rehydrierung oder die anschliessende Prüfung, darf der Rollback die alten Speicherbytes **nur dann** zurückschreiben, wenn der Speicher noch die **exakten Bytes des eben wiederhergestellten Backups** enthält. Andernfalls meldet er einen unvollständigen Rollback und bewahrt neuere fremde Änderungen und den ursprünglichen Checkpoint.
- Format `{ format: "red-poly-progress", version: 1, exportedAt, state }`; weder Export noch Restore starten automatisch beim App-Start. Für einen frischen Gerätestand ohne bereits vorhandene Daten wird ein gültiger Restore zugelassen.
- Das Checkpoint unter `progress-v2-restore-checkpoint` bleibt erhalten und wird bei erneutem Restore nicht überschrieben. Bei bisher leerem Speicher gibt es naturgemäss noch keine alten Bytes als Checkpoint.
- **Zusätzliche Speicherprüfung:** Schlägt bereits die finale Restore-Verifikation fehl, prüft auch `restoreProgressBackupToStorage` vor einem Rollback, ob inzwischen ein anderes plausibles Fortschrittsdokument gespeichert wurde. Dieses wird nicht blind überschrieben; ein unvollständiger Rollback bleibt als Fehler sichtbar. Zwei neue Regressionstests decken beide Fälle mit extern aktualisierten XP ab.
- **Einschränkung:** AsyncStorage bietet keine atomaren Compare-and-Swap-Transaktionen. Fremde direkte `AsyncStorage`- bzw. `useProgress.setState`-Schreibpfade müssen während der Übernahme zusätzlich pausiert bleiben. Bei Geräte- oder Rehydrierungsfehlern sind Sicherung und Rollback nach wie vor **Best-Effort**, nicht vollständig transaktional.
- Keine Cloud-Synchronisierung und keine externe Backup-Bibliothek. Es gibt **noch keine sichtbare Backup-/Restore-Benutzeroberfläche**.

## Rehydrierung und ausstehende Speicheroperationen

- Die Schreibsperre `createProgressWriteGuard()` wartet beim Erwerb weiterhin auf ältere Zustand-Saves. Neu kann sie mit `guard.drain()` **auch während einer bereits gehaltenen Sperre** auf später entstandene Speicheroperationen warten.
- Nach `rehydrate()` rufen **Restore und WordPecker-Geräteimport** diese Prüfung auf, bevor sie den neuen Zustand als erfolgreich verifiziert melden oder die ursprünglichen Bytes nach einem Fehler zurückladen.
- Ein fehlgeschlagener Persistenzvorgang führt nicht mehr dazu, dass die Sperre vor noch laufenden weiteren Schreibvorgängen freigegeben wird: Alle gemeldeten Operationen werden zuerst abgewartet und der Fehler danach weitergereicht. Die Sperre ersetzt weder AsyncStorage-Transaktionen noch erfasst sie externe direkte Schreiber.
- Die Regressionstests simulieren verzögerte, bei `rehydrate()` gestartete Writes mit älterem XP-Stand und kontrollieren, dass Restore und Migration **nicht voreilig Erfolg melden**.

## Tests und verbleibende Abnahme

```bash
npm run test:core
# äquivalent: node --test tests/progress-data.test.mjs tests/vocabulary-bridge.test.mjs tests/progress-write-guard.test.mjs tests/progress-transfer.test.mjs tests/progress-storage.test.mjs
```

Sechzig Testfälle prüfen u. a. v0-Legacy, Kurswechsel, XP-/SRS-Erhalt, Backup-Roundtrip, korrupte und unvollständige Version-1-Backups, Checkpoint bei wiederholtem Restore, Rollback bei Schreibfehler sowie Agent-02-Vokabelmigration, simulierten Offline-Neustart, Schreibsperre, verifizierten Backup-Export, Restore-Rehydrierung, späte Legacy-Änderungen nach dem Wortlisten-Commit, fremde XP-Speicherstände bei unvollständigem Rollback, Änderungen während der Checkpoint-Erstellung, vor dem Commit und erneute Ladung des vorherigen Lernstands nach einem fehlgeschlagenen Restore. Der GitHub-Actions-Workflow `RED POLY Core Data Regression` hat den Node-Test-Runner ausgeführt (**60 bestanden, 0 fehlgeschlagen**) und die Installation mit `bun install --frozen-lockfile` sowie `bunx tsc --noEmit` erfolgreich abgeschlossen ([CI-Lauf 43910225146](https://github.com/Redurbabat/RED-Poly/actions/runs/43910225146)). `tsconfig.json` schliesst die unintegrierten Quellbäume unter `integrations/` vom Expo-Root-Typecheck aus. **iOS, Android, Web und echter AsyncStorage-Gerätetest wurden hier nicht ausgeführt.**

Für die Integration folgen: Agent-02-UI für Wortlisten/SRS, Agent-03-Konversation, sichtbare UI zum Export/Restore mit Schreibsperre, Geräte-Abnahme inklusive echten AsyncStorage-Persistenztests und eine Migration mit sicherer Kopie realer `progress-v2`-Daten (ohne Nutzerdaten in Git). Root-TypeScript und die Core-CI laufen bereits grün; separate Integrationsprojekte prüfen sich weiterhin mit ihren eigenen Dependencies.

**Dateibesitz:** Agent 01 verantwortet `src/lib/store.ts`, `src/lib/progress-data.*` und diese Verträge. Andere Agenten verwenden die APIs und koordinieren inkompatible Erweiterungen über die Integrationsinstanz. PR #1 enthält die übergreifenden Architekturregeln, ist aber derzeit noch offen.
