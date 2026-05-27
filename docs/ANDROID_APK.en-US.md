# Android APK Build Guide

[中文](ANDROID_APK.zh-CN.md) | English

Updated: `2026-05-27`  
Version: `0.5.0+`

UNU currently ports to Android through `Capacitor + Android WebView`: the Vite-built game runtime is bundled into an APK. The first phase targets running the built-in sample game inside the APK. Desktop-only Electron editor features, such as local project file management, native file pickers, child windows, Web export, and Windows packaging, remain desktop-only for now.

## Current Support

| Capability | Android APK Status |
| --- | --- |
| PixiJS 2D rendering | Supported through WebView. |
| Built-in sample game | Supported, defaults to `Sample-project-list/sample-2D-shooting`. |
| Android editor mode | Initially supported through `npm run android:editor:apk`. |
| Project scripts | Supported, bundled with sample project resources. |
| Scenes, assets, Prefabs, item registry | Supported, copied to `public/android-game/` during build. |
| HTML Overlay UI | Basic runtime supported; complex iframe/input behavior needs device testing. |
| Desktop editor | Partially ported. Launcher, built-in project opening, asset loading, and scene/script saves to WebView local storage are supported. |
| Local file editing/import/export | Partially supported. Import uses Android file picker; export writes a real directory through Capacitor Filesystem into the app Documents area. |

## Requirements

- Node.js and npm.
- Android Studio or Android SDK.
- JDK `17` or `21`. This machine currently reports Java `25`, which causes Gradle to fail with `Unsupported class file major version 69`; switch to a supported JDK before building APKs.
- Android SDK Platform and Build Tools, preferably installed through Android Studio SDK Manager.

## Build Commands

```bash
npm install
npm run android:sync
npm run android:apk
npm run android:editor:apk
```

Command reference:

| Command | Purpose |
| --- | --- |
| `npm run android:prepare` | Copies `Sample-project-list/sample-2D-shooting` into `public/android-game/`. |
| `npm run android:build-web` | Builds Android game-runtime mode with `.env.android`. |
| `npm run android:add` | Creates the `android/` Capacitor native project for the first time. |
| `npm run android:sync` | Rebuilds Web assets and syncs them into the Android project. |
| `npm run android:open` | Syncs and opens the project in Android Studio. |
| `npm run android:apk` | Syncs and runs `gradlew assembleDebug`. |
| `npm run android:editor:apk` | Builds an Android editor-mode Debug APK. |

Default Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Android Web Export Directory

In Android editor mode, the Web export action now creates a real directory instead of a single JSON bundle. The directory is written through Capacitor `Documents`:

```text
UNUExports/<project-name>-web-YYYYMMDD-HHMMSS/
```

Directory contents include:

- `project.json`
- `scenes/`
- `assets/`
- `prefabs/`
- `export-report.json`
- `EXPORT_README.md`

Images/audio imported into Android local storage are restored from data URLs into real files. Because of Android sandboxing, the directory lives in the app Documents area; visibility depends on the device and file manager. If directory writing fails, the exporter falls back to downloading a single JSON bundle.

The Android export directory currently contains project resources and reports. To run it directly in a desktop browser with the complete Web Runtime, copy these resources into a desktop Web export runtime or re-export from the desktop editor.

## Switching JDK

If `npm run android:apk` fails with:

```text
Unsupported class file major version 69
```

the active Java version is too new. Install JDK 17 or 21 and set `JAVA_HOME`, for example:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
npm run android:apk
```

In Android Studio, you can also choose JDK 17/21 from `File > Settings > Build, Execution, Deployment > Build Tools > Gradle`.

## Asset Source

`Sample-project-list/` remains the single source of truth for samples. `public/android-game/` is generated during build, ignored by Git, and should not be maintained manually.

## Next Porting Steps

1. Add a mobile launcher for choosing built-in samples or imported mobile project packages.
2. Replace Electron filesystem APIs with Capacitor Filesystem / Android Storage Access Framework.
3. Optimize Scene View, UI clicks, virtual controls, and menus for touch screens.
4. Add Release signing, icons, splash screen, and automatic version synchronization.
5. Split large chunks and tune texture memory after real-device profiling.
