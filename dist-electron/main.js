import { app as y, ipcMain as h, dialog as b, shell as ae, BrowserWindow as G, screen as ye, nativeImage as ve } from "electron";
import * as u from "node:fs/promises";
import * as ee from "node:fs";
import s from "node:path";
import { fileURLToPath as Pe } from "node:url";
const je = Pe(import.meta.url), N = s.dirname(je);
let A = null, j = null, S = null, W = null, _ = null;
const B = /* @__PURE__ */ new Map();
function w(r) {
  return r.split(s.sep).join("/");
}
function Se(r) {
  const e = s.extname(r).toLowerCase();
  return r.endsWith(".anim.json") ? "animation" : r.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : r.endsWith(".scene.json") ? "scene" : r.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "script";
}
async function D(r) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/scripts/shared",
    "assets/scripts/interactions",
    "assets/scripts/scenes",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((t) => u.mkdir(s.join(r, t), { recursive: !0 })));
}
async function J(r, e) {
  const t = s.join(r, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || s.basename(r),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await u.writeFile(t, JSON.stringify(i, null, 2), "utf-8"), i;
}
function Ae() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}

// You can also create directly editable scripts under:
// - assets/scripts/shared/
// - assets/scripts/interactions/
// - assets/scripts/scenes/<SceneName>/
// Files in those folders may export hooks directly:
// export default { onUpdate(ctx) {} }
`;
}
function be() {
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
function Fe() {
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
async function L(r) {
  const e = [
    { fileName: "ScriptRuntime.ts", content: Ae() },
    { fileName: "InputState.ts", content: be() },
    { fileName: "AudioRuntime.ts", content: Fe() }
  ];
  let t = 0;
  for (const n of e) {
    const i = s.join(r, "assets", "scripts", n.fileName);
    await x(i) || (await u.mkdir(s.dirname(i), { recursive: !0 }), await u.writeFile(i, n.content, "utf-8"), t += 1);
  }
  return t;
}
function ke(r) {
  return r.replace(/\.scene\.json$/i, "");
}
function me(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
}
function Re(r) {
  return `${me(r) || "MainScene"}.scene.json`;
}
function Ee(r) {
  const e = me(r) || "MainScene", t = `scene_${e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "main"}`;
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
function te(r, e) {
  if (!r || typeof r != "object") return;
  if (Array.isArray(r)) {
    for (const n of r) te(n, e);
    return;
  }
  const t = r;
  if (t.actionType === "switchScene") {
    const n = String(t.targetScene || "").trim();
    n && e.add(n);
  }
  for (const n of Object.keys(t))
    te(t[n], e);
}
async function Ce(r, e) {
  const t = s.join(r, "scenes"), n = new Set(e.map((c) => c.toLowerCase())), i = /* @__PURE__ */ new Set();
  for (const c of e) {
    const o = s.join(t, c);
    try {
      const l = await u.readFile(o, "utf-8"), f = JSON.parse(l);
      te(f, i);
    } catch {
    }
  }
  let a = 0;
  for (const c of i) {
    const o = Re(c), l = o.toLowerCase();
    if (n.has(l)) continue;
    const f = s.join(t, o), m = Ee(c);
    await u.writeFile(f, m, "utf-8"), n.add(l), a += 1;
  }
  return a;
}
async function oe(r) {
  const e = s.join(r, "scenes");
  return (await u.readdir(e, { withFileTypes: !0 }).catch(() => [])).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".scene.json")).map((n) => n.name).sort((n, i) => n.localeCompare(i));
}
async function O(r, e) {
  const t = s.join(r, "project.json");
  let n = await oe(r);
  const i = await Ce(r, n);
  i > 0 && (n = await oe(r));
  const a = (e == null ? void 0 : e.trim()) || s.basename(r), c = (/* @__PURE__ */ new Date()).toISOString();
  let o = {};
  try {
    const v = await u.readFile(t, "utf-8"), z = JSON.parse(v);
    z && typeof z == "object" && (o = z);
  } catch {
    o = {};
  }
  const l = n.map((v) => ({
    file: v,
    name: ke(v)
  })), f = Array.isArray(o.sceneCatalog) ? o.sceneCatalog.map((v) => String((v == null ? void 0 : v.file) || (v == null ? void 0 : v.fileName) || "")).filter(Boolean) : [], m = l.map((v) => v.file), p = f.length !== m.length || f.some((v, z) => v !== m[z]), d = String(o.startupScene || "").trim(), g = n.length ? n.includes(d) ? d : n[0] : "", R = d !== g, P = {
    ...o,
    format: "unu-project",
    version: 1,
    name: String(o.name || e || "").trim() || a,
    createdAt: String(o.createdAt || "").trim() || c,
    updatedAt: c,
    sceneCatalogVersion: 1,
    sceneCatalog: l,
    startupScene: g
  }, F = !o.format || !o.version || !Array.isArray(o.sceneCatalog) || p || R || String(o.name || "").trim() !== P.name || i > 0;
  return F && await u.writeFile(t, JSON.stringify(P, null, 2), "utf-8"), {
    repaired: F,
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
async function k(r) {
  const e = String(r || "").trim();
  if (!e || e === "sample-project" || s.isAbsolute(e)) return e;
  const t = e.replace(/\\/g, "/").replace(/^\/+/, "");
  if (y.isPackaged && t.toLowerCase().startsWith("sample-project-list/")) {
    const i = [
      s.join(process.resourcesPath, t),
      s.join(y.getAppPath(), t)
    ], a = s.join(y.getPath("userData"), "bundled-samples", s.basename(t));
    if (!(await x(s.join(a, "project.json")) && await x(s.join(a, "scenes")) && await x(s.join(a, "assets")))) {
      const o = await _e(i);
      o && (await u.mkdir(s.dirname(a), { recursive: !0 }), await u.rm(a, { recursive: !0, force: !0 }), await u.cp(o, a, { recursive: !0, force: !0 }));
    }
    if (await x(a)) return a;
  }
  const n = [
    s.join(y.getAppPath(), t),
    s.join(process.cwd(), t),
    s.resolve(N, "..", t),
    s.resolve(t)
  ];
  for (const i of n)
    if (await x(i)) return i;
  return s.resolve(e);
}
async function _e(r) {
  for (const e of r)
    if (await x(e)) return e;
  return "";
}
function Ne() {
  const r = /* @__PURE__ */ new Date(), e = (i) => String(i).padStart(2, "0"), t = `${r.getFullYear()}${e(r.getMonth() + 1)}${e(r.getDate())}`, n = `${e(r.getHours())}${e(r.getMinutes())}`;
  return `UNUProject_${t}_${n}`;
}
function U(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function K(r) {
  return String(r || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function C(r) {
  const e = String(r || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!e || s.isAbsolute(e)) return "";
  const t = e.split("/").filter(Boolean);
  return t.some((n) => n === "..") ? "" : t.join("/");
}
function E(r, e) {
  const t = s.resolve(r), n = C(e);
  if (!n) return "";
  const i = s.resolve(t, n), a = s.relative(t, i);
  return a.startsWith("..") || s.isAbsolute(a) ? "" : i;
}
function re(r) {
  const e = r.toLowerCase(), n = [".anim.json", ".atlas.json", ".scene.json", ".prefab.json"].find((a) => e.endsWith(a));
  if (n) return { base: r.slice(0, -n.length), ext: r.slice(r.length - n.length) };
  const i = s.extname(r);
  return { base: i ? r.slice(0, -i.length) : r, ext: i };
}
async function H(r) {
  if (!await x(r)) return r;
  const e = s.dirname(r), t = re(s.basename(r));
  for (let n = 1; n < 1e3; n += 1) {
    const i = s.join(e, `${t.base}-${n}${t.ext}`);
    if (!await x(i)) return i;
  }
  throw new Error("无法生成可用的默认文件名，请手动输入文件名。");
}
function q(r) {
  return `${String(r || "").trim().replace(/\.scene\.json$/i, "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "MainScene"}.scene.json`;
}
async function T(r, e) {
  await x(r) && (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.cp(r, e, { recursive: !0, force: !0 }));
}
async function Te(r, e) {
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
async function pe(r, e) {
  return await x(r) ? (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.copyFile(r, e), !0) : !1;
}
function de() {
  return [
    s.resolve(N, "..", "assets-for-sample"),
    s.resolve(process.cwd(), "assets-for-sample")
  ].find((e) => ee.existsSync(e)) || "";
}
const he = [
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
async function De(r) {
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
async function $e(r) {
  const e = s.join(r, "assets", "images");
  await u.mkdir(e, { recursive: !0 });
  const t = Z("player"), n = Z("enemy"), i = Z("chest");
  await Promise.all([
    u.writeFile(s.join(e, "player.png"), t),
    u.writeFile(s.join(e, "enemy.png"), n),
    u.writeFile(s.join(e, "chest.png"), i)
  ]);
}
async function Me(r) {
  const e = de();
  if (!e) return !1;
  let t = 0;
  for (const n of he)
    await pe(s.join(e, n.from), s.join(r, n.to)) && (t += 1);
  return t > 0;
}
async function ze(r) {
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
async function Ie(r) {
  const e = s.join(r, "assets", "audio");
  await u.mkdir(e, { recursive: !0 }), await u.writeFile(s.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function We(r) {
  const e = await Me(r);
  await Promise.all([
    De(r),
    ...e ? [] : [$e(r)],
    ze(r),
    Ie(r)
  ]);
}
function X(r, e) {
  const t = String(r || "").trim();
  if (!t) return "";
  if (t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  let n = t.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  const i = w(s.resolve(e)), a = i.toLowerCase(), c = n.toLowerCase();
  c.startsWith(`${a}/`) && (n = n.slice(i.length + 1));
  const l = c.lastIndexOf("/assets/");
  return l >= 0 && (n = n.slice(l + 1)), n = n.replace(/^\/+/, ""), n.toLowerCase().startsWith("dist/assets/") && (n = n.slice(5)), n.toLowerCase().startsWith("dist-electron/assets/") && (n = n.slice(14)), n;
}
const se = /* @__PURE__ */ new Set([
  "texturePath",
  "animationAssetPath",
  "sourceAtlasPath",
  "scriptPath",
  "clipPath",
  "imagePath",
  "path",
  "relativePath"
]), ie = /* @__PURE__ */ new Set(["framePaths", "textureCycle"]);
function V(r) {
  const e = X(r, "");
  if (!e) return !1;
  const t = e.toLowerCase();
  return !(t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("builtin://") || t.startsWith("custom://") || t.startsWith("javascript:") || t.startsWith("mailto:") || t.startsWith("about:"));
}
function $(r) {
  return M(r).toLowerCase();
}
function Le(r) {
  const e = r.toLowerCase();
  return e.endsWith(".scene.json") ? "scene" : e.endsWith(".prefab.json") ? "prefab" : e.endsWith(".anim.json") ? "animation" : e.endsWith(".atlas.json") ? "atlas" : "json";
}
function Oe(r, e, t, n, i) {
  let a = !1;
  const c = (l, f, m, p) => {
    const d = X(m, e);
    V(d) && t.push({ sourceFile: n, sourceKind: i, keyPath: p, ref: d }), d !== m && (l[f] = d, a = !0);
  }, o = (l, f = "$") => {
    if (!l || typeof l != "object") return;
    if (Array.isArray(l)) {
      l.forEach((p, d) => o(p, `${f}[${d}]`));
      return;
    }
    const m = l;
    for (const [p, d] of Object.entries(m)) {
      const g = `${f}.${p}`;
      if (typeof d == "string" && se.has(p)) {
        c(m, p, d, g);
        continue;
      }
      if (Array.isArray(d) && ie.has(p)) {
        const R = d.map((P) => {
          if (typeof P != "string") return P;
          const F = X(P, e);
          return V(F) && t.push({ sourceFile: n, sourceKind: i, keyPath: g, ref: F }), F !== P && (a = !0), F;
        });
        m[p] = R;
        continue;
      }
      if (d && typeof d == "object" && p === "tileTextureMap" && !Array.isArray(d)) {
        const R = d;
        for (const [P, F] of Object.entries(R)) {
          if (typeof F != "string") continue;
          const v = X(F, e);
          V(v) && t.push({ sourceFile: n, sourceKind: i, keyPath: `${g}.${P}`, ref: v }), v !== F && (R[P] = v, a = !0);
        }
      }
      o(d, g);
    }
  };
  return o(r), a;
}
function Ue(r, e) {
  let t = !1;
  const n = (a) => {
    const c = M(a);
    return e.get($(c)) || a;
  }, i = (a) => {
    if (!a || typeof a != "object") return;
    if (Array.isArray(a)) {
      for (const o of a) i(o);
      return;
    }
    const c = a;
    for (const [o, l] of Object.entries(c)) {
      if (typeof l == "string" && se.has(o)) {
        const f = n(l);
        f !== l && (c[o] = f, t = !0);
        continue;
      }
      if (Array.isArray(l) && ie.has(o)) {
        const f = l.map((m) => {
          if (typeof m != "string") return m;
          const p = n(m);
          return p !== m && (t = !0), p;
        });
        c[o] = f;
        continue;
      }
      if (l && typeof l == "object" && o === "tileTextureMap" && !Array.isArray(l)) {
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
async function ge(r) {
  const e = [], t = ["scenes", "prefabs", "assets"], n = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const c of a) {
      const o = s.join(i, c.name);
      if (c.isDirectory()) {
        await n(o);
        continue;
      }
      if (!c.isFile() || !c.name.toLowerCase().endsWith(".json")) continue;
      const f = w(s.relative(r, o));
      f.toLowerCase() !== "project.json" && e.push({ fullPath: o, relativePath: f, kind: Le(c.name) });
    }
  };
  for (const i of t)
    await n(s.join(r, i));
  return e;
}
async function ce(r) {
  const e = await ge(r), t = [];
  let n = 0, i = 0;
  for (const a of e) {
    const c = await u.readFile(a.fullPath, "utf-8").catch(() => "");
    if (!c) continue;
    let o = null;
    try {
      o = JSON.parse(String(c).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Oe(o, r, t, a.relativePath, a.kind) && (n += 1, a.kind === "scene" && (i += 1), await u.writeFile(a.fullPath, JSON.stringify(o, null, 2), "utf-8"));
  }
  return { refs: t, normalizedFiles: n, normalizedSceneFiles: i, dependencyFiles: e };
}
async function Xe(r) {
  const e = /* @__PURE__ */ new Map(), t = s.join(r, "assets"), n = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const c of a) {
      const o = s.join(i, c.name);
      if (c.isDirectory()) {
        await n(o);
        continue;
      }
      if (!c.isFile()) continue;
      const l = w(s.relative(r, o)), f = s.basename(c.name).toLowerCase(), m = e.get(f) || [];
      m.push(l), e.set(f, m);
    }
  };
  return await n(t), { byBasename: e };
}
async function Q(r, e) {
  const t = [], n = /* @__PURE__ */ new Map();
  for (const i of e) {
    const a = $(i.ref);
    if (!n.has(a)) {
      const c = await we(r, i.ref);
      n.set(a, !!c);
    }
    n.get(a) || t.push(i);
  }
  return t;
}
async function Ye(r, e, t) {
  if (!e.length) return { relinkedAssets: 0, relinkedFiles: 0 };
  const n = await Xe(r), i = /* @__PURE__ */ new Map(), a = Array.from(new Map(e.map((o) => [$(o.ref), o.ref])).values());
  for (const o of a) {
    const l = s.basename(o).toLowerCase(), f = (n.byBasename.get(l) || []).filter((m) => $(m) !== $(o));
    f.length === 1 && i.set($(o), f[0]);
  }
  if (!i.size) return { relinkedAssets: 0, relinkedFiles: 0 };
  let c = 0;
  for (const o of t) {
    const l = await u.readFile(o.fullPath, "utf-8").catch(() => "");
    if (!l) continue;
    let f = null;
    try {
      f = JSON.parse(String(l).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Ue(f, i) && (c += 1, await u.writeFile(o.fullPath, JSON.stringify(f, null, 2), "utf-8"));
  }
  return { relinkedAssets: i.size, relinkedFiles: c };
}
function Be(r, e, t, n) {
  const i = M(r), a = M(e), c = M(t);
  if (!i || !a || !c) return r;
  const o = i.toLowerCase(), l = a.toLowerCase();
  return o === l ? c : n && o.startsWith(`${l}/`) ? `${c}${i.slice(a.length)}` : r;
}
function Ge(r, e, t, n) {
  let i = !1;
  const a = (o) => {
    const l = Be(o, e, t, n);
    return l !== o && (i = !0), l;
  }, c = (o) => {
    if (!o || typeof o != "object") return;
    if (Array.isArray(o)) {
      for (const f of o) c(f);
      return;
    }
    const l = o;
    for (const [f, m] of Object.entries(l)) {
      if (typeof m == "string" && se.has(f)) {
        l[f] = a(m);
        continue;
      }
      if (Array.isArray(m) && ie.has(f)) {
        l[f] = m.map((p) => typeof p == "string" ? a(p) : p);
        continue;
      }
      if (m && typeof m == "object" && f === "tileTextureMap" && !Array.isArray(m)) {
        const p = m;
        for (const [d, g] of Object.entries(p))
          typeof g == "string" && (p[d] = a(g));
      }
      c(m);
    }
  };
  return c(r), i;
}
async function le(r, e, t, n) {
  const i = M(e), a = M(t);
  if (!i || !a || i === a) return { relinkedFiles: 0 };
  const c = await ge(r);
  let o = 0;
  for (const l of c) {
    const f = await u.readFile(l.fullPath, "utf-8").catch(() => "");
    if (!f) continue;
    let m = null;
    try {
      m = JSON.parse(String(f).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Ge(m, i, a, n) && (o += 1, await u.writeFile(l.fullPath, JSON.stringify(m, null, 2), "utf-8"));
  }
  return { relinkedFiles: o };
}
async function Je(r, e) {
  if (!e.length) return 0;
  const t = de();
  if (!t) return 0;
  const n = new Map(he.map((a) => [a.to.toLowerCase(), a.from]));
  let i = 0;
  for (const a of e) {
    const c = n.get(a.toLowerCase());
    if (!c) continue;
    await pe(s.join(t, c), s.join(r, a)) && (i += 1);
  }
  return i;
}
async function I(r) {
  let e = await ce(r);
  const t = await Q(r, e.refs), n = Array.from(new Set(t.map((m) => m.ref))), i = await Je(r, n), a = i > 0 ? await Q(r, e.refs) : t, c = await Ye(r, a, e.dependencyFiles);
  if (i > 0 || c.relinkedAssets > 0) {
    const m = await ce(r);
    e = {
      ...m,
      normalizedFiles: e.normalizedFiles + m.normalizedFiles,
      normalizedSceneFiles: e.normalizedSceneFiles + m.normalizedSceneFiles
    };
  }
  const o = await Q(r, e.refs), l = new Set(e.refs.map((m) => $(m.ref))).size, f = new Set(o.map((m) => $(m.ref))).size;
  return {
    repaired: e.normalizedFiles > 0 || i > 0 || c.relinkedAssets > 0,
    normalizedSceneFiles: e.normalizedSceneFiles,
    normalizedFiles: e.normalizedFiles,
    copiedAssets: i,
    relinkedAssets: c.relinkedAssets,
    relinkedFiles: c.relinkedFiles,
    checkedAssetRefs: l,
    resolvedAssets: Math.max(0, l - f),
    unresolvedAssets: f,
    unresolvedRefs: o.slice(0, 100)
  };
}
function Z(r) {
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
  return ve.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(n)}`).toPNG();
}
async function ne(r, e) {
  const i = (await u.readdir(r, { withFileTypes: !0 })).filter((a) => a.name !== ".unu-trash").sort((a, c) => Number(c.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(c.name));
  return Promise.all(
    i.map(async (a) => {
      const c = s.join(r, a.name), o = w(s.relative(e, c)) || ".", l = a.isDirectory(), f = {
        id: o,
        name: a.name,
        type: l ? "folder" : Se(a.name),
        path: o,
        absolutePath: c,
        children: []
      };
      return l && (f.children = await ne(c, e)), f;
    })
  );
}
async function Ke(r, e) {
  const t = s.join(r, ".unu-trash"), n = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, i = s.join(t, n);
  await u.mkdir(i, { recursive: !0 });
  const a = s.join(i, s.basename(e));
  return await u.rename(e, a), a;
}
async function He(r) {
  const e = s.extname(r).toLowerCase(), t = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", n = await u.readFile(r);
  return `data:${t};base64,${n.toString("base64")}`;
}
function M(r) {
  return String(r || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}
async function we(r, e) {
  const t = M(e);
  if (!t) return null;
  const n = y.getAppPath(), i = t.startsWith("assets/") ? t.slice(7) : t, a = [
    s.join(r, t),
    s.join(r, "assets", i),
    s.join(n, t),
    s.join(n, "assets", i),
    s.join(n, "dist", t),
    s.join(n, "dist", "assets", i),
    s.join(n, "dist-electron", t),
    s.join(n, "dist-electron", "assets", i),
    s.join(N, t),
    s.join(N, "assets", i)
  ];
  for (const c of a) {
    const o = await u.stat(c).catch(() => null);
    if (o != null && o.isFile()) return c;
  }
  return null;
}
async function ue(r, e, t) {
  await D(r);
  const n = s.join(r, t);
  await u.mkdir(n, { recursive: !0 });
  const i = [];
  for (const a of e) {
    const c = s.basename(a), o = s.join(n, c);
    await u.copyFile(a, o), i.push({
      fileName: c,
      relativePath: w(s.relative(r, o))
    });
  }
  return i;
}
async function qe(r) {
  let e = r.filePath;
  if (!e) {
    const t = s.join(r.projectRoot || y.getPath("documents"), r.subdir || "", r.suggestedName || "Asset.json"), n = await b.showSaveDialog({
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
async function Ve(r) {
  var i;
  const e = await b.showOpenDialog({
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
function Y(r) {
  const e = B.get(r);
  e && (e.timer && clearTimeout(e.timer), e.watcher.close(), B.delete(r));
}
function Qe(r) {
  const e = w(String(r || "")).toLowerCase();
  return e.endsWith(".ts") || e.endsWith(".js") || e.endsWith(".mjs") || e.endsWith(".json");
}
async function Ze(r, e) {
  Y(r.id);
  const t = await k(e);
  if (!t || t === "sample-project") return { ok: !1, error: "sample-project cannot be watched" };
  const n = s.join(t, "assets", "scripts");
  await u.mkdir(n, { recursive: !0 });
  const i = (c, o) => {
    if (!o || !Qe(String(o))) return;
    const l = B.get(r.id);
    if (!l) return;
    l.timer && clearTimeout(l.timer);
    const f = w(String(o));
    l.timer = setTimeout(() => {
      if (r.isDestroyed()) {
        Y(r.id);
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
    a = ee.watch(n, { recursive: !0 }, i);
  } catch {
    a = ee.watch(n, i);
  }
  return B.set(r.id, { watcher: a, timer: null, projectRoot: t }), r.once("destroyed", () => Y(r.id)), { ok: !0 };
}
function fe() {
  const r = new G({
    width: 1120,
    height: 700,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111318",
    webPreferences: {
      preload: s.join(N, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  xe(r, "launcher"), y.isPackaged ? r.loadFile(s.join(y.getAppPath(), "dist", "index.html")) : (r.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && r.webContents.openDevTools({ mode: "detach" })), A = r, r.on("closed", () => {
    A === r && (A = null);
  });
}
function xe(r, e) {
  if (!r || r.isDestroyed()) return;
  const t = ye.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const a = Math.min(1680, Math.max(1200, t.width - 120)), c = Math.min(980, Math.max(760, t.height - 100));
    r.setSize(a, c, !0), r.center();
    return;
  }
  const n = Math.min(1180, Math.max(980, t.width - 220)), i = Math.min(760, Math.max(640, t.height - 180));
  r.setSize(n, i, !0), r.center();
}
function et(r) {
  y.isPackaged ? r.loadFile(s.join(y.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : r.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function tt(r) {
  y.isPackaged ? r.loadFile(s.join(y.getAppPath(), "dist", "index.html"), {
    query: { codeEditor: "1" }
  }) : r.loadURL("http://localhost:5173/?codeEditor=1");
}
function rt(r) {
  return W = r || null, A ? (!j || j.isDestroyed() ? (j = new G({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: A,
    webPreferences: {
      preload: s.join(N, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), et(j), j.on("closed", () => {
    j = null;
  })) : (j.isMinimized() && j.restore(), j.focus()), j.webContents.once("did-finish-load", () => {
    !j || j.isDestroyed() || j.webContents.send("unu:tilemap-editor-init", W);
  }), j.webContents.isLoadingMainFrame() ? { ok: !0 } : (j.webContents.send("unu:tilemap-editor-init", W), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
function nt(r) {
  return _ = r || null, A ? (!S || S.isDestroyed() ? (S = new G({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: "UNU Code Editor",
    backgroundColor: "#0f1420",
    parent: A,
    webPreferences: {
      preload: s.join(N, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), tt(S), S.on("closed", () => {
    A && !A.isDestroyed() && A.webContents.send("unu:code-editor-closed", {
      id: (_ == null ? void 0 : _.id) || "",
      closedAt: Date.now()
    }), S = null, _ = null;
  })) : (S.isMinimized() && S.restore(), S.focus()), S.webContents.once("did-finish-load", () => {
    !S || S.isDestroyed() || S.webContents.send("unu:code-editor-init", _);
  }), S.webContents.isLoadingMainFrame() ? { ok: !0 } : (S.webContents.send("unu:code-editor-init", _), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
function st(r) {
  const e = /* @__PURE__ */ new Date(), t = (i) => String(i).padStart(2, "0"), n = [
    e.getFullYear(),
    t(e.getMonth() + 1),
    t(e.getDate()),
    "-",
    t(e.getHours()),
    t(e.getMinutes()),
    t(e.getSeconds())
  ].join("");
  return `${U(r) || "UNUGame"}-web-${n}`;
}
async function it() {
  const r = y.isPackaged ? [
    s.join(process.resourcesPath, "dist"),
    s.join(process.resourcesPath, "app.asar.unpacked", "dist"),
    s.join(process.cwd(), "dist")
  ] : [
    s.join(process.cwd(), "dist"),
    s.resolve(N, "..", "dist"),
    s.join(N, "dist"),
    s.join(y.getAppPath(), "dist")
  ];
  for (const e of r)
    if (!e.includes(".asar") && await x(s.join(e, "index.html")))
      return e;
  throw new Error(
    y.isPackaged ? "未找到可复制的 Web 构建目录 resources/dist，请重新打包应用后再导出。" : "未找到 Web 构建目录 dist，请先执行 npm run build。"
  );
}
async function at(r) {
  if (!await x(r)) return 0;
  let e = 0;
  const t = async (n) => {
    const i = await u.readdir(n, { withFileTypes: !0 }).catch(() => []);
    for (const a of i) {
      const c = s.join(n, a.name);
      a.isDirectory() ? await t(c) : a.isFile() && (e += 1);
    }
  };
  return await t(r), e;
}
async function ot(r, e) {
  let t = await u.readFile(r, "utf-8");
  t = t.replace(/(src|href)="\/assets\//g, '$1="./assets/').replace(/<title>.*?<\/title>/i, `<title>${lt(e || "UNU Game")}</title>`), t.includes("__UNU_GAME_EXPORT__") || (t = t.replace(
    /<head([^>]*)>/i,
    `<head$1>
    <script>window.__UNU_GAME_EXPORT__ = true;<\/script>`
  )), await u.writeFile(r, t, "utf-8");
}
async function ct(r, e) {
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
function lt(r) {
  return String(r).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
process.on("unhandledRejection", (r) => {
  console.error("[UNU][main] Unhandled promise rejection:", r);
});
process.on("uncaughtException", (r) => {
  console.error("[UNU][main] Uncaught exception:", r);
});
y.whenReady().then(() => {
  h.handle("unu:create-project", async () => {
    const r = await b.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (r.canceled || r.filePaths.length === 0) return null;
    const e = r.filePaths[0];
    return await D(e), await J(e), {
      rootPath: e,
      name: s.basename(e),
      created: !0
    };
  }), h.handle("unu:create-project-v2", async (r, e) => {
    let t = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!t) {
      const o = await b.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (o.canceled || o.filePaths.length === 0) return null;
      t = o.filePaths[0];
    }
    const n = await u.stat(t).catch(() => null);
    if (!(n != null && n.isDirectory()))
      throw new Error("无效的项目目录");
    const i = U(e == null ? void 0 : e.projectName) || Ne(), a = s.join(t, i);
    if (await x(a))
      throw new Error(`目标目录已存在: ${a}`);
    await D(a), await J(a, i), await L(a);
    const c = await I(a);
    return {
      rootPath: a,
      name: i,
      parentDir: t,
      created: !0,
      integrity: c
    };
  }), h.handle("unu:pick-directory", async (r, e) => {
    const t = await b.showOpenDialog({
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
    const r = await b.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (r.canceled || r.filePaths.length === 0) return null;
    const e = r.filePaths[0];
    return await D(e), {
      rootPath: e,
      name: s.basename(e)
    };
  }), h.handle("unu:save-project-as", async (r, e) => {
    const t = await b.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const n = t.filePaths[0], i = s.resolve(n), a = e.sourceProjectRoot ? s.resolve(e.sourceProjectRoot) : "";
    if (a && a !== "sample-project" && a === i)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await D(n);
    const c = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !c && a && await x(a) ? (await T(s.join(a, "assets"), s.join(n, "assets")), await T(s.join(a, "scenes"), s.join(n, "scenes")), await T(s.join(a, "prefabs"), s.join(n, "prefabs")), await T(s.join(a, "project.json"), s.join(n, "project.json"))) : await We(n), await J(n, e.projectName), await L(n);
    let o;
    const l = Array.isArray(e.sceneFiles) ? e.sceneFiles : [];
    if (l.length > 0) {
      const m = /* @__PURE__ */ new Set();
      for (const p of l) {
        const d = q(p.fileName);
        let g = d, R = 2;
        for (; m.has(g.toLowerCase()); )
          g = d.replace(/\.scene\.json$/i, `_${R}.scene.json`), R += 1;
        m.add(g.toLowerCase());
        const P = s.join(n, "scenes", g);
        await u.mkdir(s.dirname(P), { recursive: !0 }), await u.writeFile(P, String(p.content || ""), "utf-8"), o || (o = P);
        const F = q(e.currentSceneName);
        g.toLowerCase() === F.toLowerCase() && (o = P);
      }
    } else if (e.currentSceneContent) {
      const m = q(e.currentSceneName);
      o = s.join(n, "scenes", m), await u.mkdir(s.dirname(o), { recursive: !0 }), await u.writeFile(o, e.currentSceneContent, "utf-8");
    }
    await O(n, e.projectName);
    const f = await I(n);
    return {
      rootPath: n,
      name: s.basename(n),
      sceneFilePath: o,
      fromSample: c,
      integrity: f
    };
  }), h.handle("unu:export-game", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project" || !await x(t))
      throw new Error("请先打开一个本地项目，再导出游戏。");
    await D(t), await L(t);
    const n = U(e == null ? void 0 : e.projectName) || s.basename(t), i = await O(t, n), a = await I(t), c = await b.showOpenDialog({
      title: "导出 Web 游戏到目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (c.canceled || c.filePaths.length === 0) return null;
    const o = await it(), l = s.join(c.filePaths[0], st(n));
    await u.mkdir(l, { recursive: !0 }), await u.cp(o, l, { recursive: !0, force: !0 }), await T(s.join(t, "project.json"), s.join(l, "project.json")), await T(s.join(t, "assets"), s.join(l, "assets")), await T(s.join(t, "scenes"), s.join(l, "scenes")), await T(s.join(t, "prefabs"), s.join(l, "prefabs"));
    const f = s.join(l, "index.html");
    await ot(f, n), await ct(l, n);
    const m = await at(s.join(l, "assets")), p = {
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
    const t = await k(e);
    await D(t), await L(t);
    const n = s.basename(t), i = await O(t, n), a = await I(t), c = await ne(t, t);
    return {
      rootPath: t,
      name: n,
      tree: c,
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
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再检查资源依赖。");
    await D(t);
    const n = await I(t), i = await ne(t, t);
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
  }), h.handle("unu:watch-project-scripts", async (r, e) => Ze(r.sender, String((e == null ? void 0 : e.projectRoot) || "").trim())), h.handle("unu:unwatch-project-scripts", async (r) => (Y(r.sender.id), { ok: !0 })), h.handle("unu:save-scene", async (r, e) => {
    let t = e.filePath;
    if (!t) {
      const n = s.join(e.projectRoot || y.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), i = await b.showSaveDialog({
        title: "保存场景",
        defaultPath: n,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await u.mkdir(s.dirname(t), { recursive: !0 }), await u.writeFile(t, e.content, "utf-8"), e.projectRoot && await O(e.projectRoot, s.basename(e.projectRoot)), {
      filePath: t,
      name: s.basename(t)
    };
  }), h.handle("unu:open-scene", async (r, e) => {
    const t = await b.showOpenDialog({
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
      const t = await k(e.projectRoot), n = await we(t, e.relativePath);
      return n ? { dataUrl: await He(n) } : null;
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
    const t = await b.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ue(e.projectRoot, t.filePaths, "assets/images") };
  }), h.handle("unu:import-audios", async (r, e) => {
    if (!e.projectRoot) return null;
    const t = await b.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ue(e.projectRoot, t.filePaths, "assets/audio") };
  }), h.handle("unu:save-prefab", async (r, e) => {
    let t = e.filePath;
    if (!t) {
      const n = s.join(e.projectRoot || y.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), i = await b.showSaveDialog({
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
    const t = await b.showOpenDialog({
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
  }), h.handle("unu:save-text-asset", async (r, e) => qe(e)), h.handle("unu:open-text-asset", async (r, e) => Ve(e)), h.handle("unu:create-text-asset-in-folder", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再新建文件。");
    const n = C((e == null ? void 0 : e.folderPath) || "assets"), i = E(t, n);
    if (!i) throw new Error("目标目录不在当前项目内。");
    const a = await u.stat(i).catch(() => null);
    if (!a || !a.isDirectory()) throw new Error("目标目录不存在。");
    const c = !!String((e == null ? void 0 : e.fileName) || "").trim(), o = K(e == null ? void 0 : e.fileName) || "NewFile.ts", l = s.join(i, o), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标文件不在当前项目内。");
    const p = c ? l : await H(l);
    if (c && await x(p)) throw new Error("同名文件已存在。");
    return await u.writeFile(p, (e == null ? void 0 : e.content) ?? "", "utf-8"), {
      filePath: p,
      name: s.basename(p),
      relativePath: w(s.relative(t, p))
    };
  }), h.handle("unu:create-asset-folder", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before creating folders.");
    const n = C((e == null ? void 0 : e.folderPath) || "assets"), i = E(t, n);
    if (!i) throw new Error("Target folder is outside the current project.");
    const a = await u.stat(i).catch(() => null);
    if (!a || !a.isDirectory()) throw new Error("Target folder does not exist.");
    const c = !!String((e == null ? void 0 : e.folderName) || "").trim(), o = K(e == null ? void 0 : e.folderName) || "NewFolder", l = s.join(i, o), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("Target folder is outside the current project.");
    const p = c ? l : await H(l);
    if (c && await x(p)) throw new Error("A folder with the same name already exists.");
    return await u.mkdir(p, { recursive: !1 }), {
      filePath: p,
      name: s.basename(p),
      relativePath: w(s.relative(t, p))
    };
  }), h.handle("unu:rename-asset", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再重命名资源。");
    const n = E(t, (e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("源资源不在当前项目内。");
    const i = await u.stat(n).catch(() => null);
    if (!i) throw new Error("源资源不存在。");
    const a = K(e == null ? void 0 : e.nextName);
    if (!a) throw new Error("资源名称不能为空。");
    const c = s.basename(n), o = i.isDirectory() || s.extname(a) ? a : `${a}${re(c).ext}`, l = s.join(s.dirname(n), o), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标资源不在当前项目内。");
    if (s.resolve(l) === s.resolve(n))
      return {
        filePath: n,
        name: c,
        relativePath: w(s.relative(t, n))
      };
    if (await x(l)) throw new Error("同名资源已存在。");
    await u.rename(n, l);
    const p = w(s.relative(t, n)), d = w(s.relative(t, l)), g = await le(t, p, d, i.isDirectory());
    return {
      filePath: l,
      name: s.basename(l),
      relativePath: d,
      relinkedFiles: g.relinkedFiles
    };
  }), h.handle("unu:copy-asset", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before copying assets.");
    const n = C((e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("Source asset path is invalid.");
    const i = E(t, n);
    if (!i) throw new Error("Source asset is outside the current project.");
    const a = await u.stat(i).catch(() => null);
    if (!a) throw new Error("Source asset does not exist.");
    const c = C((e == null ? void 0 : e.targetFolderPath) || "") || w(s.relative(t, s.dirname(i))), o = E(t, c);
    if (!o) throw new Error("Target folder is outside the current project.");
    const l = await u.stat(o).catch(() => null);
    if (!(l != null && l.isDirectory())) throw new Error("Target folder does not exist.");
    if (a.isDirectory()) {
      const d = w(i), g = w(o);
      if (g === d || g.startsWith(`${d}/`))
        throw new Error("Cannot paste a folder into itself or one of its children.");
    }
    const f = re(s.basename(i)), m = s.join(o, `${f.base}_Copy${f.ext}`), p = await H(m);
    return a.isDirectory() ? await u.cp(i, p, { recursive: !0, force: !1 }) : await u.copyFile(i, p), {
      filePath: p,
      name: s.basename(p),
      relativePath: w(s.relative(t, p))
    };
  }), h.handle("unu:delete-asset", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before deleting assets.");
    const n = C((e == null ? void 0 : e.relativePath) || "");
    if (!n) throw new Error("Asset path is invalid.");
    if (["assets", "scenes", "prefabs"].includes(n))
      throw new Error("Top-level project folders cannot be deleted from the asset tree.");
    const i = E(t, n);
    if (!i) throw new Error("Asset is outside the current project.");
    if (!await u.stat(i).catch(() => null)) throw new Error("Asset does not exist.");
    const c = await Ke(t, i);
    return {
      ok: !0,
      relativePath: n,
      trashRelativePath: w(s.relative(t, c))
    };
  }), h.handle("unu:restore-deleted-asset", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before restoring assets.");
    const n = C((e == null ? void 0 : e.trashRelativePath) || ""), i = C((e == null ? void 0 : e.restoreRelativePath) || "");
    if (!n || !i || !n.startsWith(".unu-trash/"))
      throw new Error("Restore path is invalid.");
    const a = E(t, n), c = E(t, i);
    if (!a || !c) throw new Error("Restore target is outside the current project.");
    if (!await u.stat(a).catch(() => null)) throw new Error("Deleted asset is no longer available in the undo trash.");
    if (await x(c)) throw new Error("Cannot restore because an asset already exists at the original path.");
    return await u.mkdir(s.dirname(c), { recursive: !0 }), await u.rename(a, c), await u.rm(s.dirname(a), { recursive: !0, force: !0 }).catch(() => null), {
      filePath: c,
      name: s.basename(c),
      relativePath: w(s.relative(t, c))
    };
  }), h.handle("unu:move-asset", async (r, e) => {
    const t = await k(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("Please open or save a local project before moving assets.");
    const n = C((e == null ? void 0 : e.relativePath) || ""), i = C((e == null ? void 0 : e.targetFolderPath) || "");
    if (!n || !i) throw new Error("Asset path is invalid.");
    if (["assets", "scenes", "prefabs"].includes(n))
      throw new Error("Top-level project folders cannot be moved from the asset tree.");
    const a = E(t, n), c = E(t, i);
    if (!a || !c) throw new Error("Move target is outside the current project.");
    const o = await u.stat(a).catch(() => null), l = await u.stat(c).catch(() => null);
    if (!o) throw new Error("Source asset does not exist.");
    if (!l || !l.isDirectory()) throw new Error("Target folder does not exist.");
    const f = s.resolve(a), m = s.resolve(c);
    if (o.isDirectory()) {
      const P = s.relative(f, m);
      if (!P || !P.startsWith("..") && !s.isAbsolute(P))
        throw new Error("A folder cannot be moved into itself or one of its children.");
    }
    if (s.dirname(f) === m)
      return {
        filePath: a,
        name: s.basename(a),
        relativePath: w(s.relative(t, a))
      };
    const p = s.join(c, s.basename(a));
    if (await x(p)) throw new Error("An asset with the same name already exists in the target folder.");
    await u.rename(a, p);
    const d = w(s.relative(t, a)), g = w(s.relative(t, p)), R = await le(t, d, g, o.isDirectory());
    return {
      filePath: p,
      name: s.basename(p),
      relativePath: g,
      relinkedFiles: R.relinkedFiles
    };
  }), h.handle("unu:read-text-asset", async (r, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const t = await k(e.projectRoot), n = s.join(t, e.relativePath), i = await u.readFile(n, "utf-8");
    return { filePath: n, name: s.basename(n), relativePath: e.relativePath, content: i };
  }), h.handle("unu:rename-project", async (r, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim(), n = String((e == null ? void 0 : e.nextName) || "").trim(), i = U(n);
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
    const c = s.resolve(t), o = await u.stat(c).catch(() => null);
    if (!o || !o.isDirectory())
      throw new Error("项目目录不存在");
    const l = s.dirname(c), f = s.join(l, i);
    if (s.resolve(f) === c)
      return {
        rootPath: c,
        name: i
      };
    if (await x(f))
      throw new Error("目标目录已存在");
    await Te(c, f);
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
        const i = await ae.openPath(t);
        return { ok: !i, error: i || void 0 };
      }
      return ae.showItemInFolder(t), { ok: !0 };
    } catch (n) {
      return { ok: !1, error: n instanceof Error ? n.message : String(n) };
    }
  }), h.handle("unu:open-tilemap-editor", async (r, e) => rt(e)), h.handle("unu:tilemap-editor-update", async (r, e) => !A || A.isDestroyed() ? { ok: !1, error: "Main window not available" } : (A.webContents.send("unu:tilemap-editor-apply", e), W = { ...W || {}, ...e || {} }, { ok: !0 })), h.handle("unu:close-tilemap-editor", async () => (j && !j.isDestroyed() && j.close(), j = null, { ok: !0 })), h.handle("unu:open-code-editor", async (r, e) => nt(e)), h.handle("unu:code-editor-update", async (r, e) => !A || A.isDestroyed() ? { ok: !1, error: "Main window not available" } : (A.webContents.send("unu:code-editor-apply", e), _ = { ..._ || {}, ...e || {} }, { ok: !0 })), h.handle("unu:close-code-editor", async () => (S && !S.isDestroyed() && S.close(), S = null, { ok: !0 })), h.handle("unu:set-main-window-preset", async (r, e) => !A || A.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (xe(A, e), { ok: !0 })), fe(), y.on("activate", () => {
    G.getAllWindows().length === 0 && fe();
  });
});
y.on("window-all-closed", () => {
  process.platform !== "darwin" && y.quit();
});
