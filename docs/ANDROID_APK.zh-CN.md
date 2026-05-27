# Android APK 构建说明

[English](ANDROID_APK.en-US.md) | 中文

更新时间：`2026-05-27`  
适用版本：`0.5.0+`

UNU 当前的 Android 移植采用 `Capacitor + Android WebView` 方案：把 Vite 构建出的游戏运行包打进 APK。第一阶段目标是让 APK 运行内置示例游戏；Electron 桌面编辑器能力，例如本地工程文件管理、系统文件选择器、子窗口、Web 导出和 Windows 打包，仍保留在桌面端。

## 当前支持范围

| 能力 | Android APK 状态 |
| --- | --- |
| PixiJS 2D 渲染 | 支持，通过 WebView 运行。 |
| 内置示例游戏 | 支持，默认打包 `Sample-project-list/sample-2D-shooting`。 |
| Android 编辑器模式 | 初步支持，通过 `npm run android:editor:apk` 构建。 |
| 项目脚本 | 支持，随示例项目资源一起打包。 |
| 场景、资源、Prefab、物品注册表 | 支持，构建时复制到 `public/android-game/` 后进入 APK。 |
| HTML Overlay UI | 支持基础运行，复杂 iframe/输入行为需要真机验证。 |
| 桌面编辑器 | 部分移植，支持启动器、内置项目打开、资源读取、场景/脚本保存到 WebView 本地存储。 |
| 本地文件系统编辑、导入、导出 | 部分支持。导入走 Android 文件选择器；导出会通过 Capacitor Filesystem 写入应用文档目录下的真实目录。 |

## 环境要求

- Node.js 与 npm。
- Android Studio 或 Android SDK。
- JDK `17` 或 `21`。当前本机检测到的是 Java `25`，Gradle 报错 `Unsupported class file major version 69`，需要切换到受支持 JDK 后才能生成 APK。
- Android SDK Platform 与 Build Tools，建议通过 Android Studio SDK Manager 安装。

## 构建命令

```bash
npm install
npm run android:sync
npm run android:apk
npm run android:editor:apk
```

命令说明：

| 命令 | 作用 |
| --- | --- |
| `npm run android:prepare` | 将 `Sample-project-list/sample-2D-shooting` 复制到 `public/android-game/`。 |
| `npm run android:build-web` | 使用 `.env.android` 构建 Android 游戏运行模式。 |
| `npm run android:add` | 首次生成 `android/` Capacitor 原生工程。 |
| `npm run android:sync` | 重新构建 Web 资源并同步到 Android 工程。 |
| `npm run android:open` | 同步后用 Android Studio 打开工程。 |
| `npm run android:apk` | 同步后执行 `gradlew assembleDebug` 生成 Debug APK。 |
| `npm run android:editor:apk` | 构建 Android 编辑器模式 Debug APK。 |

Debug APK 默认输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Android 端 Web 游戏导出目录

Android 编辑器模式下点击“导出 Web 游戏”会创建真实目录，而不是单个 JSON 包。目录会写入 Capacitor 的 `Documents` 区域：

```text
UNUExports/<project-name>-web-YYYYMMDD-HHMMSS/
```

目录内容包括：

- `project.json`
- `scenes/`
- `assets/`
- `prefabs/`
- `export-report.json`
- `EXPORT_README.md`

已导入到 Android 本地存储中的图片/音频会从 data URL 还原为真实文件。受 Android 沙盒限制，该目录属于应用文档空间；不同设备和文件管理器的可见路径可能不同。若写目录失败，会退回下载单文件 JSON 包作为兜底。

当前 Android 导出的目录包含项目资源和报告。若需要桌面浏览器直接运行的完整 Web Runtime，可把该目录中的项目资源放入桌面端导出的 Web Runtime，或在桌面版重新导出。

## JDK 版本切换

如果执行 `npm run android:apk` 时出现：

```text
Unsupported class file major version 69
```

说明当前 Java 太新。请安装 JDK 17 或 21，并设置 `JAVA_HOME`，例如：

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
npm run android:apk
```

如果使用 Android Studio，也可以在 `File > Settings > Build, Execution, Deployment > Build Tools > Gradle` 中选择 JDK 17/21。

## 资源来源

`Sample-project-list/` 仍是示例项目唯一真源。`public/android-game/` 是构建时生成目录，已加入 `.gitignore`，不要手动维护。

## 后续移植路线

1. 增加移动端启动器，让用户选择内置示例或导入移动端项目包。
2. 用 Capacitor Filesystem / Android Storage Access Framework 替换 Electron 文件系统 API。
3. 为触摸屏优化 Scene View、UI 点击、虚拟摇杆和移动端菜单。
4. 支持 Release 签名、图标、启动屏和版本号自动同步。
5. 根据真机性能拆分大 chunk，优化首屏加载和纹理内存。
