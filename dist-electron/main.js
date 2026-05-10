import { app as P, ipcMain as h, dialog as S, shell as se, BrowserWindow as te, screen as we, nativeImage as xe } from "electron";
import * as u from "node:fs/promises";
import * as V from "node:fs";
import s from "node:path";
import { fileURLToPath as ye } from "node:url";
const ve = ye(import.meta.url), $ = s.dirname(ve);
let k = null, j = null, I = null;
const X = /* @__PURE__ */ new Map();
function w(r) {
  return r.split(s.sep).join("/");
}
function je(r) {
  const e = s.extname(r).toLowerCase();
  return r.endsWith(".anim.json") ? "animation" : r.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : r.endsWith(".scene.json") ? "scene" : r.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "script";
}
async function _(r) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/scripts/shared",
    "assets/scripts/scenes",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((t) => u.mkdir(s.join(r, t), { recursive: !0 })));
}
async function Y(r, e) {
  const t = s.join(r, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || s.basename(r),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await u.writeFile(t, JSON.stringify(i, null, 2), "utf-8"), i;
}
function Pe() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}

// You can also create directly editable scripts under:
// - assets/scripts/shared/
// - assets/scripts/scenes/<SceneName>/
// Files in those folders may export hooks directly:
// export default { onUpdate(ctx) {} }
`;
}
function Se() {
  return `export default {
  // 项目输入映射覆盖。键位字符串兼容 KeyboardEvent.code 与 MouseN（例如 Mouse0/Mouse2）。
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2']
  }
}
`;
}
function Ae() {
  return `export default {
  // 项目音频运行时覆盖。可按项目需要调默认音量，或在播放前重写请求。
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  }
}
`;
}
async function z(r) {
  const e = [
    { fileName: "ScriptRuntime.ts", content: Pe() },
    { fileName: "InputState.ts", content: Se() },
    { fileName: "AudioRuntime.ts", content: Ae() }
  ];
  let t = 0;
  for (const n of e) {
    const i = s.join(r, "assets", "scripts", n.fileName);
    await x(i) || (await u.mkdir(s.dirname(i), { recursive: !0 }), await u.writeFile(i, n.content, "utf-8"), t += 1);
  }
  return t;
}
function be(r) {
  return r.replace(/\.scene\.json$/i, "");
}
function ue(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
}
function Fe(r) {
  return `${ue(r) || "MainScene"}.scene.json`;
}
function ke(r) {
  const e = ue(r) || "MainScene", t = `scene_${e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "main"}`;
  return JSON.stringify(e === "SecondScene" ? {
    format: "unu-scene",
    version: 1,
    scene: {
      id: "scene_second",
      name: "SecondScene",
      entities: [
        {
          id: "background_second_001",
          name: "Background",
          components: [
            { type: "Transform", data: { type: "Transform", x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 0 } },
            { type: "Sprite", data: { type: "Sprite", texturePath: "assets/images/pixel/background/background-facility.png", width: 1539, height: 1022, visible: !0, alpha: 1, tint: 16777215, preserveAspect: !1 } },
            { type: "Background", data: { type: "Background", enabled: !0, followCamera: !0, fitMode: "cover" } },
            { type: "Camera", data: { type: "Camera", enabled: !1, zoom: 1, followEntityId: "", followSmoothing: 0.18, offsetX: 0, offsetY: 0, boundsEnabled: !1, minX: -2e3, maxX: 2e3, minY: -2e3, maxY: 2e3 } }
          ]
        },
        {
          id: "tilemap_002",
          name: "LevelTilemap",
          components: [
            { type: "Transform", data: { type: "Transform", x: -300, y: -120, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 1 } },
            {
              type: "Tilemap",
              data: {
                type: "Tilemap",
                enabled: !0,
                columns: 14,
                rows: 8,
                tileWidth: 48,
                tileHeight: 48,
                tiles: [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2,
                  2
                ],
                collision: [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1
                ],
                showGrid: !0,
                tileTextures: {
                  1: "assets/images/pixel/tilemap/texture_1.png",
                  2: "assets/images/pixel/tilemap/texture_2.png",
                  4: "assets/images/pixel/tilemap/texture_4.png"
                }
              }
            }
          ]
        },
        {
          id: "player_002",
          name: "Player",
          components: [
            { type: "Transform", data: { type: "Transform", x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 2 } },
            { type: "Sprite", data: { type: "Sprite", texturePath: "assets/images/pixel/player/idle/idle_01.png", width: 96, height: 96, visible: !0, alpha: 1, tint: 16777215, preserveAspect: !0 } },
            { type: "Collider", data: { type: "Collider", shape: "rect", width: 100, height: 50, offsetX: 0, offsetY: 20, isTrigger: !1 } },
            {
              type: "Animation",
              data: {
                type: "Animation",
                enabled: !0,
                playing: !0,
                fps: 10,
                loop: !0,
                currentFrame: 0,
                elapsed: 0,
                framePaths: [
                  "assets/images/pixel/player/idle/idle_01.png",
                  "assets/images/pixel/player/idle/idle_02.png",
                  "assets/images/pixel/player/idle/idle_03.png",
                  "assets/images/pixel/player/idle/idle_04.png"
                ],
                frameDurations: [1, 1, 1, 1],
                animationAssetPath: "",
                sourceAtlasPath: "",
                atlasGrid: null,
                frameEvents: [],
                transformTracks: { positionX: [], positionY: [], rotation: [] },
                stateMachine: {
                  enabled: !0,
                  initialState: "Idle",
                  currentState: "Idle",
                  clips: [
                    { name: "Idle", framePaths: ["assets/images/pixel/player/idle/idle_01.png", "assets/images/pixel/player/idle/idle_02.png", "assets/images/pixel/player/idle/idle_03.png", "assets/images/pixel/player/idle/idle_04.png"], frameDurations: [1, 1, 1, 1], loop: !0 },
                    { name: "Run", framePaths: ["assets/images/pixel/player/run/run_01.png", "assets/images/pixel/player/run/run_02.png", "assets/images/pixel/player/run/run_03.png", "assets/images/pixel/player/run/run_04.png", "assets/images/pixel/player/run/run_05.png", "assets/images/pixel/player/run/run_06.png"], frameDurations: [1, 1, 1, 1, 1, 1], loop: !0 },
                    { name: "Attack", framePaths: ["assets/images/pixel/player/forward/forward_01.png", "assets/images/pixel/player/forward/forward_02.png", "assets/images/pixel/player/forward/forward_03.png", "assets/images/pixel/player/forward/forward_04.png", "assets/images/pixel/player/forward/forward_05.png", "assets/images/pixel/player/forward/forward_06.png"], frameDurations: [1, 1, 1, 1, 1, 1], loop: !1 }
                  ],
                  transitions: [
                    { from: "Idle", to: "Run", condition: "ifMoving", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0, exitTime: !1 },
                    { from: "Run", to: "Idle", condition: "ifNotMoving", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0, exitTime: !1 },
                    { from: "Idle", to: "Attack", condition: "ifActionDown", action: "fire", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0, exitTime: !1 },
                    { from: "Run", to: "Attack", condition: "ifActionDown", action: "fire", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0, exitTime: !1 },
                    { from: "Attack", to: "Run", condition: "ifMoving", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0.6, exitTime: !0 },
                    { from: "Attack", to: "Idle", condition: "ifNotMoving", priority: 0, canInterrupt: !0, once: !1, minNormalizedTime: 0.6, exitTime: !0 }
                  ]
                }
              }
            },
            { type: "Script", data: { type: "Script", scriptPath: "assets/scripts/player-input.js", sourceCode: `{
  "moveSpeed": 140,
  "sprintSpeed": 280,
  "runAnimationMultiplierWhenSprint": 2,
  "shootAction": "fire",
  "fireCooldown": 0,
  "bullet": {
    "speed": 420,
    "life": 2,
    "maxDistance": 560,
    "width": 20,
    "height": 8,
    "tint": 15922687
  }
}`, enabled: !0, instance: null, initialized: !1, started: !1 } }
          ]
        },
        {
          id: "door_to_main_001",
          name: "DoorToMain",
          components: [
            { type: "Transform", data: { type: "Transform", x: -220, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 3 } },
            { type: "Sprite", data: { type: "Sprite", texturePath: "assets/images/pixel/props/door.png", width: 110, height: 180, visible: !0, alpha: 0.95, tint: 15201279, preserveAspect: !0 } },
            { type: "Collider", data: { type: "Collider", shape: "rect", width: 110, height: 180, offsetX: 0, offsetY: 0, isTrigger: !1 } },
            { type: "Interactable", data: { type: "Interactable", enabled: !0, interactDistance: 180, actionType: "switchScene", targetScene: "MainScene", textureCycle: [], tintCycle: [] } }
          ]
        },
        {
          id: "camera_second",
          name: "MainCamera",
          components: [
            { type: "Transform", data: { type: "Transform", x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 4 } },
            { type: "Camera", data: { type: "Camera", enabled: !0, zoom: 1, followEntityId: "player_002", followSmoothing: 1, offsetX: 0, offsetY: 0, boundsEnabled: !1, minX: -2e3, maxX: 2e3, minY: -2e3, maxY: 2e3 } }
          ]
        }
      ]
    }
  } : {
    format: "unu-scene",
    version: 1,
    scene: {
      id: t,
      name: e,
      entities: []
    }
  }, null, 2);
}
function Q(r, e) {
  if (!r || typeof r != "object") return;
  if (Array.isArray(r)) {
    for (const n of r) Q(n, e);
    return;
  }
  const t = r;
  if (t.actionType === "switchScene") {
    const n = String(t.targetScene || "").trim();
    n && e.add(n);
  }
  for (const n of Object.keys(t))
    Q(t[n], e);
}
async function Re(r, e) {
  const t = s.join(r, "scenes"), n = new Set(e.map((o) => o.toLowerCase())), i = /* @__PURE__ */ new Set();
  for (const o of e) {
    const c = s.join(t, o);
    try {
      const l = await u.readFile(c, "utf-8"), f = JSON.parse(l);
      Q(f, i);
    } catch {
    }
  }
  let a = 0;
  for (const o of i) {
    const c = Fe(o), l = c.toLowerCase();
    if (n.has(l)) continue;
    const f = s.join(t, c), m = ke(o);
    await u.writeFile(f, m, "utf-8"), n.add(l), a += 1;
  }
  return a;
}
async function ie(r) {
  const e = s.join(r, "scenes");
  return (await u.readdir(e, { withFileTypes: !0 }).catch(() => [])).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".scene.json")).map((n) => n.name).sort((n, i) => n.localeCompare(i));
}
async function L(r, e) {
  const t = s.join(r, "project.json");
  let n = await ie(r);
  const i = await Re(r, n);
  i > 0 && (n = await ie(r));
  const a = (e == null ? void 0 : e.trim()) || s.basename(r), o = (/* @__PURE__ */ new Date()).toISOString();
  let c = {};
  try {
    const y = await u.readFile(t, "utf-8"), D = JSON.parse(y);
    D && typeof D == "object" && (c = D);
  } catch {
    c = {};
  }
  const l = n.map((y) => ({
    file: y,
    name: be(y)
  })), f = Array.isArray(c.sceneCatalog) ? c.sceneCatalog.map((y) => String((y == null ? void 0 : y.file) || (y == null ? void 0 : y.fileName) || "")).filter(Boolean) : [], m = l.map((y) => y.file), p = f.length !== m.length || f.some((y, D) => y !== m[D]), d = String(c.startupScene || "").trim(), g = n.length ? n.includes(d) ? d : n[0] : "", F = d !== g, v = {
    ...c,
    format: "unu-project",
    version: 1,
    name: String(c.name || e || "").trim() || a,
    createdAt: String(c.createdAt || "").trim() || o,
    updatedAt: o,
    sceneCatalogVersion: 1,
    sceneCatalog: l,
    startupScene: g
  }, A = !c.format || !c.version || !Array.isArray(c.sceneCatalog) || p || F || String(c.name || "").trim() !== v.name || i > 0;
  return A && await u.writeFile(t, JSON.stringify(v, null, 2), "utf-8"), {
    repaired: A,
    sceneCount: n.length,
    startupScene: g,
    createdByReference: i
  };
}
async function x(r) {
  try {
    return await u.access(r), !0;
  } catch {
    return !1;
  }
}
async function b(r) {
  const e = String(r || "").trim();
  if (!e || e === "sample-project" || s.isAbsolute(e)) return e;
  const t = e.replace(/\\/g, "/").replace(/^\/+/, "");
  if (P.isPackaged && t.toLowerCase().startsWith("sample-project-list/")) {
    const i = [
      s.join(process.resourcesPath, t),
      s.join(P.getAppPath(), t)
    ], a = s.join(P.getPath("userData"), "bundled-samples", s.basename(t));
    if (!(await x(s.join(a, "project.json")) && await x(s.join(a, "scenes")) && await x(s.join(a, "assets")))) {
      const c = await Ee(i);
      c && (await u.mkdir(s.dirname(a), { recursive: !0 }), await u.rm(a, { recursive: !0, force: !0 }), await u.cp(c, a, { recursive: !0, force: !0 }));
    }
    if (await x(a)) return a;
  }
  const n = [
    s.join(P.getAppPath(), t),
    s.join(process.cwd(), t),
    s.resolve($, "..", t),
    s.resolve(t)
  ];
  for (const i of n)
    if (await x(i)) return i;
  return s.resolve(e);
}
async function Ee(r) {
  for (const e of r)
    if (await x(e)) return e;
  return "";
}
function Ce() {
  const r = /* @__PURE__ */ new Date(), e = (i) => String(i).padStart(2, "0"), t = `${r.getFullYear()}${e(r.getMonth() + 1)}${e(r.getDate())}`, n = `${e(r.getHours())}${e(r.getMinutes())}`;
  return `UNUProject_${t}_${n}`;
}
function O(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function B(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function E(r) {
  const e = String(r || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!e || s.isAbsolute(e)) return "";
  const t = e.split("/").filter(Boolean);
  return t.some((n) => n === "..") ? "" : t.join("/");
}
function R(r, e) {
  const t = s.resolve(r), n = E(e);
  if (!n) return "";
  const i = s.resolve(t, n), a = s.relative(t, i);
  return a.startsWith("..") || s.isAbsolute(a) ? "" : i;
}
function Z(r) {
  const e = r.toLowerCase(), n = [".anim.json", ".atlas.json", ".scene.json", ".prefab.json"].find((a) => e.endsWith(a));
  if (n) return { base: r.slice(0, -n.length), ext: r.slice(r.length - n.length) };
  const i = s.extname(r);
  return { base: i ? r.slice(0, -i.length) : r, ext: i };
}
async function G(r) {
  if (!await x(r)) return r;
  const e = s.dirname(r), t = Z(s.basename(r));
  for (let n = 1; n < 1e3; n += 1) {
    const i = s.join(e, `${t.base}-${n}${t.ext}`);
    if (!await x(i)) return i;
  }
  throw new Error("无法生成可用的默认文件名，请手动输入文件名。");
}
function J(r) {
  return `${String(r || "").trim().replace(/\.scene\.json$/i, "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "MainScene"}.scene.json`;
}
async function C(r, e) {
  await x(r) && (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.cp(r, e, { recursive: !0, force: !0 }));
}
async function _e(r, e) {
  try {
    await u.rename(r, e);
    return;
  } catch (t) {
    const n = t == null ? void 0 : t.code;
    if (n !== "EPERM" && n !== "EXDEV" && n !== "EACCES")
      throw t;
  }
  await u.cp(r, e, {
    recursive: !0,
    force: !1,
    errorOnExist: !0
  });
  try {
    await u.rm(r, {
      recursive: !0,
      force: !1,
      maxRetries: 6,
      retryDelay: 120
    });
  } catch (t) {
    const n = t instanceof Error ? t.message : String(t);
    throw new Error(`Project files are busy. Please close occupying programs and retry. (${n})`);
  }
}
async function fe(r, e) {
  return await x(r) ? (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.copyFile(r, e), !0) : !1;
}
function me() {
  return [
    s.resolve($, "..", "assets-for-sample"),
    s.resolve(process.cwd(), "assets-for-sample")
  ].find((e) => V.existsSync(e)) || "";
}
const pe = [
  { from: "background-img.png", to: "assets/images/pixel/background/background-img.png" },
  { from: "background-facility.png", to: "assets/images/pixel/background/background-facility.png" },
  { from: "door.png", to: "assets/images/pixel/props/door.png" },
  { from: "Enemy Animation/Tube Animation1.png", to: "assets/images/pixel/enemy/tube_01.png" },
  { from: "Enemy Animation/Tube Animation2.png", to: "assets/images/pixel/enemy/tube_02.png" },
  { from: "Enemy Animation/Tube Animation3.png", to: "assets/images/pixel/enemy/tube_03.png" },
  { from: "Enemy Animation/Tube Animation4.png", to: "assets/images/pixel/enemy/tube_04.png" },
  { from: "Player Animations/Idle Animation/Idle Astronaut Animation1.png", to: "assets/images/pixel/player/idle/idle_01.png" },
  { from: "Player Animations/Idle Animation/Idle Astronaut Animation2.png", to: "assets/images/pixel/player/idle/idle_02.png" },
  { from: "Player Animations/Idle Animation/Idle Astronaut Animation3.png", to: "assets/images/pixel/player/idle/idle_03.png" },
  { from: "Player Animations/Idle Animation/Idle Astronaut Animation4.png", to: "assets/images/pixel/player/idle/idle_04.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation1.png", to: "assets/images/pixel/player/run/run_01.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation2.png", to: "assets/images/pixel/player/run/run_02.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation3.png", to: "assets/images/pixel/player/run/run_03.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation4.png", to: "assets/images/pixel/player/run/run_04.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation5.png", to: "assets/images/pixel/player/run/run_05.png" },
  { from: "Player Animations/Side Animation/Side Astronaut Animation6.png", to: "assets/images/pixel/player/run/run_06.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation1.png", to: "assets/images/pixel/player/forward/forward_01.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation2.png", to: "assets/images/pixel/player/forward/forward_02.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation3.png", to: "assets/images/pixel/player/forward/forward_03.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation4.png", to: "assets/images/pixel/player/forward/forward_04.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation5.png", to: "assets/images/pixel/player/forward/forward_05.png" },
  { from: "Player Animations/Forward Animation/Forward Astronaut Animation6.png", to: "assets/images/pixel/player/forward/forward_06.png" },
  { from: "tilemap-sorted-by-value/texture-for-1.png", to: "assets/images/pixel/tilemap/texture_1.png" },
  { from: "tilemap-sorted-by-value/texture-for-2.png", to: "assets/images/pixel/tilemap/texture_2.png" },
  { from: "tilemap-sorted-by-value/texture-for-4.png", to: "assets/images/pixel/tilemap/texture_4.png" }
];
async function Ne(r) {
  const e = s.join(r, "assets", "scripts");
  await u.mkdir(e, { recursive: !0 });
  const t = {
    "player-input.js": `export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const speed = 140
    const move = ctx.api.input.getMoveVector(true)
    transform.x += move.x * speed * ctx.api.delta
    transform.y += move.y * speed * ctx.api.delta
    if (ctx.api.input.wasMousePressed(0)) {
      // 左键点击触发射击（由内置运行时生成子弹）
    }
  }
}
`,
    "bullet-projectile.js": `export default {
  onInit(ctx) {
    // 子弹从 player 位置发射，朝鼠标点击方向飞行
  },
  onUpdate(ctx) {
    // 子弹命中 Enemy 后，Enemy 被销毁并随机重生
  }
}
`,
    "orbit-around-chest.js": `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const dx = transform.x - chestTransform.x
    const dy = transform.y - chestTransform.y
    state.radius = Math.max(80, Math.hypot(dx, dy))
    state.angle = Math.atan2(dy, dx)
    state.angularSpeed = 1.1
  },
  onUpdate(ctx) {
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const state = ctx.api.getState(ctx.entity)
    const radius = Number(state.radius ?? 180)
    const angularSpeed = Number(state.angularSpeed ?? 1.1)
    const angle = Number(state.angle ?? 0) + angularSpeed * ctx.api.delta
    state.angle = angle
    transform.x = chestTransform.x + Math.cos(angle) * radius
    transform.y = chestTransform.y + Math.sin(angle) * radius
  }
}
`,
    "enemy-chase-respawn.js": `export default {
  onUpdate(ctx) {
    const player = ctx.api.findEntityByName('Player')
    if (!player) return
    // Enemy 持续追踪 Player
    // 与 Player 接触后删除自身，并在随机位置生成新的 Enemy
  }
}
`,
    "patrol.js": `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    state.dir = 1
    state.startX = ctx.entity.getTransform()?.x ?? 0
  },
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const state = ctx.api.getState(ctx.entity)
    const startX = Number(state.startX ?? transform.x)
    let dir = Number(state.dir ?? 1)
    transform.x += dir * 80 * ctx.api.delta
    if (transform.x > startX + 100) dir = -1
    if (transform.x < startX - 100) dir = 1
    state.dir = dir
  }
}
`,
    "spin.js": `export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    transform.rotation += 1.5 * ctx.api.delta
  }
}
`,
    "ScriptRuntime.ts": `const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const resolveEnemyMatcher = (cfg) => {
  const fromConfig = cfg && typeof cfg.enemyMatch === 'object' ? cfg.enemyMatch : null
  if (fromConfig) return fromConfig
  return {
    scriptPath: 'assets/scripts/enemy-chase-respawn.js',
    namePrefix: 'Enemy'
  }
}

export default {
  scripts: {
    'assets/scripts/player-input.js': {
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        const collider = ctx.entity.getComponent('Collider')
        if (!transform) return
        const cfg = parseConfig(ctx)
        const moveSpeed = Number(cfg.moveSpeed ?? 140)
        const sprintSpeed = Number(cfg.sprintSpeed ?? 280)
        const speed = ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed
        const move = ctx.api.input.getMoveVector(true)
        const state = ctx.api.getState(ctx.entity)
        if (!Number.isFinite(state.__baseScaleX)) {
          state.__baseScaleX = Math.max(0.001, Math.abs(transform.scaleX || 1))
        }
        if (move.x > 1e-4) {
          transform.scaleX = -Math.abs(state.__baseScaleX || 1)
        } else if (move.x < -1e-4) {
          transform.scaleX = Math.abs(state.__baseScaleX || 1)
        }

        if (move.x || move.y) {
          const nextX = transform.x + move.x * speed * ctx.api.delta
          const nextY = transform.y + move.y * speed * ctx.api.delta
          const halfWidth = Math.max(2, Number(collider?.width ?? 36) / 2)
          const halfHeight = Math.max(2, Number(collider?.height ?? 36) / 2)
          const offsetX = Number(collider?.offsetX ?? 0)
          const offsetY = Number(collider?.offsetY ?? 0)
          if (!ctx.api.isBlockedRect(nextX + offsetX, transform.y + offsetY, halfWidth, halfHeight)) transform.x = nextX
          if (!ctx.api.isBlockedRect(transform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) transform.y = nextY
        }

        if (!ctx.api.input.wasActionPressed(String(cfg.shootAction || 'fire'))) return
        const mouse = ctx.api.input.getMousePosition()
        ctx.api.spawnBullet(ctx.entity, {
          targetX: mouse.x,
          targetY: mouse.y,
          speed: Number(cfg.bullet?.speed ?? 420),
          life: Number(cfg.bullet?.life ?? 2),
          maxDistance: Number(cfg.bullet?.maxDistance ?? 560),
          width: Number(cfg.bullet?.width ?? 20),
          height: Number(cfg.bullet?.height ?? 8),
          tint: Number(cfg.bullet?.tint ?? 15922687)
        })
      }
    },
    'assets/scripts/bullet-projectile.js': {
      onInit(ctx) {
        const state = ctx.api.getState(ctx.entity)
        const cfg = parseConfig(ctx)
        const transform = ctx.entity.getTransform()
        const speed = Number(cfg.speed ?? 420)
        const angle = transform?.rotation ?? 0
        state.vx = Math.cos(angle) * speed
        state.vy = Math.sin(angle) * speed
        state.life = Number(cfg.life ?? 2)
        state.originX = transform?.x ?? 0
        state.originY = transform?.y ?? 0
        state.maxDistance = Number(cfg.maxDistance ?? 560)
      },
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        if (!transform) return
        const state = ctx.api.getState(ctx.entity)
        transform.x += Number(state.vx || 0) * ctx.api.delta
        transform.y += Number(state.vy || 0) * ctx.api.delta
        state.life = Number(state.life || 0) - ctx.api.delta

        const distance = Math.hypot(transform.x - Number(state.originX || 0), transform.y - Number(state.originY || 0))
        if (distance >= Number(state.maxDistance || 560) || Number(state.life || 0) <= 0) {
          ctx.api.removeEntity(ctx.entity)
          return
        }

        const hitEnemy = ctx.api.findEnemyOverlap(ctx.entity, resolveEnemyMatcher(cfg))
        if (!hitEnemy) return
        ctx.api.removeEntity(ctx.entity)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        const spawnedEnemy = ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
        if (spawnedEnemy) ctx.api.log('[' + spawnedEnemy.id + '] respawn')
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
      },
      onCollisionEnter(ctx) {
        const other = ctx.event?.other
        if (!other || other.name !== 'Player') return
        const cfg = parseConfig(ctx)
        ctx.api.removeEntity(ctx.entity)
        const playerTransform = other.getTransform()
        ctx.api.spawnEnemyLike(ctx.entity, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
      }
    }
  }
}
`,
    "InputState.ts": `export default {
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2']
  }
}
`,
    "AudioRuntime.ts": `export default {
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  }
}
`
  };
  await Promise.all(
    Object.entries(t).map(([n, i]) => u.writeFile(s.join(e, n), i, "utf-8"))
  );
}
async function Te(r) {
  const e = s.join(r, "assets", "images");
  await u.mkdir(e, { recursive: !0 });
  const t = q("player"), n = q("enemy"), i = q("chest");
  await Promise.all([
    u.writeFile(s.join(e, "player.png"), t),
    u.writeFile(s.join(e, "enemy.png"), n),
    u.writeFile(s.join(e, "chest.png"), i)
  ]);
}
async function $e(r) {
  const e = me();
  if (!e) return !1;
  let t = 0;
  for (const n of pe)
    await fe(s.join(e, n.from), s.join(r, n.to)) && (t += 1);
  return t > 0;
}
async function De(r) {
  const e = s.join(r, "assets", "animations");
  await u.mkdir(e, { recursive: !0 });
  const t = {
    format: "unu-animation",
    version: 1,
    animation: {
      name: "TorchFX",
      fps: 6,
      loop: !0,
      frames: [
        { texturePath: "assets/images/player.png", duration: 1 },
        { texturePath: "assets/images/enemy.png", duration: 1 },
        { texturePath: "assets/images/chest.png", duration: 2 }
      ]
    }
  }, n = {
    format: "unu-atlas",
    version: 1,
    atlas: {
      imagePath: "assets/images/player.png",
      columns: 1,
      rows: 1,
      cellWidth: 1,
      cellHeight: 1,
      frameCount: 1
    }
  };
  await Promise.all([
    u.writeFile(s.join(e, "TorchFX.anim.json"), JSON.stringify(t, null, 2), "utf-8"),
    u.writeFile(s.join(e, "TorchSheet.atlas.json"), JSON.stringify(n, null, 2), "utf-8")
  ]);
}
async function Me(r) {
  const e = s.join(r, "assets", "audio");
  await u.mkdir(e, { recursive: !0 }), await u.writeFile(s.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function Ie(r) {
  const e = await $e(r);
  await Promise.all([
    Ne(r),
    ...e ? [] : [Te(r)],
    De(r),
    Me(r)
  ]);
}
function W(r, e) {
  const t = String(r || "").trim();
  if (!t) return "";
  if (t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  let n = t.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  const i = w(s.resolve(e)), a = i.toLowerCase(), o = n.toLowerCase();
  o.startsWith(`${a}/`) && (n = n.slice(i.length + 1));
  const l = o.lastIndexOf("/assets/");
  return l >= 0 && (n = n.slice(l + 1)), n = n.replace(/^\/+/, ""), n.toLowerCase().startsWith("dist/assets/") && (n = n.slice(5)), n.toLowerCase().startsWith("dist-electron/assets/") && (n = n.slice(14)), n;
}
const re = /* @__PURE__ */ new Set([
  "texturePath",
  "animationAssetPath",
  "sourceAtlasPath",
  "scriptPath",
  "clipPath",
  "imagePath",
  "path",
  "relativePath"
]), ne = /* @__PURE__ */ new Set(["framePaths", "textureCycle"]);
function K(r) {
  const e = W(r, "");
  if (!e) return !1;
  const t = e.toLowerCase();
  return !(t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("builtin://") || t.startsWith("custom://") || t.startsWith("javascript:") || t.startsWith("mailto:") || t.startsWith("about:"));
}
function N(r) {
  return T(r).toLowerCase();
}
function ze(r) {
  const e = r.toLowerCase();
  return e.endsWith(".scene.json") ? "scene" : e.endsWith(".prefab.json") ? "prefab" : e.endsWith(".anim.json") ? "animation" : e.endsWith(".atlas.json") ? "atlas" : "json";
}
function Le(r, e, t, n, i) {
  let a = !1;
  const o = (l, f, m, p) => {
    const d = W(m, e);
    K(d) && t.push({ sourceFile: n, sourceKind: i, keyPath: p, ref: d }), d !== m && (l[f] = d, a = !0);
  }, c = (l, f = "$") => {
    if (!l || typeof l != "object") return;
    if (Array.isArray(l)) {
      l.forEach((p, d) => c(p, `${f}[${d}]`));
      return;
    }
    const m = l;
    for (const [p, d] of Object.entries(m)) {
      const g = `${f}.${p}`;
      if (typeof d == "string" && re.has(p)) {
        o(m, p, d, g);
        continue;
      }
      if (Array.isArray(d) && ne.has(p)) {
        const F = d.map((v) => {
          if (typeof v != "string") return v;
          const A = W(v, e);
          return K(A) && t.push({ sourceFile: n, sourceKind: i, keyPath: g, ref: A }), A !== v && (a = !0), A;
        });
        m[p] = F;
        continue;
      }
      if (d && typeof d == "object" && p === "tileTextureMap" && !Array.isArray(d)) {
        const F = d;
        for (const [v, A] of Object.entries(F)) {
          if (typeof A != "string") continue;
          const y = W(A, e);
          K(y) && t.push({ sourceFile: n, sourceKind: i, keyPath: `${g}.${v}`, ref: y }), y !== A && (F[v] = y, a = !0);
        }
      }
      c(d, g);
    }
  };
  return c(r), a;
}
function Oe(r, e) {
  let t = !1;
  const n = (a) => {
    const o = T(a);
    return e.get(N(o)) || a;
  }, i = (a) => {
    if (!a || typeof a != "object") return;
    if (Array.isArray(a)) {
      for (const c of a) i(c);
      return;
    }
    const o = a;
    for (const [c, l] of Object.entries(o)) {
      if (typeof l == "string" && re.has(c)) {
        const f = n(l);
        f !== l && (o[c] = f, t = !0);
        continue;
      }
      if (Array.isArray(l) && ne.has(c)) {
        const f = l.map((m) => {
          if (typeof m != "string") return m;
          const p = n(m);
          return p !== m && (t = !0), p;
        });
        o[c] = f;
        continue;
      }
      if (l && typeof l == "object" && c === "tileTextureMap" && !Array.isArray(l)) {
        const f = l;
        for (const [m, p] of Object.entries(f)) {
          if (typeof p != "string") continue;
          const d = n(p);
          d !== p && (f[m] = d, t = !0);
        }
      }
      i(l);
    }
  };
  return i(r), t;
}
async function de(r) {
  const e = [], t = ["scenes", "prefabs", "assets"], n = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const o of a) {
      const c = s.join(i, o.name);
      if (o.isDirectory()) {
        await n(c);
        continue;
      }
      if (!o.isFile() || !o.name.toLowerCase().endsWith(".json")) continue;
      const f = w(s.relative(r, c));
      f.toLowerCase() !== "project.json" && e.push({ fullPath: c, relativePath: f, kind: ze(o.name) });
    }
  };
  for (const i of t)
    await n(s.join(r, i));
  return e;
}
async function ae(r) {
  const e = await de(r), t = [];
  let n = 0, i = 0;
  for (const a of e) {
    const o = await u.readFile(a.fullPath, "utf-8").catch(() => "");
    if (!o) continue;
    let c = null;
    try {
      c = JSON.parse(String(o).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Le(c, r, t, a.relativePath, a.kind) && (n += 1, a.kind === "scene" && (i += 1), await u.writeFile(a.fullPath, JSON.stringify(c, null, 2), "utf-8"));
  }
  return { refs: t, normalizedFiles: n, normalizedSceneFiles: i, dependencyFiles: e };
}
async function We(r) {
  const e = /* @__PURE__ */ new Map(), t = s.join(r, "assets"), n = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const o of a) {
      const c = s.join(i, o.name);
      if (o.isDirectory()) {
        await n(c);
        continue;
      }
      if (!o.isFile()) continue;
      const l = w(s.relative(r, c)), f = s.basename(o.name).toLowerCase(), m = e.get(f) || [];
      m.push(l), e.set(f, m);
    }
  };
  return await n(t), { byBasename: e };
}
async function H(r, e) {
  const t = [], n = /* @__PURE__ */ new Map();
  for (const i of e) {
    const a = N(i.ref);
    if (!n.has(a)) {
      const o = await he(r, i.ref);
      n.set(a, !!o);
    }
    n.get(a) || t.push(i);
  }
  return t;
}
async function Ue(r, e, t) {
  if (!e.length) return { relinkedAssets: 0, relinkedFiles: 0 };
  const n = await We(r), i = /* @__PURE__ */ new Map(), a = Array.from(new Map(e.map((c) => [N(c.ref), c.ref])).values());
  for (const c of a) {
    const l = s.basename(c).toLowerCase(), f = (n.byBasename.get(l) || []).filter((m) => N(m) !== N(c));
    f.length === 1 && i.set(N(c), f[0]);
  }
  if (!i.size) return { relinkedAssets: 0, relinkedFiles: 0 };
  let o = 0;
  for (const c of t) {
    const l = await u.readFile(c.fullPath, "utf-8").catch(() => "");
    if (!l) continue;
    let f = null;
    try {
      f = JSON.parse(String(l).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Oe(f, i) && (o += 1, await u.writeFile(c.fullPath, JSON.stringify(f, null, 2), "utf-8"));
  }
  return { relinkedAssets: i.size, relinkedFiles: o };
}
function Xe(r, e, t, n) {
  const i = T(r), a = T(e), o = T(t);
  if (!i || !a || !o) return r;
  const c = i.toLowerCase(), l = a.toLowerCase();
  return c === l ? o : n && c.startsWith(`${l}/`) ? `${o}${i.slice(a.length)}` : r;
}
function Ye(r, e, t, n) {
  let i = !1;
  const a = (c) => {
    const l = Xe(c, e, t, n);
    return l !== c && (i = !0), l;
  }, o = (c) => {
    if (!c || typeof c != "object") return;
    if (Array.isArray(c)) {
      for (const f of c) o(f);
      return;
    }
    const l = c;
    for (const [f, m] of Object.entries(l)) {
      if (typeof m == "string" && re.has(f)) {
        l[f] = a(m);
        continue;
      }
      if (Array.isArray(m) && ne.has(f)) {
        l[f] = m.map((p) => typeof p == "string" ? a(p) : p);
        continue;
      }
      if (m && typeof m == "object" && f === "tileTextureMap" && !Array.isArray(m)) {
        const p = m;
        for (const [d, g] of Object.entries(p))
          typeof g == "string" && (p[d] = a(g));
      }
      o(m);
    }
  };
  return o(r), i;
}
async function oe(r, e, t, n) {
  const i = T(e), a = T(t);
  if (!i || !a || i === a) return { relinkedFiles: 0 };
  const o = await de(r);
  let c = 0;
  for (const l of o) {
    const f = await u.readFile(l.fullPath, "utf-8").catch(() => "");
    if (!f) continue;
    let m = null;
    try {
      m = JSON.parse(String(f).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Ye(m, i, a, n) && (c += 1, await u.writeFile(l.fullPath, JSON.stringify(m, null, 2), "utf-8"));
  }
  return { relinkedFiles: c };
}
async function Be(r, e) {
  if (!e.length) return 0;
  const t = me();
  if (!t) return 0;
  const n = new Map(pe.map((a) => [a.to.toLowerCase(), a.from]));
  let i = 0;
  for (const a of e) {
    const o = n.get(a.toLowerCase());
    if (!o) continue;
    await fe(s.join(t, o), s.join(r, a)) && (i += 1);
  }
  return i;
}
async function M(r) {
  let e = await ae(r);
  const t = await H(r, e.refs), n = Array.from(new Set(t.map((m) => m.ref))), i = await Be(r, n), a = i > 0 ? await H(r, e.refs) : t, o = await Ue(r, a, e.dependencyFiles);
  if (i > 0 || o.relinkedAssets > 0) {
    const m = await ae(r);
    e = {
      ...m,
      normalizedFiles: e.normalizedFiles + m.normalizedFiles,
      normalizedSceneFiles: e.normalizedSceneFiles + m.normalizedSceneFiles
    };
  }
  const c = await H(r, e.refs), l = new Set(e.refs.map((m) => N(m.ref))).size, f = new Set(c.map((m) => N(m.ref))).size;
  return {
    repaired: e.normalizedFiles > 0 || i > 0 || o.relinkedAssets > 0,
    normalizedSceneFiles: e.normalizedSceneFiles,
    normalizedFiles: e.normalizedFiles,
    copiedAssets: i,
    relinkedAssets: o.relinkedAssets,
    relinkedFiles: o.relinkedFiles,
    checkedAssetRefs: l,
    resolvedAssets: Math.max(0, l - f),
    unresolvedAssets: f,
    unresolvedRefs: c.slice(0, 100)
  };
}
function q(r) {
  const t = r === "player" ? { bg: "#0E2A47", accent: "#56CCF2", stroke: "#BDEBFF", symbol: "P" } : r === "enemy" ? { bg: "#3A1518", accent: "#EB5757", stroke: "#FFC4C4", symbol: "E" } : { bg: "#3A2A11", accent: "#F2C94C", stroke: "#FFE8A3", symbol: "C" }, n = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg}" />
      <stop offset="100%" stop-color="${t.accent}" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="22" fill="url(#g)" stroke="${t.stroke}" stroke-width="4"/>
  <circle cx="${128 / 2}" cy="${128 / 2}" r="26" fill="rgba(0,0,0,0.25)" />
  <text x="${128 / 2}" y="${128 / 2 + 15}" text-anchor="middle" fill="#ffffff" font-size="54" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${t.symbol}</text>
</svg>`;
  return xe.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(n)}`).toPNG();
}
async function ee(r, e) {
  const i = (await u.readdir(r, { withFileTypes: !0 })).filter((a) => a.name !== ".unu-trash").sort((a, o) => Number(o.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(o.name));
  return Promise.all(
    i.map(async (a) => {
      const o = s.join(r, a.name), c = w(s.relative(e, o)) || ".", l = a.isDirectory(), f = {
        id: c,
        name: a.name,
        type: l ? "folder" : je(a.name),
        path: c,
        absolutePath: o,
        children: []
      };
      return l && (f.children = await ee(o, e)), f;
    })
  );
}
async function Ge(r, e) {
  const t = s.join(r, ".unu-trash"), n = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, i = s.join(t, n);
  await u.mkdir(i, { recursive: !0 });
  const a = s.join(i, s.basename(e));
  return await u.rename(e, a), a;
}
async function Je(r) {
  const e = s.extname(r).toLowerCase(), t = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", n = await u.readFile(r);
  return `data:${t};base64,${n.toString("base64")}`;
}
function T(r) {
  return String(r || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}
async function he(r, e) {
  const t = T(e);
  if (!t) return null;
  const n = P.getAppPath(), i = t.startsWith("assets/") ? t.slice(7) : t, a = [
    s.join(r, t),
    s.join(r, "assets", i),
    s.join(n, t),
    s.join(n, "assets", i),
    s.join(n, "dist", t),
    s.join(n, "dist", "assets", i),
    s.join(n, "dist-electron", t),
    s.join(n, "dist-electron", "assets", i),
    s.join($, t),
    s.join($, "assets", i)
  ];
  for (const o of a) {
    const c = await u.stat(o).catch(() => null);
    if (c != null && c.isFile()) return o;
  }
  return null;
}
async function ce(r, e, t) {
  await _(r);
  const n = s.join(r, t);
  await u.mkdir(n, { recursive: !0 });
  const i = [];
  for (const a of e) {
    const o = s.basename(a), c = s.join(n, o);
    await u.copyFile(a, c), i.push({
      fileName: o,
      relativePath: w(s.relative(r, c))
    });
  }
  return i;
}
async function Ke(r) {
  let e = r.filePath;
  if (!e) {
    const t = s.join(r.projectRoot || P.getPath("documents"), r.subdir || "", r.suggestedName || "Asset.json"), n = await S.showSaveDialog({
      title: r.title || "保存文本资源",
      defaultPath: t,
      filters: [{ name: r.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (n.canceled || !n.filePath) return null;
    e = n.filePath;
  }
  return await u.mkdir(s.dirname(e), { recursive: !0 }), await u.writeFile(e, r.content, "utf-8"), {
    filePath: e,
    name: s.basename(e),
    relativePath: r.projectRoot ? w(s.relative(r.projectRoot, e)) : void 0
  };
}
async function He(r) {
  var i;
  const e = await S.showOpenDialog({
    title: r.title || "打开文本资源",
    defaultPath: r.projectRoot ? s.join(r.projectRoot, r.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (i = r.extensions) != null && i.length ? r.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const t = e.filePaths[0], n = await u.readFile(t, "utf-8");
  return {
    filePath: t,
    name: s.basename(t),
    relativePath: r.projectRoot ? w(s.relative(r.projectRoot, t)) : void 0,
    content: n
  };
}
function U(r) {
  const e = X.get(r);
  e && (e.timer && clearTimeout(e.timer), e.watcher.close(), X.delete(r));
}
function qe(r) {
  const e = w(String(r || "")).toLowerCase();
  return e.endsWith(".ts") || e.endsWith(".js") || e.endsWith(".mjs") || e.endsWith(".json");
}
async function Ve(r, e) {
  U(r.id);
  const t = await b(e);
  if (!t || t === "sample-project") return { ok: !1, error: "sample-project cannot be watched" };
  const n = s.join(t, "assets", "scripts");
  await u.mkdir(n, { recursive: !0 });
  const i = (o, c) => {
    if (!c || !qe(String(c))) return;
    const l = X.get(r.id);
    if (!l) return;
    l.timer && clearTimeout(l.timer);
    const f = w(String(c));
    l.timer = setTimeout(() => {
      if (r.isDestroyed()) {
        U(r.id);
        return;
      }
      r.send("unu:project-script-changed", {
        projectRoot: l.projectRoot,
        relativePath: w(s.join("assets", "scripts", f)),
        changedAt: Date.now()
      });
    }, 120);
  };
  let a;
  try {
    a = V.watch(n, { recursive: !0 }, i);
  } catch {
    a = V.watch(n, i);
  }
  return X.set(r.id, { watcher: a, timer: null, projectRoot: t }), r.once("destroyed", () => U(r.id)), { ok: !0 };
}
function le() {
  const r = new te({
    width: 1120,
    height: 700,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111318",
    webPreferences: {
      preload: s.join($, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  ge(r, "launcher"), P.isPackaged ? r.loadFile(s.join(P.getAppPath(), "dist", "index.html")) : (r.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && r.webContents.openDevTools({ mode: "detach" })), k = r, r.on("closed", () => {
    k === r && (k = null);
  });
}
function ge(r, e) {
  if (!r || r.isDestroyed()) return;
  const t = we.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const a = Math.min(1680, Math.max(1200, t.width - 120)), o = Math.min(980, Math.max(760, t.height - 100));
    r.setSize(a, o, !0), r.center();
    return;
  }
  const n = Math.min(1180, Math.max(980, t.width - 220)), i = Math.min(760, Math.max(640, t.height - 180));
  r.setSize(n, i, !0), r.center();
}
function Qe(r) {
  P.isPackaged ? r.loadFile(s.join(P.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : r.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function Ze(r) {
  return I = r || null, k ? (!j || j.isDestroyed() ? (j = new te({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: k,
    webPreferences: {
      preload: s.join($, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), Qe(j), j.on("closed", () => {
    j = null;
  })) : (j.isMinimized() && j.restore(), j.focus()), j.webContents.once("did-finish-load", () => {
    !j || j.isDestroyed() || j.webContents.send("unu:tilemap-editor-init", I);
  }), j.webContents.isLoadingMainFrame() ? { ok: !0 } : (j.webContents.send("unu:tilemap-editor-init", I), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
function et(r) {
  const e = /* @__PURE__ */ new Date(), t = (i) => String(i).padStart(2, "0"), n = [
    e.getFullYear(),
    t(e.getMonth() + 1),
    t(e.getDate()),
    "-",
    t(e.getHours()),
    t(e.getMinutes()),
    t(e.getSeconds())
  ].join("");
  return `${O(r) || "UNUGame"}-web-${n}`;
}
async function tt() {
  const r = P.isPackaged ? [
    s.join(process.resourcesPath, "dist"),
    s.join(process.resourcesPath, "app.asar.unpacked", "dist"),
    s.join(process.cwd(), "dist")
  ] : [
    s.join(process.cwd(), "dist"),
    s.resolve($, "..", "dist"),
    s.join($, "dist"),
    s.join(P.getAppPath(), "dist")
  ];
  for (const e of r)
    if (!e.includes(".asar") && await x(s.join(e, "index.html")))
      return e;
  throw new Error(
    P.isPackaged ? "未找到可复制的 Web 构建目录 resources/dist，请重新打包应用后再导出。" : "未找到 Web 构建目录 dist，请先执行 npm run build。"
  );
}
async function rt(r) {
  if (!await x(r)) return 0;
  let e = 0;
  const t = async (n) => {
    const i = await u.readdir(n, { withFileTypes: !0 }).catch(() => []);
    for (const a of i) {
      const o = s.join(n, a.name);
      a.isDirectory() ? await t(o) : a.isFile() && (e += 1);
    }
  };
  return await t(r), e;
}
async function nt(r, e) {
  let t = await u.readFile(r, "utf-8");
  t = t.replace(/(src|href)="\/assets\//g, '$1="./assets/').replace(/<title>.*?<\/title>/i, `<title>${it(e || "UNU Game")}</title>`), t.includes("__UNU_GAME_EXPORT__") || (t = t.replace(
    /<head([^>]*)>/i,
    `<head$1>
    <script>window.__UNU_GAME_EXPORT__ = true;<\/script>`
  )), await u.writeFile(r, t, "utf-8");
}
async function st(r, e) {
  const t = [
    "@echo off",
    "setlocal",
    'cd /d "%~dp0"',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PLAY_GAME.ps1"',
    "if errorlevel 1 pause",
    ""
  ].join(`\r
`), n = String.raw`$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-PortAvailable([int]$port) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

function Get-MimeType([string]$filePath) {
  switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".mjs" { return "text/javascript; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".webp" { return "image/webp" }
    ".gif" { return "image/gif" }
    ".svg" { return "image/svg+xml" }
    ".mp3" { return "audio/mpeg" }
    ".wav" { return "audio/wav" }
    ".ogg" { return "audio/ogg" }
    default { return "application/octet-stream" }
  }
}

$port = 4173
while (-not (Test-PortAvailable $port)) {
  $port += 1
}

$server = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$port/"
$server.Prefixes.Add($prefix)
$server.Start()
Write-Host "UNU exported game is running at $prefix"
Write-Host "Press Ctrl+C to stop the local server."
Start-Process $prefix

try {
  while ($server.IsListening) {
    $context = $server.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }
    $requestPath = $requestPath -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $targetPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $requestPath))
    $rootFullPath = [System.IO.Path]::GetFullPath($root)

    if (-not $targetPath.StartsWith($rootFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not [System.IO.File]::Exists($targetPath)) {
      $targetPath = [System.IO.Path]::Combine($root, "index.html")
    }

    if ([System.IO.File]::Exists($targetPath)) {
      $bytes = [System.IO.File]::ReadAllBytes($targetPath)
      $context.Response.ContentType = Get-MimeType $targetPath
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
    $context.Response.OutputStream.Close()
  }
} finally {
  if ($server.IsListening) {
    $server.Stop()
  }
  $server.Close()
}
`, i = [
    `# ${e || "UNU Game"} Web Export`,
    "",
    "Do not open index.html directly with file://. Modern browsers block ES module scripts and CSS under file:// origins.",
    "",
    "Windows:",
    "1. Double-click PLAY_GAME.bat.",
    "2. The script starts a local HTTP server and opens the game in your default browser.",
    "3. Close the PowerShell window or press Ctrl+C to stop the server.",
    "",
    "If you already have a web server, serve this folder as static files and open index.html through http:// or https://.",
    ""
  ].join(`
`);
  await u.writeFile(s.join(r, "PLAY_GAME.bat"), t, "utf-8"), await u.writeFile(s.join(r, "PLAY_GAME.ps1"), n, "utf-8"), await u.writeFile(s.join(r, "EXPORT_README.md"), i, "utf-8");
}
function it(r) {
  return String(r).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
process.on("unhandledRejection", (r) => {
  console.error("[UNU][main] Unhandled promise rejection:", r);
});
process.on("uncaughtException", (r) => {
  console.error("[UNU][main] Uncaught exception:", r);
});
P.whenReady().then(() => {
  h.handle("unu:create-project", async () => {
    const r = await S.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (r.canceled || r.filePaths.length === 0) return null;
    const e = r.filePaths[0];
    return await _(e), await Y(e), {
      rootPath: e,
      name: s.basename(e),
      created: !0
    };
  }), h.handle("unu:create-project-v2", async (r, e) => {
    let t = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!t) {
      const c = await S.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (c.canceled || c.filePaths.length === 0) return null;
      t = c.filePaths[0];
    }
    const n = await u.stat(t).catch(() => null);
    if (!(n != null && n.isDirectory()))
      throw new Error("无效的项目目录");
    const i = O(e == null ? void 0 : e.projectName) || Ce(), a = s.join(t, i);
    if (await x(a))
      throw new Error(`目标目录已存在: ${a}`);
    await _(a), await Y(a, i), await z(a);
    const o = await M(a);
    return {
      rootPath: a,
      name: i,
      parentDir: t,
      created: !0,
      integrity: o
    };
  }), h.handle("unu:pick-directory", async (r, e) => {
    const t = await S.showOpenDialog({
      title: (e == null ? void 0 : e.title) || "选择目标目录",
      defaultPath: e == null ? void 0 : e.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const n = t.filePaths[0];
    return {
      dirPath: n,
      name: s.basename(n)
    };
  }), h.handle("unu:pick-project-folder", async () => {
    const r = await S.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (r.canceled || r.filePaths.length === 0) return null;
    const e = r.filePaths[0];
    return await _(e), {
      rootPath: e,
      name: s.basename(e)
    };
  }), h.handle("unu:save-project-as", async (r, e) => {
    const t = await S.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const n = t.filePaths[0], i = s.resolve(n), a = e.sourceProjectRoot ? s.resolve(e.sourceProjectRoot) : "";
    if (a && a !== "sample-project" && a === i)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await _(n);
    const o = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !o && a && await x(a) ? (await C(s.join(a, "assets"), s.join(n, "assets")), await C(s.join(a, "scenes"), s.join(n, "scenes")), await C(s.join(a, "prefabs"), s.join(n, "prefabs")), await C(s.join(a, "project.json"), s.join(n, "project.json"))) : await Ie(n), await Y(n, e.projectName), await z(n);
    let c;
    const l = Array.isArray(e.sceneFiles) ? e.sceneFiles : [];
    if (l.length > 0) {
      const m = /* @__PURE__ */ new Set();
      for (const p of l) {
        const d = J(p.fileName);
        let g = d, F = 2;
        for (; m.has(g.toLowerCase()); )
          g = d.replace(/\.scene\.json$/i, `_${F}.scene.json`), F += 1;
        m.add(g.toLowerCase());
        const v = s.join(n, "scenes", g);
        await u.mkdir(s.dirname(v), { recursive: !0 }), await u.writeFile(v, String(p.content || ""), "utf-8"), c || (c = v);
        const A = J(e.currentSceneName);
        g.toLowerCase() === A.toLowerCase() && (c = v);
      }
    } else if (e.currentSceneContent) {
      const m = J(e.currentSceneName);
      c = s.join(n, "scenes", m), await u.mkdir(s.dirname(c), { recursive: !0 }), await u.writeFile(c, e.currentSceneContent, "utf-8");
    }
    await L(n, e.projectName);
    const f = await M(n);
    return {
      rootPath: n,
      name: s.basename(n),
      sceneFilePath: c,
      fromSample: o,
      integrity: f
    };
  }), h.handle("unu:export-game", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project" || !await x(t))
      throw new Error("请先打开一个本地项目，再导出游戏。");
    await _(t), await z(t);
    const n = O(e == null ? void 0 : e.projectName) || s.basename(t), i = await L(t, n), a = await M(t), o = await S.showOpenDialog({
      title: "导出 Web 游戏到目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (o.canceled || o.filePaths.length === 0) return null;
    const c = await tt(), l = s.join(o.filePaths[0], et(n));
    await u.mkdir(l, { recursive: !0 }), await u.cp(c, l, { recursive: !0, force: !0 }), await C(s.join(t, "project.json"), s.join(l, "project.json")), await C(s.join(t, "assets"), s.join(l, "assets")), await C(s.join(t, "scenes"), s.join(l, "scenes")), await C(s.join(t, "prefabs"), s.join(l, "prefabs"));
    const f = s.join(l, "index.html");
    await nt(f, n), await st(l, n);
    const m = await rt(s.join(l, "assets")), p = {
      format: "unu-web-export",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      projectName: n,
      projectRoot: t,
      outputDir: l,
      indexPath: f,
      launchScript: s.join(l, "PLAY_GAME.bat"),
      sceneCount: i.sceneCount,
      startupScene: i.startupScene,
      assetCount: m,
      assetIntegrityRepaired: a.repaired,
      normalizedSceneFiles: a.normalizedSceneFiles,
      normalizedFiles: a.normalizedFiles,
      copiedAssets: a.copiedAssets,
      relinkedAssets: a.relinkedAssets,
      relinkedFiles: a.relinkedFiles,
      checkedAssetRefs: a.checkedAssetRefs,
      resolvedAssets: a.resolvedAssets,
      unresolvedAssets: a.unresolvedAssets,
      unresolvedRefs: a.unresolvedRefs
    };
    return await u.writeFile(s.join(l, "export-report.json"), JSON.stringify(p, null, 2), "utf-8"), {
      ok: !0,
      outputDir: l,
      indexPath: f,
      sceneCount: i.sceneCount,
      assetCount: m
    };
  }), h.handle("unu:scan-project", async (r, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    const t = await b(e);
    await _(t), await z(t);
    const n = s.basename(t), i = await L(t, n), a = await M(t), o = await ee(t, t);
    return {
      rootPath: t,
      name: n,
      tree: o,
      sceneCatalogRepaired: i.repaired,
      sceneCount: i.sceneCount,
      sceneCreatedByReference: i.createdByReference,
      assetIntegrityRepaired: a.repaired,
      normalizedSceneFiles: a.normalizedSceneFiles,
      normalizedFiles: a.normalizedFiles,
      copiedAssets: a.copiedAssets,
      relinkedAssets: a.relinkedAssets,
      relinkedFiles: a.relinkedFiles,
      checkedAssetRefs: a.checkedAssetRefs,
      resolvedAssets: a.resolvedAssets,
      unresolvedAssets: a.unresolvedAssets,
      unresolvedRefs: a.unresolvedRefs
    };
  }), h.handle("unu:check-asset-integrity", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再检查资源依赖。");
    await _(t);
    const n = await M(t), i = await ee(t, t);
    return {
      rootPath: t,
      name: s.basename(t),
      tree: i,
      assetIntegrityRepaired: n.repaired,
      normalizedSceneFiles: n.normalizedSceneFiles,
      normalizedFiles: n.normalizedFiles,
      copiedAssets: n.copiedAssets,
      relinkedAssets: n.relinkedAssets,
      relinkedFiles: n.relinkedFiles,
      checkedAssetRefs: n.checkedAssetRefs,
      resolvedAssets: n.resolvedAssets,
      unresolvedAssets: n.unresolvedAssets,
      unresolvedRefs: n.unresolvedRefs
    };
  }), h.handle("unu:watch-project-scripts", async (r, e) => Ve(r.sender, String((e == null ? void 0 : e.projectRoot) || "").trim())), h.handle("unu:unwatch-project-scripts", async (r) => (U(r.sender.id), { ok: !0 })), h.handle("unu:save-scene", async (r, e) => {
    let t = e.filePath;
    if (!t) {
      const n = s.join(e.projectRoot || P.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), i = await S.showSaveDialog({
        title: "保存场景",
        defaultPath: n,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await u.mkdir(s.dirname(t), { recursive: !0 }), await u.writeFile(t, e.content, "utf-8"), e.projectRoot && await L(e.projectRoot, s.basename(e.projectRoot)), {
      filePath: t,
      name: s.basename(t)
    };
  }), h.handle("unu:open-scene", async (r, e) => {
    const t = await S.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? s.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const n = t.filePaths[0], i = await u.readFile(n, "utf-8");
    return {
      filePath: n,
      name: s.basename(n),
      content: i
    };
  }), h.handle("unu:read-asset-data-url", async (r, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    try {
      const t = await b(e.projectRoot), n = await he(t, e.relativePath);
      return n ? { dataUrl: await Je(n) } : null;
    } catch (t) {
      const n = t instanceof Error ? t.message : String(t);
      return console.warn("[UNU][main] read-asset-data-url fallback failed:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        message: n
      }), null;
    }
  }), h.handle("unu:import-images", async (r, e) => {
    if (!e.projectRoot) return null;
    const t = await S.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ce(e.projectRoot, t.filePaths, "assets/images") };
  }), h.handle("unu:import-audios", async (r, e) => {
    if (!e.projectRoot) return null;
    const t = await S.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ce(e.projectRoot, t.filePaths, "assets/audio") };
  }), h.handle("unu:save-prefab", async (r, e) => {
    let t = e.filePath;
    if (!t) {
      const n = s.join(e.projectRoot || P.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), i = await S.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: n,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await u.mkdir(s.dirname(t), { recursive: !0 }), await u.writeFile(t, e.content, "utf-8"), {
      filePath: t,
      name: s.basename(t),
      relativePath: e.projectRoot ? w(s.relative(e.projectRoot, t)) : void 0
    };
  }), h.handle("unu:open-prefab", async (r, e) => {
    const t = await S.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? s.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const n = t.filePaths[0], i = await u.readFile(n, "utf-8");
    return {
      filePath: n,
      name: s.basename(n),
      relativePath: e.projectRoot ? w(s.relative(e.projectRoot, n)) : void 0,
      content: i
    };
  }), h.handle("unu:save-text-asset", async (r, e) => Ke(e)), h.handle("unu:open-text-asset", async (r, e) => He(e)), h.handle("unu:create-text-asset-in-folder", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再新建文件。");
    const n = E((e == null ? void 0 : e.folderPath) || "assets"), i = R(t, n);
    if (!i) throw new Error("目标目录不在当前项目内。");
    const a = await u.stat(i).catch(() => null);
    if (!a || !a.isDirectory()) throw new Error("目标目录不存在。");
    const o = !!String((e == null ? void 0 : e.fileName) || "").trim(), c = B(e == null ? void 0 : e.fileName) || "NewFile.ts", l = s.join(i, c), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标文件不在当前项目内。");
    const p = o ? l : await G(l);
    if (o && await x(p)) throw new Error("同名文件已存在。");
    return await u.writeFile(p, (e == null ? void 0 : e.content) ?? "", "utf-8"), {
      filePath: p,
      name: s.basename(p),
      relativePath: w(s.relative(t, p))
    };
  }), h.handle("unu:create-asset-folder", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before creating folders.");
    const n = E((e == null ? void 0 : e.folderPath) || "assets"), i = R(t, n);
    if (!i) throw new Error("Target folder is outside the current project.");
    const a = await u.stat(i).catch(() => null);
    if (!a || !a.isDirectory()) throw new Error("Target folder does not exist.");
    const o = !!String((e == null ? void 0 : e.folderName) || "").trim(), c = B(e == null ? void 0 : e.folderName) || "NewFolder", l = s.join(i, c), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("Target folder is outside the current project.");
    const p = o ? l : await G(l);
    if (o && await x(p)) throw new Error("A folder with the same name already exists.");
    return await u.mkdir(p, { recursive: !1 }), {
      filePath: p,
      name: s.basename(p),
      relativePath: w(s.relative(t, p))
    };
  }), h.handle("unu:rename-asset", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再重命名资源。");
    const n = R(t, (e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("源资源不在当前项目内。");
    const i = await u.stat(n).catch(() => null);
    if (!i) throw new Error("源资源不存在。");
    const a = B(e == null ? void 0 : e.nextName);
    if (!a) throw new Error("资源名称不能为空。");
    const o = s.basename(n), c = i.isDirectory() || s.extname(a) ? a : `${a}${Z(o).ext}`, l = s.join(s.dirname(n), c), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标资源不在当前项目内。");
    if (s.resolve(l) === s.resolve(n))
      return {
        filePath: n,
        name: o,
        relativePath: w(s.relative(t, n))
      };
    if (await x(l)) throw new Error("同名资源已存在。");
    await u.rename(n, l);
    const p = w(s.relative(t, n)), d = w(s.relative(t, l)), g = await oe(t, p, d, i.isDirectory());
    return {
      filePath: l,
      name: s.basename(l),
      relativePath: d,
      relinkedFiles: g.relinkedFiles
    };
  }), h.handle("unu:copy-asset", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before copying assets.");
    const n = E((e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("Source asset path is invalid.");
    const i = R(t, n);
    if (!i) throw new Error("Source asset is outside the current project.");
    const a = await u.stat(i).catch(() => null);
    if (!a) throw new Error("Source asset does not exist.");
    const o = Z(s.basename(i)), c = s.join(s.dirname(i), `${o.base}_Copy${o.ext}`), l = await G(c);
    return a.isDirectory() ? await u.cp(i, l, { recursive: !0, force: !1 }) : await u.copyFile(i, l), {
      filePath: l,
      name: s.basename(l),
      relativePath: w(s.relative(t, l))
    };
  }), h.handle("unu:delete-asset", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before deleting assets.");
    const n = E((e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("Asset path is invalid.");
    if (["assets", "scenes", "prefabs"].includes(n))
      throw new Error("Top-level project folders cannot be deleted from the asset tree.");
    const i = R(t, n);
    if (!i) throw new Error("Asset is outside the current project.");
    if (!await u.stat(i).catch(() => null)) throw new Error("Asset does not exist.");
    const o = await Ge(t, i);
    return {
      ok: !0,
      relativePath: n,
      trashRelativePath: w(s.relative(t, o))
    };
  }), h.handle("unu:restore-deleted-asset", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before restoring assets.");
    const n = E((e == null ? void 0 : e.trashRelativePath) || ""), i = E((e == null ? void 0 : e.restoreRelativePath) || "");
    if (!n || !i || !n.startsWith(".unu-trash/"))
      throw new Error("Restore path is invalid.");
    const a = R(t, n), o = R(t, i);
    if (!a || !o) throw new Error("Restore target is outside the current project.");
    if (!await u.stat(a).catch(() => null)) throw new Error("Deleted asset is no longer available in the undo trash.");
    if (await x(o)) throw new Error("Cannot restore because an asset already exists at the original path.");
    return await u.mkdir(s.dirname(o), { recursive: !0 }), await u.rename(a, o), await u.rm(s.dirname(a), { recursive: !0, force: !0 }).catch(() => null), {
      filePath: o,
      name: s.basename(o),
      relativePath: w(s.relative(t, o))
    };
  }), h.handle("unu:move-asset", async (r, e) => {
    const t = await b(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before moving assets.");
    const n = E((e == null ? void 0 : e.relativePath) || ""), i = E((e == null ? void 0 : e.targetFolderPath) || "");
    if (!n || !i) throw new Error("Asset path is invalid.");
    if (["assets", "scenes", "prefabs"].includes(n))
      throw new Error("Top-level project folders cannot be moved from the asset tree.");
    const a = R(t, n), o = R(t, i);
    if (!a || !o) throw new Error("Move target is outside the current project.");
    const c = await u.stat(a).catch(() => null), l = await u.stat(o).catch(() => null);
    if (!c) throw new Error("Source asset does not exist.");
    if (!l || !l.isDirectory()) throw new Error("Target folder does not exist.");
    const f = s.resolve(a), m = s.resolve(o);
    if (c.isDirectory()) {
      const v = s.relative(f, m);
      if (!v || !v.startsWith("..") && !s.isAbsolute(v))
        throw new Error("A folder cannot be moved into itself or one of its children.");
    }
    if (s.dirname(f) === m)
      return {
        filePath: a,
        name: s.basename(a),
        relativePath: w(s.relative(t, a))
      };
    const p = s.join(o, s.basename(a));
    if (await x(p)) throw new Error("An asset with the same name already exists in the target folder.");
    await u.rename(a, p);
    const d = w(s.relative(t, a)), g = w(s.relative(t, p)), F = await oe(t, d, g, c.isDirectory());
    return {
      filePath: p,
      name: s.basename(p),
      relativePath: g,
      relinkedFiles: F.relinkedFiles
    };
  }), h.handle("unu:read-text-asset", async (r, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const t = await b(e.projectRoot), n = s.join(t, e.relativePath), i = await u.readFile(n, "utf-8");
    return { filePath: n, name: s.basename(n), relativePath: e.relativePath, content: i };
  }), h.handle("unu:rename-project", async (r, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim(), n = String((e == null ? void 0 : e.nextName) || "").trim(), i = O(n);
    if (!t || !i) return null;
    if (t === "sample-project")
      throw new Error("示例项目不支持重命名");
    if (/[\\/]/.test(i))
      throw new Error("项目名称不能包含路径分隔符");
    if ((/* @__PURE__ */ new Set([
      "CON",
      "PRN",
      "AUX",
      "NUL",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "COM5",
      "COM6",
      "COM7",
      "COM8",
      "COM9",
      "LPT1",
      "LPT2",
      "LPT3",
      "LPT4",
      "LPT5",
      "LPT6",
      "LPT7",
      "LPT8",
      "LPT9"
    ])).has(i.toUpperCase()))
      throw new Error(`Invalid project name: ${i}`);
    const o = s.resolve(t), c = await u.stat(o).catch(() => null);
    if (!c || !c.isDirectory())
      throw new Error("项目目录不存在");
    const l = s.dirname(o), f = s.join(l, i);
    if (s.resolve(f) === o)
      return {
        rootPath: o,
        name: i
      };
    if (await x(f))
      throw new Error("目标目录已存在");
    await _e(o, f);
    const m = s.join(f, "project.json");
    try {
      const p = await u.readFile(m, "utf-8"), d = JSON.parse(p), g = {
        ...d && typeof d == "object" ? d : {},
        format: "unu-project",
        version: 1,
        name: i,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await u.writeFile(m, JSON.stringify(g, null, 2), "utf-8");
    } catch {
    }
    return {
      rootPath: f,
      name: i
    };
  }), h.handle("unu:delete-project", async (r, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim();
    if (!t) return { ok: !1 };
    if (t === "sample-project")
      throw new Error("示例项目不支持删除");
    const n = s.resolve(t), i = await u.stat(n).catch(() => null);
    return !i || !i.isDirectory() ? { ok: !1, error: "项目目录不存在" } : (await u.rm(n, { recursive: !0, force: !0 }), { ok: !0 });
  }), h.handle("unu:reveal-in-folder", async (r, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const t = s.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: t
      });
      const n = await u.stat(t).catch(() => null);
      if (!n)
        return { ok: !1, error: `Path not found: ${t}` };
      if (e.isDirectory || n.isDirectory()) {
        const i = await se.openPath(t);
        return { ok: !i, error: i || void 0 };
      }
      return se.showItemInFolder(t), { ok: !0 };
    } catch (n) {
      return { ok: !1, error: n instanceof Error ? n.message : String(n) };
    }
  }), h.handle("unu:open-tilemap-editor", async (r, e) => Ze(e)), h.handle("unu:tilemap-editor-update", async (r, e) => !k || k.isDestroyed() ? { ok: !1, error: "Main window not available" } : (k.webContents.send("unu:tilemap-editor-apply", e), I = { ...I || {}, ...e || {} }, { ok: !0 })), h.handle("unu:close-tilemap-editor", async () => (j && !j.isDestroyed() && j.close(), j = null, { ok: !0 })), h.handle("unu:set-main-window-preset", async (r, e) => !k || k.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (ge(k, e), { ok: !0 })), le(), P.on("activate", () => {
    te.getAllWindows().length === 0 && le();
  });
});
P.on("window-all-closed", () => {
  process.platform !== "darwin" && P.quit();
});
