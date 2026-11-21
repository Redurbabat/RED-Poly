# RED POLY – Build-Ausgaben

Dieser Ordner wird durch den Build-Prozess erzeugt. **Nur diese README liegt auf GitHub**; Web-, Cloudflare-, Test- und App-Binaerdateien werden nicht eingecheckt.

    build/
    ├── visual-web-emission/      Web-Export (aus dist/)
    ├── visual-web-merged/        Worker + statische Assets
    │   ├── assets/
    │   ├── worker/index.ts
    │   └── wrangler.jsonc
    ├── cloudflare/
    │   ├── preview/
    │   └── deployments/
    ├── mobile/
    │   ├── ios/js-bundle/
    │   ├── ios/simulator/
    │   ├── ios/ipa/
    │   ├── android/js-bundle/
    │   └── android/apk/
    ├── desktop/
    │   ├── windows/
    │   └── macos/
    ├── qa/
    │   ├── browser/
    │   └── reports/
    └── metadata/build-layout.json

Die Plattform-Unterordner sind **reserviert**, keine fertigen IPA-, APK- oder EXE-Dateien.

Befehle aus dem Repository-Root:

    bun run build:structure
    bun run build:web:organized
    bun run test:build-structure

Den gestagten Worker pruefen:

    bunx wrangler@4 deploy --config build/visual-web-merged/wrangler.jsonc --dry-run

Weitere Details: docs/BUILD_ORDNUNG.md.
