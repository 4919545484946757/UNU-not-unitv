import { app as x, ipcMain as h, dialog as S, shell as V, BrowserWindow as H, screen as de, nativeImage as he } from "electron";
import * as u from "node:fs/promises";
import * as G from "node:fs";
import s from "node:path";
import { fileURLToPath as ge } from "node:url";
const we = ge(import.meta.url), N = s.dirname(we);
let b = null, w = null, $ = null;
const O = /* @__PURE__ */ new Map();
function v(n) {
  return n.split(s.sep).join("/");
}
function ye(n) {
  const e = s.extname(n).toLowerCase();
  return n.endsWith(".anim.json") ? "animation" : n.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : n.endsWith(".scene.json") ? "scene" : n.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "script";
}
async function C(n) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((t) => u.mkdir(s.join(n, t), { recursive: !0 })));
}
async function W(n, e) {
  const t = s.join(n, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || s.basename(n),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await u.writeFile(t, JSON.stringify(i, null, 2), "utf-8"), i;
}
function xe() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}
`;
}
function je() {
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
function Pe() {
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
async function D(n) {
  const e = [
    { fileName: "ScriptRuntime.ts", content: xe() },
    { fileName: "InputState.ts", content: je() },
    { fileName: "AudioRuntime.ts", content: Pe() }
  ];
  let t = 0;
  for (const r of e) {
    const i = s.join(n, "assets", "scripts", r.fileName);
    await y(i) || (await u.mkdir(s.dirname(i), { recursive: !0 }), await u.writeFile(i, r.content, "utf-8"), t += 1);
  }
  return t;
}
function ve(n) {
  return n.replace(/\.scene\.json$/i, "");
}
function se(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
}
function Se(n) {
  return `${se(n) || "MainScene"}.scene.json`;
}
function Ae(n) {
  const e = se(n) || "MainScene", t = `scene_${e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "main"}`;
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
function J(n, e) {
  if (!n || typeof n != "object") return;
  if (Array.isArray(n)) {
    for (const r of n) J(r, e);
    return;
  }
  const t = n;
  if (t.actionType === "switchScene") {
    const r = String(t.targetScene || "").trim();
    r && e.add(r);
  }
  for (const r of Object.keys(t))
    J(t[r], e);
}
async function be(n, e) {
  const t = s.join(n, "scenes"), r = new Set(e.map((c) => c.toLowerCase())), i = /* @__PURE__ */ new Set();
  for (const c of e) {
    const o = s.join(t, c);
    try {
      const l = await u.readFile(o, "utf-8"), f = JSON.parse(l);
      J(f, i);
    } catch {
    }
  }
  let a = 0;
  for (const c of i) {
    const o = Se(c), l = o.toLowerCase();
    if (r.has(l)) continue;
    const f = s.join(t, o), m = Ae(c);
    await u.writeFile(f, m, "utf-8"), r.add(l), a += 1;
  }
  return a;
}
async function Q(n) {
  const e = s.join(n, "scenes");
  return (await u.readdir(e, { withFileTypes: !0 }).catch(() => [])).filter((r) => r.isFile() && r.name.toLowerCase().endsWith(".scene.json")).map((r) => r.name).sort((r, i) => r.localeCompare(i));
}
async function M(n, e) {
  const t = s.join(n, "project.json");
  let r = await Q(n);
  const i = await be(n, r);
  i > 0 && (r = await Q(n));
  const a = (e == null ? void 0 : e.trim()) || s.basename(n), c = (/* @__PURE__ */ new Date()).toISOString();
  let o = {};
  try {
    const g = await u.readFile(t, "utf-8"), E = JSON.parse(g);
    E && typeof E == "object" && (o = E);
  } catch {
    o = {};
  }
  const l = r.map((g) => ({
    file: g,
    name: ve(g)
  })), f = Array.isArray(o.sceneCatalog) ? o.sceneCatalog.map((g) => String((g == null ? void 0 : g.file) || (g == null ? void 0 : g.fileName) || "")).filter(Boolean) : [], m = l.map((g) => g.file), p = f.length !== m.length || f.some((g, E) => g !== m[E]), d = String(o.startupScene || "").trim(), j = r.length ? r.includes(d) ? d : r[0] : "", F = d !== j, P = {
    ...o,
    format: "unu-project",
    version: 1,
    name: String(o.name || e || "").trim() || a,
    createdAt: String(o.createdAt || "").trim() || c,
    updatedAt: c,
    sceneCatalogVersion: 1,
    sceneCatalog: l,
    startupScene: j
  }, A = !o.format || !o.version || !Array.isArray(o.sceneCatalog) || p || F || String(o.name || "").trim() !== P.name || i > 0;
  return A && await u.writeFile(t, JSON.stringify(P, null, 2), "utf-8"), {
    repaired: A,
    sceneCount: r.length,
    startupScene: j,
    createdByReference: i
  };
}
async function y(n) {
  try {
    return await u.access(n), !0;
  } catch {
    return !1;
  }
}
async function _(n) {
  const e = String(n || "").trim();
  if (!e || e === "sample-project" || s.isAbsolute(e)) return e;
  const t = e.replace(/\\/g, "/").replace(/^\/+/, "");
  if (x.isPackaged && t.toLowerCase().startsWith("sample-project-list/")) {
    const i = [
      s.join(process.resourcesPath, t),
      s.join(x.getAppPath(), t)
    ], a = s.join(x.getPath("userData"), "bundled-samples", s.basename(t));
    if (!(await y(s.join(a, "project.json")) && await y(s.join(a, "scenes")) && await y(s.join(a, "assets")))) {
      const o = await Fe(i);
      o && (await u.mkdir(s.dirname(a), { recursive: !0 }), await u.rm(a, { recursive: !0, force: !0 }), await u.cp(o, a, { recursive: !0, force: !0 }));
    }
    if (await y(a)) return a;
  }
  const r = [
    s.join(x.getAppPath(), t),
    s.join(process.cwd(), t),
    s.resolve(N, "..", t),
    s.resolve(t)
  ];
  for (const i of r)
    if (await y(i)) return i;
  return s.resolve(e);
}
async function Fe(n) {
  for (const e of n)
    if (await y(e)) return e;
  return "";
}
function ke() {
  const n = /* @__PURE__ */ new Date(), e = (i) => String(i).padStart(2, "0"), t = `${n.getFullYear()}${e(n.getMonth() + 1)}${e(n.getDate())}`, r = `${e(n.getHours())}${e(n.getMinutes())}`;
  return `UNUProject_${t}_${r}`;
}
function I(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function Z(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function ie(n) {
  const e = String(n || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!e || s.isAbsolute(e)) return "";
  const t = e.split("/").filter(Boolean);
  return t.some((r) => r === "..") ? "" : t.join("/");
}
function ee(n, e) {
  const t = s.resolve(n), r = ie(e);
  if (!r) return "";
  const i = s.resolve(t, r), a = s.relative(t, i);
  return a.startsWith("..") || s.isAbsolute(a) ? "" : i;
}
function ae(n) {
  const e = n.toLowerCase(), r = [".anim.json", ".atlas.json", ".scene.json", ".prefab.json"].find((a) => e.endsWith(a));
  if (r) return { base: n.slice(0, -r.length), ext: n.slice(n.length - r.length) };
  const i = s.extname(n);
  return { base: i ? n.slice(0, -i.length) : n, ext: i };
}
async function Ce(n) {
  if (!await y(n)) return n;
  const e = s.dirname(n), t = ae(s.basename(n));
  for (let r = 1; r < 1e3; r += 1) {
    const i = s.join(e, `${t.base}-${r}${t.ext}`);
    if (!await y(i)) return i;
  }
  throw new Error("无法生成可用的默认文件名，请手动输入文件名。");
}
function U(n) {
  return `${String(n || "").trim().replace(/\.scene\.json$/i, "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "MainScene"}.scene.json`;
}
async function k(n, e) {
  await y(n) && (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.cp(n, e, { recursive: !0, force: !0 }));
}
async function _e(n, e) {
  try {
    await u.rename(n, e);
    return;
  } catch (t) {
    const r = t == null ? void 0 : t.code;
    if (r !== "EPERM" && r !== "EXDEV" && r !== "EACCES")
      throw t;
  }
  await u.cp(n, e, {
    recursive: !0,
    force: !1,
    errorOnExist: !0
  });
  try {
    await u.rm(n, {
      recursive: !0,
      force: !1,
      maxRetries: 6,
      retryDelay: 120
    });
  } catch (t) {
    const r = t instanceof Error ? t.message : String(t);
    throw new Error(`Project files are busy. Please close occupying programs and retry. (${r})`);
  }
}
async function oe(n, e) {
  return await y(n) ? (await u.mkdir(s.dirname(e), { recursive: !0 }), await u.copyFile(n, e), !0) : !1;
}
function ce() {
  return [
    s.resolve(N, "..", "assets-for-sample"),
    s.resolve(process.cwd(), "assets-for-sample")
  ].find((e) => G.existsSync(e)) || "";
}
const le = [
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
async function Re(n) {
  const e = s.join(n, "assets", "scripts");
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
    Object.entries(t).map(([r, i]) => u.writeFile(s.join(e, r), i, "utf-8"))
  );
}
async function Ne(n) {
  const e = s.join(n, "assets", "images");
  await u.mkdir(e, { recursive: !0 });
  const t = B("player"), r = B("enemy"), i = B("chest");
  await Promise.all([
    u.writeFile(s.join(e, "player.png"), t),
    u.writeFile(s.join(e, "enemy.png"), r),
    u.writeFile(s.join(e, "chest.png"), i)
  ]);
}
async function Ee(n) {
  const e = ce();
  if (!e) return !1;
  let t = 0;
  for (const r of le)
    await oe(s.join(e, r.from), s.join(n, r.to)) && (t += 1);
  return t > 0;
}
async function Te(n) {
  const e = s.join(n, "assets", "animations");
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
  }, r = {
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
    u.writeFile(s.join(e, "TorchSheet.atlas.json"), JSON.stringify(r, null, 2), "utf-8")
  ]);
}
async function $e(n) {
  const e = s.join(n, "assets", "audio");
  await u.mkdir(e, { recursive: !0 }), await u.writeFile(s.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function De(n) {
  const e = await Ee(n);
  await Promise.all([
    Re(n),
    ...e ? [] : [Ne(n)],
    Te(n),
    $e(n)
  ]);
}
function z(n, e) {
  const t = String(n || "").trim();
  if (!t) return "";
  if (t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  let r = t.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  const i = v(s.resolve(e)), a = i.toLowerCase(), c = r.toLowerCase();
  c.startsWith(`${a}/`) && (r = r.slice(i.length + 1));
  const l = c.lastIndexOf("/assets/");
  return l >= 0 && (r = r.slice(l + 1)), r = r.replace(/^\/+/, ""), r.toLowerCase().startsWith("dist/assets/") && (r = r.slice(5)), r.toLowerCase().startsWith("dist-electron/assets/") && (r = r.slice(14)), r;
}
const ue = /* @__PURE__ */ new Set([
  "texturePath",
  "animationAssetPath",
  "sourceAtlasPath",
  "scriptPath",
  "clipPath",
  "imagePath",
  "path",
  "relativePath"
]), fe = /* @__PURE__ */ new Set(["framePaths", "textureCycle"]);
function X(n) {
  const e = z(n, "");
  if (!e) return !1;
  const t = e.toLowerCase();
  return !(t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("builtin://") || t.startsWith("custom://") || t.startsWith("javascript:") || t.startsWith("mailto:") || t.startsWith("about:"));
}
function R(n) {
  return q(n).toLowerCase();
}
function Me(n) {
  const e = n.toLowerCase();
  return e.endsWith(".scene.json") ? "scene" : e.endsWith(".prefab.json") ? "prefab" : e.endsWith(".anim.json") ? "animation" : e.endsWith(".atlas.json") ? "atlas" : "json";
}
function Ie(n, e, t, r, i) {
  let a = !1;
  const c = (l, f, m, p) => {
    const d = z(m, e);
    X(d) && t.push({ sourceFile: r, sourceKind: i, keyPath: p, ref: d }), d !== m && (l[f] = d, a = !0);
  }, o = (l, f = "$") => {
    if (!l || typeof l != "object") return;
    if (Array.isArray(l)) {
      l.forEach((p, d) => o(p, `${f}[${d}]`));
      return;
    }
    const m = l;
    for (const [p, d] of Object.entries(m)) {
      const j = `${f}.${p}`;
      if (typeof d == "string" && ue.has(p)) {
        c(m, p, d, j);
        continue;
      }
      if (Array.isArray(d) && fe.has(p)) {
        const F = d.map((P) => {
          if (typeof P != "string") return P;
          const A = z(P, e);
          return X(A) && t.push({ sourceFile: r, sourceKind: i, keyPath: j, ref: A }), A !== P && (a = !0), A;
        });
        m[p] = F;
        continue;
      }
      if (d && typeof d == "object" && p === "tileTextureMap" && !Array.isArray(d)) {
        const F = d;
        for (const [P, A] of Object.entries(F)) {
          if (typeof A != "string") continue;
          const g = z(A, e);
          X(g) && t.push({ sourceFile: r, sourceKind: i, keyPath: `${j}.${P}`, ref: g }), g !== A && (F[P] = g, a = !0);
        }
      }
      o(d, j);
    }
  };
  return o(n), a;
}
function ze(n, e) {
  let t = !1;
  const r = (a) => {
    const c = q(a);
    return e.get(R(c)) || a;
  }, i = (a) => {
    if (!a || typeof a != "object") return;
    if (Array.isArray(a)) {
      for (const o of a) i(o);
      return;
    }
    const c = a;
    for (const [o, l] of Object.entries(c)) {
      if (typeof l == "string" && ue.has(o)) {
        const f = r(l);
        f !== l && (c[o] = f, t = !0);
        continue;
      }
      if (Array.isArray(l) && fe.has(o)) {
        const f = l.map((m) => {
          if (typeof m != "string") return m;
          const p = r(m);
          return p !== m && (t = !0), p;
        });
        c[o] = f;
        continue;
      }
      if (l && typeof l == "object" && o === "tileTextureMap" && !Array.isArray(l)) {
        const f = l;
        for (const [m, p] of Object.entries(f)) {
          if (typeof p != "string") continue;
          const d = r(p);
          d !== p && (f[m] = d, t = !0);
        }
      }
      i(l);
    }
  };
  return i(n), t;
}
async function Le(n) {
  const e = [], t = ["scenes", "prefabs", "assets"], r = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const c of a) {
      const o = s.join(i, c.name);
      if (c.isDirectory()) {
        await r(o);
        continue;
      }
      if (!c.isFile() || !c.name.toLowerCase().endsWith(".json")) continue;
      const f = v(s.relative(n, o));
      f.toLowerCase() !== "project.json" && e.push({ fullPath: o, relativePath: f, kind: Me(c.name) });
    }
  };
  for (const i of t)
    await r(s.join(n, i));
  return e;
}
async function te(n) {
  const e = await Le(n), t = [];
  let r = 0, i = 0;
  for (const a of e) {
    const c = await u.readFile(a.fullPath, "utf-8").catch(() => "");
    if (!c) continue;
    let o = null;
    try {
      o = JSON.parse(String(c).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    Ie(o, n, t, a.relativePath, a.kind) && (r += 1, a.kind === "scene" && (i += 1), await u.writeFile(a.fullPath, JSON.stringify(o, null, 2), "utf-8"));
  }
  return { refs: t, normalizedFiles: r, normalizedSceneFiles: i, dependencyFiles: e };
}
async function Oe(n) {
  const e = /* @__PURE__ */ new Map(), t = s.join(n, "assets"), r = async (i) => {
    const a = await u.readdir(i, { withFileTypes: !0 }).catch(() => []);
    for (const c of a) {
      const o = s.join(i, c.name);
      if (c.isDirectory()) {
        await r(o);
        continue;
      }
      if (!c.isFile()) continue;
      const l = v(s.relative(n, o)), f = s.basename(c.name).toLowerCase(), m = e.get(f) || [];
      m.push(l), e.set(f, m);
    }
  };
  return await r(t), { byBasename: e };
}
async function Y(n, e) {
  const t = [], r = /* @__PURE__ */ new Map();
  for (const i of e) {
    const a = R(i.ref);
    if (!r.has(a)) {
      const c = await me(n, i.ref);
      r.set(a, !!c);
    }
    r.get(a) || t.push(i);
  }
  return t;
}
async function We(n, e, t) {
  if (!e.length) return { relinkedAssets: 0, relinkedFiles: 0 };
  const r = await Oe(n), i = /* @__PURE__ */ new Map(), a = Array.from(new Map(e.map((o) => [R(o.ref), o.ref])).values());
  for (const o of a) {
    const l = s.basename(o).toLowerCase(), f = (r.byBasename.get(l) || []).filter((m) => R(m) !== R(o));
    f.length === 1 && i.set(R(o), f[0]);
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
    ze(f, i) && (c += 1, await u.writeFile(o.fullPath, JSON.stringify(f, null, 2), "utf-8"));
  }
  return { relinkedAssets: i.size, relinkedFiles: c };
}
async function Ue(n, e) {
  if (!e.length) return 0;
  const t = ce();
  if (!t) return 0;
  const r = new Map(le.map((a) => [a.to.toLowerCase(), a.from]));
  let i = 0;
  for (const a of e) {
    const c = r.get(a.toLowerCase());
    if (!c) continue;
    await oe(s.join(t, c), s.join(n, a)) && (i += 1);
  }
  return i;
}
async function T(n) {
  let e = await te(n);
  const t = await Y(n, e.refs), r = Array.from(new Set(t.map((m) => m.ref))), i = await Ue(n, r), a = i > 0 ? await Y(n, e.refs) : t, c = await We(n, a, e.dependencyFiles);
  if (i > 0 || c.relinkedAssets > 0) {
    const m = await te(n);
    e = {
      ...m,
      normalizedFiles: e.normalizedFiles + m.normalizedFiles,
      normalizedSceneFiles: e.normalizedSceneFiles + m.normalizedSceneFiles
    };
  }
  const o = await Y(n, e.refs), l = new Set(e.refs.map((m) => R(m.ref))).size, f = new Set(o.map((m) => R(m.ref))).size;
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
function B(n) {
  const t = n === "player" ? { bg: "#0E2A47", accent: "#56CCF2", stroke: "#BDEBFF", symbol: "P" } : n === "enemy" ? { bg: "#3A1518", accent: "#EB5757", stroke: "#FFC4C4", symbol: "E" } : { bg: "#3A2A11", accent: "#F2C94C", stroke: "#FFE8A3", symbol: "C" }, r = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
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
  return he.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r)}`).toPNG();
}
async function K(n, e) {
  const r = (await u.readdir(n, { withFileTypes: !0 })).sort((i, a) => Number(a.isDirectory()) - Number(i.isDirectory()) || i.name.localeCompare(a.name));
  return Promise.all(
    r.map(async (i) => {
      const a = s.join(n, i.name), c = v(s.relative(e, a)) || ".", o = i.isDirectory(), l = {
        id: c,
        name: i.name,
        type: o ? "folder" : ye(i.name),
        path: c,
        absolutePath: a,
        children: []
      };
      return o && (l.children = await K(a, e)), l;
    })
  );
}
async function Xe(n) {
  const e = s.extname(n).toLowerCase(), t = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", r = await u.readFile(n);
  return `data:${t};base64,${r.toString("base64")}`;
}
function q(n) {
  return String(n || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}
async function me(n, e) {
  const t = q(e);
  if (!t) return null;
  const r = x.getAppPath(), i = t.startsWith("assets/") ? t.slice(7) : t, a = [
    s.join(n, t),
    s.join(n, "assets", i),
    s.join(r, t),
    s.join(r, "assets", i),
    s.join(r, "dist", t),
    s.join(r, "dist", "assets", i),
    s.join(r, "dist-electron", t),
    s.join(r, "dist-electron", "assets", i),
    s.join(N, t),
    s.join(N, "assets", i)
  ];
  for (const c of a) {
    const o = await u.stat(c).catch(() => null);
    if (o != null && o.isFile()) return c;
  }
  return null;
}
async function ne(n, e, t) {
  await C(n);
  const r = s.join(n, t);
  await u.mkdir(r, { recursive: !0 });
  const i = [];
  for (const a of e) {
    const c = s.basename(a), o = s.join(r, c);
    await u.copyFile(a, o), i.push({
      fileName: c,
      relativePath: v(s.relative(n, o))
    });
  }
  return i;
}
async function Ye(n) {
  let e = n.filePath;
  if (!e) {
    const t = s.join(n.projectRoot || x.getPath("documents"), n.subdir || "", n.suggestedName || "Asset.json"), r = await S.showSaveDialog({
      title: n.title || "保存文本资源",
      defaultPath: t,
      filters: [{ name: n.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (r.canceled || !r.filePath) return null;
    e = r.filePath;
  }
  return await u.mkdir(s.dirname(e), { recursive: !0 }), await u.writeFile(e, n.content, "utf-8"), {
    filePath: e,
    name: s.basename(e),
    relativePath: n.projectRoot ? v(s.relative(n.projectRoot, e)) : void 0
  };
}
async function Be(n) {
  var i;
  const e = await S.showOpenDialog({
    title: n.title || "打开文本资源",
    defaultPath: n.projectRoot ? s.join(n.projectRoot, n.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (i = n.extensions) != null && i.length ? n.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const t = e.filePaths[0], r = await u.readFile(t, "utf-8");
  return {
    filePath: t,
    name: s.basename(t),
    relativePath: n.projectRoot ? v(s.relative(n.projectRoot, t)) : void 0,
    content: r
  };
}
function L(n) {
  const e = O.get(n);
  e && (e.timer && clearTimeout(e.timer), e.watcher.close(), O.delete(n));
}
function Ge(n) {
  const e = v(String(n || "")).toLowerCase();
  return e.endsWith(".ts") || e.endsWith(".js") || e.endsWith(".mjs") || e.endsWith(".json");
}
async function Je(n, e) {
  L(n.id);
  const t = await _(e);
  if (!t || t === "sample-project") return { ok: !1, error: "sample-project cannot be watched" };
  const r = s.join(t, "assets", "scripts");
  await u.mkdir(r, { recursive: !0 });
  const i = (c, o) => {
    if (!o || !Ge(String(o))) return;
    const l = O.get(n.id);
    if (!l) return;
    l.timer && clearTimeout(l.timer);
    const f = v(String(o));
    l.timer = setTimeout(() => {
      if (n.isDestroyed()) {
        L(n.id);
        return;
      }
      n.send("unu:project-script-changed", {
        projectRoot: l.projectRoot,
        relativePath: v(s.join("assets", "scripts", f)),
        changedAt: Date.now()
      });
    }, 120);
  };
  let a;
  try {
    a = G.watch(r, { recursive: !0 }, i);
  } catch {
    a = G.watch(r, i);
  }
  return O.set(n.id, { watcher: a, timer: null, projectRoot: t }), n.once("destroyed", () => L(n.id)), { ok: !0 };
}
function re() {
  const n = new H({
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
  pe(n, "launcher"), x.isPackaged ? n.loadFile(s.join(x.getAppPath(), "dist", "index.html")) : (n.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && n.webContents.openDevTools({ mode: "detach" })), b = n, n.on("closed", () => {
    b === n && (b = null);
  });
}
function pe(n, e) {
  if (!n || n.isDestroyed()) return;
  const t = de.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const a = Math.min(1680, Math.max(1200, t.width - 120)), c = Math.min(980, Math.max(760, t.height - 100));
    n.setSize(a, c, !0), n.center();
    return;
  }
  const r = Math.min(1180, Math.max(980, t.width - 220)), i = Math.min(760, Math.max(640, t.height - 180));
  n.setSize(r, i, !0), n.center();
}
function Ke(n) {
  x.isPackaged ? n.loadFile(s.join(x.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : n.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function He(n) {
  return $ = n || null, b ? (!w || w.isDestroyed() ? (w = new H({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: b,
    webPreferences: {
      preload: s.join(N, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), Ke(w), w.on("closed", () => {
    w = null;
  })) : (w.isMinimized() && w.restore(), w.focus()), w.webContents.once("did-finish-load", () => {
    !w || w.isDestroyed() || w.webContents.send("unu:tilemap-editor-init", $);
  }), w.webContents.isLoadingMainFrame() ? { ok: !0 } : (w.webContents.send("unu:tilemap-editor-init", $), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
function qe(n) {
  const e = /* @__PURE__ */ new Date(), t = (i) => String(i).padStart(2, "0"), r = [
    e.getFullYear(),
    t(e.getMonth() + 1),
    t(e.getDate()),
    "-",
    t(e.getHours()),
    t(e.getMinutes()),
    t(e.getSeconds())
  ].join("");
  return `${I(n) || "UNUGame"}-web-${r}`;
}
async function Ve() {
  const n = x.isPackaged ? [
    s.join(process.resourcesPath, "dist"),
    s.join(process.resourcesPath, "app.asar.unpacked", "dist"),
    s.join(process.cwd(), "dist")
  ] : [
    s.join(process.cwd(), "dist"),
    s.resolve(N, "..", "dist"),
    s.join(N, "dist"),
    s.join(x.getAppPath(), "dist")
  ];
  for (const e of n)
    if (!e.includes(".asar") && await y(s.join(e, "index.html")))
      return e;
  throw new Error(
    x.isPackaged ? "未找到可复制的 Web 构建目录 resources/dist，请重新打包应用后再导出。" : "未找到 Web 构建目录 dist，请先执行 npm run build。"
  );
}
async function Qe(n) {
  if (!await y(n)) return 0;
  let e = 0;
  const t = async (r) => {
    const i = await u.readdir(r, { withFileTypes: !0 }).catch(() => []);
    for (const a of i) {
      const c = s.join(r, a.name);
      a.isDirectory() ? await t(c) : a.isFile() && (e += 1);
    }
  };
  return await t(n), e;
}
async function Ze(n, e) {
  let t = await u.readFile(n, "utf-8");
  t = t.replace(/(src|href)="\/assets\//g, '$1="./assets/').replace(/<title>.*?<\/title>/i, `<title>${tt(e || "UNU Game")}</title>`), t.includes("__UNU_GAME_EXPORT__") || (t = t.replace(
    /<head([^>]*)>/i,
    `<head$1>
    <script>window.__UNU_GAME_EXPORT__ = true;<\/script>`
  )), await u.writeFile(n, t, "utf-8");
}
async function et(n, e) {
  const t = [
    "@echo off",
    "setlocal",
    'cd /d "%~dp0"',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PLAY_GAME.ps1"',
    "if errorlevel 1 pause",
    ""
  ].join(`\r
`), r = String.raw`$ErrorActionPreference = "Stop"
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
  await u.writeFile(s.join(n, "PLAY_GAME.bat"), t, "utf-8"), await u.writeFile(s.join(n, "PLAY_GAME.ps1"), r, "utf-8"), await u.writeFile(s.join(n, "EXPORT_README.md"), i, "utf-8");
}
function tt(n) {
  return String(n).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
process.on("unhandledRejection", (n) => {
  console.error("[UNU][main] Unhandled promise rejection:", n);
});
process.on("uncaughtException", (n) => {
  console.error("[UNU][main] Uncaught exception:", n);
});
x.whenReady().then(() => {
  h.handle("unu:create-project", async () => {
    const n = await S.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const e = n.filePaths[0];
    return await C(e), await W(e), {
      rootPath: e,
      name: s.basename(e),
      created: !0
    };
  }), h.handle("unu:create-project-v2", async (n, e) => {
    let t = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!t) {
      const o = await S.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (o.canceled || o.filePaths.length === 0) return null;
      t = o.filePaths[0];
    }
    const r = await u.stat(t).catch(() => null);
    if (!(r != null && r.isDirectory()))
      throw new Error("无效的项目目录");
    const i = I(e == null ? void 0 : e.projectName) || ke(), a = s.join(t, i);
    if (await y(a))
      throw new Error(`目标目录已存在: ${a}`);
    await C(a), await W(a, i), await D(a);
    const c = await T(a);
    return {
      rootPath: a,
      name: i,
      parentDir: t,
      created: !0,
      integrity: c
    };
  }), h.handle("unu:pick-directory", async (n, e) => {
    const t = await S.showOpenDialog({
      title: (e == null ? void 0 : e.title) || "选择目标目录",
      defaultPath: e == null ? void 0 : e.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0];
    return {
      dirPath: r,
      name: s.basename(r)
    };
  }), h.handle("unu:pick-project-folder", async () => {
    const n = await S.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const e = n.filePaths[0];
    return await C(e), {
      rootPath: e,
      name: s.basename(e)
    };
  }), h.handle("unu:save-project-as", async (n, e) => {
    const t = await S.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = s.resolve(r), a = e.sourceProjectRoot ? s.resolve(e.sourceProjectRoot) : "";
    if (a && a !== "sample-project" && a === i)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await C(r);
    const c = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !c && a && await y(a) ? (await k(s.join(a, "assets"), s.join(r, "assets")), await k(s.join(a, "scenes"), s.join(r, "scenes")), await k(s.join(a, "prefabs"), s.join(r, "prefabs")), await k(s.join(a, "project.json"), s.join(r, "project.json"))) : await De(r), await W(r, e.projectName), await D(r);
    let o;
    const l = Array.isArray(e.sceneFiles) ? e.sceneFiles : [];
    if (l.length > 0) {
      const m = /* @__PURE__ */ new Set();
      for (const p of l) {
        const d = U(p.fileName);
        let j = d, F = 2;
        for (; m.has(j.toLowerCase()); )
          j = d.replace(/\.scene\.json$/i, `_${F}.scene.json`), F += 1;
        m.add(j.toLowerCase());
        const P = s.join(r, "scenes", j);
        await u.mkdir(s.dirname(P), { recursive: !0 }), await u.writeFile(P, String(p.content || ""), "utf-8"), o || (o = P);
        const A = U(e.currentSceneName);
        j.toLowerCase() === A.toLowerCase() && (o = P);
      }
    } else if (e.currentSceneContent) {
      const m = U(e.currentSceneName);
      o = s.join(r, "scenes", m), await u.mkdir(s.dirname(o), { recursive: !0 }), await u.writeFile(o, e.currentSceneContent, "utf-8");
    }
    await M(r, e.projectName);
    const f = await T(r);
    return {
      rootPath: r,
      name: s.basename(r),
      sceneFilePath: o,
      fromSample: c,
      integrity: f
    };
  }), h.handle("unu:export-game", async (n, e) => {
    const t = await _(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project" || !await y(t))
      throw new Error("请先打开一个本地项目，再导出游戏。");
    await C(t), await D(t);
    const r = I(e == null ? void 0 : e.projectName) || s.basename(t), i = await M(t, r), a = await T(t), c = await S.showOpenDialog({
      title: "导出 Web 游戏到目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (c.canceled || c.filePaths.length === 0) return null;
    const o = await Ve(), l = s.join(c.filePaths[0], qe(r));
    await u.mkdir(l, { recursive: !0 }), await u.cp(o, l, { recursive: !0, force: !0 }), await k(s.join(t, "project.json"), s.join(l, "project.json")), await k(s.join(t, "assets"), s.join(l, "assets")), await k(s.join(t, "scenes"), s.join(l, "scenes")), await k(s.join(t, "prefabs"), s.join(l, "prefabs"));
    const f = s.join(l, "index.html");
    await Ze(f, r), await et(l, r);
    const m = await Qe(s.join(l, "assets")), p = {
      format: "unu-web-export",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      projectName: r,
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
  }), h.handle("unu:scan-project", async (n, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    const t = await _(e);
    await C(t), await D(t);
    const r = s.basename(t), i = await M(t, r), a = await T(t), c = await K(t, t);
    return {
      rootPath: t,
      name: r,
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
  }), h.handle("unu:check-asset-integrity", async (n, e) => {
    const t = await _(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再检查资源依赖。");
    await C(t);
    const r = await T(t), i = await K(t, t);
    return {
      rootPath: t,
      name: s.basename(t),
      tree: i,
      assetIntegrityRepaired: r.repaired,
      normalizedSceneFiles: r.normalizedSceneFiles,
      normalizedFiles: r.normalizedFiles,
      copiedAssets: r.copiedAssets,
      relinkedAssets: r.relinkedAssets,
      relinkedFiles: r.relinkedFiles,
      checkedAssetRefs: r.checkedAssetRefs,
      resolvedAssets: r.resolvedAssets,
      unresolvedAssets: r.unresolvedAssets,
      unresolvedRefs: r.unresolvedRefs
    };
  }), h.handle("unu:watch-project-scripts", async (n, e) => Je(n.sender, String((e == null ? void 0 : e.projectRoot) || "").trim())), h.handle("unu:unwatch-project-scripts", async (n) => (L(n.sender.id), { ok: !0 })), h.handle("unu:save-scene", async (n, e) => {
    let t = e.filePath;
    if (!t) {
      const r = s.join(e.projectRoot || x.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), i = await S.showSaveDialog({
        title: "保存场景",
        defaultPath: r,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await u.mkdir(s.dirname(t), { recursive: !0 }), await u.writeFile(t, e.content, "utf-8"), e.projectRoot && await M(e.projectRoot, s.basename(e.projectRoot)), {
      filePath: t,
      name: s.basename(t)
    };
  }), h.handle("unu:open-scene", async (n, e) => {
    const t = await S.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? s.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = await u.readFile(r, "utf-8");
    return {
      filePath: r,
      name: s.basename(r),
      content: i
    };
  }), h.handle("unu:read-asset-data-url", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    try {
      const t = await _(e.projectRoot), r = await me(t, e.relativePath);
      return r ? { dataUrl: await Xe(r) } : null;
    } catch (t) {
      const r = t instanceof Error ? t.message : String(t);
      return console.warn("[UNU][main] read-asset-data-url fallback failed:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        message: r
      }), null;
    }
  }), h.handle("unu:import-images", async (n, e) => {
    if (!e.projectRoot) return null;
    const t = await S.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ne(e.projectRoot, t.filePaths, "assets/images") };
  }), h.handle("unu:import-audios", async (n, e) => {
    if (!e.projectRoot) return null;
    const t = await S.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await ne(e.projectRoot, t.filePaths, "assets/audio") };
  }), h.handle("unu:save-prefab", async (n, e) => {
    let t = e.filePath;
    if (!t) {
      const r = s.join(e.projectRoot || x.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), i = await S.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: r,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await u.mkdir(s.dirname(t), { recursive: !0 }), await u.writeFile(t, e.content, "utf-8"), {
      filePath: t,
      name: s.basename(t),
      relativePath: e.projectRoot ? v(s.relative(e.projectRoot, t)) : void 0
    };
  }), h.handle("unu:open-prefab", async (n, e) => {
    const t = await S.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? s.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = await u.readFile(r, "utf-8");
    return {
      filePath: r,
      name: s.basename(r),
      relativePath: e.projectRoot ? v(s.relative(e.projectRoot, r)) : void 0,
      content: i
    };
  }), h.handle("unu:save-text-asset", async (n, e) => Ye(e)), h.handle("unu:open-text-asset", async (n, e) => Be(e)), h.handle("unu:create-text-asset-in-folder", async (n, e) => {
    const t = await _(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再新建文件。");
    const r = ie((e == null ? void 0 : e.folderPath) || "assets"), i = ee(t, r);
    if (!i) throw new Error("目标目录不在当前项目内。");
    const a = await u.stat(i).catch(() => null);
    if (!a || !a.isDirectory()) throw new Error("目标目录不存在。");
    const c = !!String((e == null ? void 0 : e.fileName) || "").trim(), o = Z(e == null ? void 0 : e.fileName) || "NewFile.ts", l = s.join(i, o), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标文件不在当前项目内。");
    const p = c ? l : await Ce(l);
    if (c && await y(p)) throw new Error("同名文件已存在。");
    return await u.writeFile(p, (e == null ? void 0 : e.content) ?? "", "utf-8"), {
      filePath: p,
      name: s.basename(p),
      relativePath: v(s.relative(t, p))
    };
  }), h.handle("unu:rename-asset", async (n, e) => {
    const t = await _(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再重命名资源。");
    const r = ee(t, (e == null ? void 0 : e.relativePath) || "");
    if (!r) throw new Error("源资源不在当前项目内。");
    const i = await u.stat(r).catch(() => null);
    if (!i) throw new Error("源资源不存在。");
    const a = Z(e == null ? void 0 : e.nextName);
    if (!a) throw new Error("资源名称不能为空。");
    const c = s.basename(r), o = i.isDirectory() || s.extname(a) ? a : `${a}${ae(c).ext}`, l = s.join(s.dirname(r), o), f = s.resolve(t), m = s.relative(f, s.resolve(l));
    if (m.startsWith("..") || s.isAbsolute(m)) throw new Error("目标资源不在当前项目内。");
    if (s.resolve(l) === s.resolve(r))
      return {
        filePath: r,
        name: c,
        relativePath: v(s.relative(t, r))
      };
    if (await y(l)) throw new Error("同名资源已存在。");
    return await u.rename(r, l), {
      filePath: l,
      name: s.basename(l),
      relativePath: v(s.relative(t, l))
    };
  }), h.handle("unu:read-text-asset", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const t = await _(e.projectRoot), r = s.join(t, e.relativePath), i = await u.readFile(r, "utf-8");
    return { filePath: r, name: s.basename(r), relativePath: e.relativePath, content: i };
  }), h.handle("unu:rename-project", async (n, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim(), r = String((e == null ? void 0 : e.nextName) || "").trim(), i = I(r);
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
    if (await y(f))
      throw new Error("目标目录已存在");
    await _e(c, f);
    const m = s.join(f, "project.json");
    try {
      const p = await u.readFile(m, "utf-8"), d = JSON.parse(p), j = {
        ...d && typeof d == "object" ? d : {},
        format: "unu-project",
        version: 1,
        name: i,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await u.writeFile(m, JSON.stringify(j, null, 2), "utf-8");
    } catch {
    }
    return {
      rootPath: f,
      name: i
    };
  }), h.handle("unu:delete-project", async (n, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim();
    if (!t) return { ok: !1 };
    if (t === "sample-project")
      throw new Error("示例项目不支持删除");
    const r = s.resolve(t), i = await u.stat(r).catch(() => null);
    return !i || !i.isDirectory() ? { ok: !1, error: "项目目录不存在" } : (await u.rm(r, { recursive: !0, force: !0 }), { ok: !0 });
  }), h.handle("unu:reveal-in-folder", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const t = s.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: t
      });
      const r = await u.stat(t).catch(() => null);
      if (!r)
        return { ok: !1, error: `Path not found: ${t}` };
      if (e.isDirectory || r.isDirectory()) {
        const i = await V.openPath(t);
        return { ok: !i, error: i || void 0 };
      }
      return V.showItemInFolder(t), { ok: !0 };
    } catch (r) {
      return { ok: !1, error: r instanceof Error ? r.message : String(r) };
    }
  }), h.handle("unu:open-tilemap-editor", async (n, e) => He(e)), h.handle("unu:tilemap-editor-update", async (n, e) => !b || b.isDestroyed() ? { ok: !1, error: "Main window not available" } : (b.webContents.send("unu:tilemap-editor-apply", e), $ = { ...$ || {}, ...e || {} }, { ok: !0 })), h.handle("unu:close-tilemap-editor", async () => (w && !w.isDestroyed() && w.close(), w = null, { ok: !0 })), h.handle("unu:set-main-window-preset", async (n, e) => !b || b.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (pe(b, e), { ok: !0 })), re(), x.on("activate", () => {
    H.getAllWindows().length === 0 && re();
  });
});
x.on("window-all-closed", () => {
  process.platform !== "darwin" && x.quit();
});
