# RED POLY — Core Data API (Agent 01)

**Stand:** 15.11.2026 · **Branch:** `agent/01-core-data` · **Status:** Datenkern implementiert; UI und echte Geräte nicht abgenommen.

## Geltungsbereich

Die vorhandene Expo-App und `src/lib/store.ts` bleiben die einzige Quelle für Lernfortschritt. **Kein zweiter Zustand-/AsyncStorage-Store** für WordPecker oder Mural. Bestehende `src/lib/types.ts`-Content-Packs, Kurs-IDs, Lektions-IDs, XP, Serien, Fehler und SRS-Schlüssel werden nicht umbenannt.

Implementierte Dateien:
- `src/lib/progress-data.mjs`: pure, offlinefähige Migration, Backups, Listen und SRS-Schlüssel.
- `src/lib/progress-data.d.mts`: TypeScript-Verträge, ohne zusätzliche Runtime-Abhängigkeiten.
- `src/lib/store.ts`: Aktionen für Wortlisten, gemeinsame Reviews und Spracheinstellungen; Upgrade bei bestehendem Persistenzschlüssel.
- `tests/progress-data.test.mjs`: isolierte Regressionen.

## Persistenz / Migration

- Zustand/AsyncStorage **bleibt** `progress-v2`; Schema `version: 1`.
- Die bisherige Version ohne Versionsangabe wird als Zustand-Version **0** gelesen. `migrateProgressData(existing, 0)` unterstützt sowohl flache v1-artige Legacy-Daten als auch kursbezogene Daten.
- Alle bisherigen XP-, Lektions-, Serien-, Tagesaktivitäts- und SRS-Werte werden übernommen. Neue Felder: `vocabularyLists: []`, `languagePreferences: { uiLanguage: "en", nativeLanguage: "en" }`. Dies sind initiale Einstellungen, keine Änderung der vorhandenen Kursinhalte.
- Für eine unbekannte Zukunftsversion oder inkonsistente Datensätze wird abgebrochen, statt eine leere Struktur über die alten Bytes zu schreiben. Fehler müssen in einer UI separat angezeigt werden; **kein automatisches Reset**.
- `courseId` bleibt das bestehende Sprachpaar, z. B. `es-en`. `targetCode` und `nativeCode` im Wortlistenobjekt bezeichnen Lern- und Quellsprache; `uiLanguage` ist unabhängig davon. Kurmancî/Sorani müssen getrennte Sprachcodes/Inhalte bekommen.

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

## Export / Restore

```ts
import { exportProgressBackup, restoreProgressBackup } from "@/lib/store";

const backupJSON = exportProgressBackup(); // nur Daten, keine Zustand-Actions
// Nach expliziter Nutzeraktion, bei pausierten Schreibvorgängen:
await restoreProgressBackup(backupJSON);
```

- Format `{ format: "red-poly-progress", version: 1, exportedAt, state }`; automatische Wiederherstellung beim Starten ist **nicht** vorgesehen.
- Der Restore prüft den Inhalt vor dem Schreiben, speichert ursprüngliche Bytes als `progress-v2-restore-checkpoint`, verifiziert diese und versucht bei Storage-Fehlern einen Rollback. Danach wird Zustand neu hydratisiert. Das Checkpoint bleibt bis zur bewussten Nutzerentscheidung erhalten.
- **Einschränkung:** AsyncStorage ist nicht transaktional. Schreibzugriffe während Restore müssen durch die künftige UI verhindert werden. Im Fall eines schwerwiegenden Geräte-/Speicherfehlers muss der Checkpoint gesondert zur manuellen Rettung zugänglich gemacht werden. Kein automatisches Überschreiben eines Checkpoints im Fehlerfall.
- Kein Cloud-Upload und keine externe Bibliothek erforderlich. Die App hat **noch keine sichtbare Backup-/Restore-Oberfläche**.

## Tests und verbleibende Abnahme

```bash
npm run test:core
# äquivalent: node --test tests/progress-data.test.mjs
```

Neun Testfälle prüfen u. a. v0-Legacy, Kurswechsel, Daten-/XP-/SRS-Erhalt, idempotente Migration, Backup-Roundtrip, fehlerhafte Backups, Checkpoint, Rücknahme bei Schreibfehler und Wiederholungsschlüssel. Bei der Erstellung wurden diese Testkörper mit dem GitHub-Quelltext in V8 ausgeführt (**9/9 bestanden**). **Node-Test-Runner, Expo-Typecheck, CI, iOS, Android, Web und echter AsyncStorage-Gerätetest wurden hier nicht ausgeführt.**

Für die Integration folgen: Agent-02-UI für Wortlisten/SRS, Agent-03-Konversation, UI zum Export/Restore mit Schreibsperre, vollständiger Typecheck mit Projektabhängigkeiten und Endgerät-Migrationstest gegen eine sichere Kopie realer `progress-v2`-Daten (ohne Nutzerdaten in Git).

**Dateibesitz:** Agent 01 verantwortet `src/lib/store.ts`, `src/lib/progress-data.*` und diese Verträge. Andere Agenten verwenden die APIs und koordinieren inkompatible Erweiterungen über die Integrationsinstanz. PR #1 enthält die übergreifenden Architekturregeln, ist aber derzeit noch offen.
