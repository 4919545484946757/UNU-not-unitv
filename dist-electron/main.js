import { app as x, ipcMain as p, dialog as j, shell as B, BrowserWindow as Y, screen as ae, nativeImage as ie } from "electron";
import * as o from "node:fs/promises";
import * as se from "node:fs";
import a from "node:path";
import { fileURLToPath as oe } from "node:url";
const ce = oe(import.meta.url), C = a.dirname(ce);
let S = null, h = null, T = null;
function b(n) {
  return n.split(a.sep).join("/");
}
function le(n) {
  const e = a.extname(n).toLowerCase();
  return n.endsWith(".anim.json") ? "animation" : n.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : n.endsWith(".scene.json") ? "scene" : n.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "script";
}
async function F(n) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((t) => o.mkdir(a.join(n, t), { recursive: !0 })));
}
async function I(n, e) {
  const t = a.join(n, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || a.basename(n),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await o.writeFile(t, JSON.stringify(i, null, 2), "utf-8"), i;
}
function ue() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}
`;
}
function me() {
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
function fe() {
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
    { fileName: "ScriptRuntime.ts", content: ue() },
    { fileName: "InputState.ts", content: me() },
    { fileName: "AudioRuntime.ts", content: fe() }
  ];
  let t = 0;
  for (const r of e) {
    const i = a.join(n, "assets", "scripts", r.fileName);
    await w(i) || (await o.mkdir(a.dirname(i), { recursive: !0 }), await o.writeFile(i, r.content, "utf-8"), t += 1);
  }
  return t;
}
function pe(n) {
  return n.replace(/\.scene\.json$/i, "");
}
function q(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
}
function de(n) {
  return `${q(n) || "MainScene"}.scene.json`;
}
function ge(n) {
  const e = q(n) || "MainScene", t = `scene_${e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "main"}`;
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
function W(n, e) {
  if (!n || typeof n != "object") return;
  if (Array.isArray(n)) {
    for (const r of n) W(r, e);
    return;
  }
  const t = n;
  if (t.actionType === "switchScene") {
    const r = String(t.targetScene || "").trim();
    r && e.add(r);
  }
  for (const r of Object.keys(t))
    W(t[r], e);
}
async function he(n, e) {
  const t = a.join(n, "scenes"), r = new Set(e.map((l) => l.toLowerCase())), i = /* @__PURE__ */ new Set();
  for (const l of e) {
    const c = a.join(t, l);
    try {
      const u = await o.readFile(c, "utf-8"), f = JSON.parse(u);
      W(f, i);
    } catch {
    }
  }
  let s = 0;
  for (const l of i) {
    const c = de(l), u = c.toLowerCase();
    if (r.has(u)) continue;
    const f = a.join(t, c), m = ge(l);
    await o.writeFile(f, m, "utf-8"), r.add(u), s += 1;
  }
  return s;
}
async function z(n) {
  const e = a.join(n, "scenes");
  return (await o.readdir(e, { withFileTypes: !0 }).catch(() => [])).filter((r) => r.isFile() && r.name.toLowerCase().endsWith(".scene.json")).map((r) => r.name).sort((r, i) => r.localeCompare(i));
}
async function R(n, e) {
  const t = a.join(n, "project.json");
  let r = await z(n);
  const i = await he(n, r);
  i > 0 && (r = await z(n));
  const s = (e == null ? void 0 : e.trim()) || a.basename(n), l = (/* @__PURE__ */ new Date()).toISOString();
  let c = {};
  try {
    const P = await o.readFile(t, "utf-8"), E = JSON.parse(P);
    E && typeof E == "object" && (c = E);
  } catch {
    c = {};
  }
  const u = r.map((P) => ({
    file: P,
    name: pe(P)
  })), f = Array.isArray(c.sceneCatalog) ? c.sceneCatalog.map((P) => String((P == null ? void 0 : P.file) || (P == null ? void 0 : P.fileName) || "")).filter(Boolean) : [], m = u.map((P) => P.file), g = f.length !== m.length || f.some((P, E) => P !== m[E]), y = String(c.startupScene || "").trim(), d = r.length ? r.includes(y) ? y : r[0] : "", v = y !== d, _ = {
    ...c,
    format: "unu-project",
    version: 1,
    name: String(c.name || e || "").trim() || s,
    createdAt: String(c.createdAt || "").trim() || l,
    updatedAt: l,
    sceneCatalogVersion: 1,
    sceneCatalog: u,
    startupScene: d
  }, $ = !c.format || !c.version || !Array.isArray(c.sceneCatalog) || g || v || String(c.name || "").trim() !== _.name || i > 0;
  return $ && await o.writeFile(t, JSON.stringify(_, null, 2), "utf-8"), {
    repaired: $,
    sceneCount: r.length,
    startupScene: d,
    createdByReference: i
  };
}
async function w(n) {
  try {
    return await o.access(n), !0;
  } catch {
    return !1;
  }
}
async function N(n) {
  const e = String(n || "").trim();
  if (!e || e === "sample-project" || a.isAbsolute(e)) return e;
  const t = e.replace(/\\/g, "/").replace(/^\/+/, "");
  if (x.isPackaged && t.toLowerCase().startsWith("sample-project-list/")) {
    const i = [
      a.join(process.resourcesPath, t),
      a.join(x.getAppPath(), t)
    ], s = a.join(x.getPath("userData"), "bundled-samples", a.basename(t));
    if (!(await w(a.join(s, "project.json")) && await w(a.join(s, "scenes")) && await w(a.join(s, "assets")))) {
      const c = await we(i);
      c && (await o.mkdir(a.dirname(s), { recursive: !0 }), await o.rm(s, { recursive: !0, force: !0 }), await o.cp(c, s, { recursive: !0, force: !0 }));
    }
    if (await w(s)) return s;
  }
  const r = [
    a.join(x.getAppPath(), t),
    a.join(process.cwd(), t),
    a.resolve(C, "..", t),
    a.resolve(t)
  ];
  for (const i of r)
    if (await w(i)) return i;
  return a.resolve(e);
}
async function we(n) {
  for (const e of n)
    if (await w(e)) return e;
  return "";
}
function xe() {
  const n = /* @__PURE__ */ new Date(), e = (i) => String(i).padStart(2, "0"), t = `${n.getFullYear()}${e(n.getMonth() + 1)}${e(n.getDate())}`, r = `${e(n.getHours())}${e(n.getMinutes())}`;
  return `UNUProject_${t}_${r}`;
}
function M(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function G(n) {
  return String(n || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function V(n) {
  const e = String(n || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!e || a.isAbsolute(e)) return "";
  const t = e.split("/").filter(Boolean);
  return t.some((r) => r === "..") ? "" : t.join("/");
}
function J(n, e) {
  const t = a.resolve(n), r = V(e);
  if (!r) return "";
  const i = a.resolve(t, r), s = a.relative(t, i);
  return s.startsWith("..") || a.isAbsolute(s) ? "" : i;
}
function Q(n) {
  const e = n.toLowerCase(), r = [".anim.json", ".atlas.json", ".scene.json", ".prefab.json"].find((s) => e.endsWith(s));
  if (r) return { base: n.slice(0, -r.length), ext: n.slice(n.length - r.length) };
  const i = a.extname(n);
  return { base: i ? n.slice(0, -i.length) : n, ext: i };
}
async function ye(n) {
  if (!await w(n)) return n;
  const e = a.dirname(n), t = Q(a.basename(n));
  for (let r = 1; r < 1e3; r += 1) {
    const i = a.join(e, `${t.base}-${r}${t.ext}`);
    if (!await w(i)) return i;
  }
  throw new Error("无法生成可用的默认文件名，请手动输入文件名。");
}
function U(n) {
  return `${String(n || "").trim().replace(/\.scene\.json$/i, "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "MainScene"}.scene.json`;
}
async function A(n, e) {
  await w(n) && (await o.mkdir(a.dirname(e), { recursive: !0 }), await o.cp(n, e, { recursive: !0, force: !0 }));
}
async function Pe(n, e) {
  try {
    await o.rename(n, e);
    return;
  } catch (t) {
    const r = t == null ? void 0 : t.code;
    if (r !== "EPERM" && r !== "EXDEV" && r !== "EACCES")
      throw t;
  }
  await o.cp(n, e, {
    recursive: !0,
    force: !1,
    errorOnExist: !0
  });
  try {
    await o.rm(n, {
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
async function Z(n, e) {
  return await w(n) ? (await o.mkdir(a.dirname(e), { recursive: !0 }), await o.copyFile(n, e), !0) : !1;
}
function ee() {
  return [
    a.resolve(C, "..", "assets-for-sample"),
    a.resolve(process.cwd(), "assets-for-sample")
  ].find((e) => se.existsSync(e)) || "";
}
const te = [
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
async function je(n) {
  const e = a.join(n, "assets", "scripts");
  await o.mkdir(e, { recursive: !0 });
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
        ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
        if (!ctx.api.isTouching(ctx.entity, player)) return
        ctx.api.removeEntity(ctx.entity)
        const playerTransform = player.getTransform()
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
    Object.entries(t).map(([r, i]) => o.writeFile(a.join(e, r), i, "utf-8"))
  );
}
async function ve(n) {
  const e = a.join(n, "assets", "images");
  await o.mkdir(e, { recursive: !0 });
  const t = L("player"), r = L("enemy"), i = L("chest");
  await Promise.all([
    o.writeFile(a.join(e, "player.png"), t),
    o.writeFile(a.join(e, "enemy.png"), r),
    o.writeFile(a.join(e, "chest.png"), i)
  ]);
}
async function Se(n) {
  const e = ee();
  if (!e) return !1;
  let t = 0;
  for (const r of te)
    await Z(a.join(e, r.from), a.join(n, r.to)) && (t += 1);
  return t > 0;
}
async function be(n) {
  const e = a.join(n, "assets", "animations");
  await o.mkdir(e, { recursive: !0 });
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
    o.writeFile(a.join(e, "TorchFX.anim.json"), JSON.stringify(t, null, 2), "utf-8"),
    o.writeFile(a.join(e, "TorchSheet.atlas.json"), JSON.stringify(r, null, 2), "utf-8")
  ]);
}
async function Ae(n) {
  const e = a.join(n, "assets", "audio");
  await o.mkdir(e, { recursive: !0 }), await o.writeFile(a.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function Ce(n) {
  const e = await Se(n);
  await Promise.all([
    je(n),
    ...e ? [] : [ve(n)],
    be(n),
    Ae(n)
  ]);
}
function O(n, e) {
  const t = String(n || "").trim();
  if (!t) return "";
  if (t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  let r = t.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  const i = b(a.resolve(e)), s = i.toLowerCase(), l = r.toLowerCase();
  l.startsWith(`${s}/`) && (r = r.slice(i.length + 1));
  const u = l.lastIndexOf("/assets/");
  return u >= 0 && (r = r.slice(u + 1)), r = r.replace(/^\/+/, ""), r.toLowerCase().startsWith("dist/assets/") && (r = r.slice(5)), r.toLowerCase().startsWith("dist-electron/assets/") && (r = r.slice(14)), r;
}
function _e(n, e, t) {
  let r = !1;
  const i = /* @__PURE__ */ new Set([
    "texturePath",
    "animationAssetPath",
    "sourceAtlasPath",
    "scriptPath",
    "clipPath",
    "imagePath",
    "path",
    "relativePath"
  ]), s = (c, u, f) => {
    const m = O(f, e);
    m && !m.startsWith("data:") && !m.startsWith("http://") && !m.startsWith("https://") && t.add(m), m !== f && (c[u] = m, r = !0);
  }, l = (c) => {
    if (!c || typeof c != "object") return;
    if (Array.isArray(c)) {
      for (const f of c) l(f);
      return;
    }
    const u = c;
    for (const [f, m] of Object.entries(u)) {
      if (typeof m == "string" && i.has(f)) {
        s(u, f, m);
        continue;
      }
      if (Array.isArray(m) && (f === "framePaths" || f === "textureCycle")) {
        const g = m.map((y) => {
          if (typeof y != "string") return y;
          const d = O(y, e);
          return d && !d.startsWith("data:") && !d.startsWith("http://") && !d.startsWith("https://") && t.add(d), d !== y && (r = !0), d;
        });
        u[f] = g;
        continue;
      }
      if (m && typeof m == "object" && f === "tileTextureMap" && !Array.isArray(m)) {
        const g = m;
        for (const [y, d] of Object.entries(g)) {
          if (typeof d != "string") continue;
          const v = O(d, e);
          v && !v.startsWith("data:") && !v.startsWith("http://") && !v.startsWith("https://") && t.add(v), v !== d && (g[y] = v, r = !0);
        }
      }
      l(m);
    }
  };
  return l(n), r;
}
async function Fe(n, e) {
  if (!e.length) return 0;
  const t = ee();
  if (!t) return 0;
  const r = new Map(te.map((s) => [s.to.toLowerCase(), s.from]));
  let i = 0;
  for (const s of e) {
    const l = r.get(s.toLowerCase());
    if (!l) continue;
    await Z(a.join(t, l), a.join(n, s)) && (i += 1);
  }
  return i;
}
async function k(n) {
  const e = await z(n);
  if (!e.length)
    return { repaired: !1, normalizedSceneFiles: 0, copiedAssets: 0, unresolvedAssets: 0 };
  let t = 0;
  const r = /* @__PURE__ */ new Set();
  for (const c of e) {
    const u = a.join(n, "scenes", c), f = await o.readFile(u, "utf-8").catch(() => "");
    if (!f) continue;
    let m = null;
    try {
      m = JSON.parse(String(f).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    _e(m, n, r) && (t += 1, await o.writeFile(u, JSON.stringify(m, null, 2), "utf-8"));
  }
  const i = [];
  for (const c of r)
    await X(n, c) || i.push(c);
  const s = await Fe(n, i);
  let l = 0;
  for (const c of r)
    await X(n, c) || (l += 1);
  return {
    repaired: t > 0 || s > 0,
    normalizedSceneFiles: t,
    copiedAssets: s,
    unresolvedAssets: l
  };
}
function L(n) {
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
  return ie.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r)}`).toPNG();
}
async function ne(n, e) {
  const r = (await o.readdir(n, { withFileTypes: !0 })).sort((i, s) => Number(s.isDirectory()) - Number(i.isDirectory()) || i.name.localeCompare(s.name));
  return Promise.all(
    r.map(async (i) => {
      const s = a.join(n, i.name), l = b(a.relative(e, s)) || ".", c = i.isDirectory(), u = {
        id: l,
        name: i.name,
        type: c ? "folder" : le(i.name),
        path: l,
        absolutePath: s,
        children: []
      };
      return c && (u.children = await ne(s, e)), u;
    })
  );
}
async function Ne(n) {
  const e = a.extname(n).toLowerCase(), t = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", r = await o.readFile(n);
  return `data:${t};base64,${r.toString("base64")}`;
}
function Ee(n) {
  return String(n || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}
async function X(n, e) {
  const t = Ee(e);
  if (!t) return null;
  const r = x.getAppPath(), i = t.startsWith("assets/") ? t.slice(7) : t, s = [
    a.join(n, t),
    a.join(n, "assets", i),
    a.join(r, t),
    a.join(r, "assets", i),
    a.join(r, "dist", t),
    a.join(r, "dist", "assets", i),
    a.join(r, "dist-electron", t),
    a.join(r, "dist-electron", "assets", i),
    a.join(C, t),
    a.join(C, "assets", i)
  ];
  for (const l of s) {
    const c = await o.stat(l).catch(() => null);
    if (c != null && c.isFile()) return l;
  }
  return null;
}
async function H(n, e, t) {
  await F(n);
  const r = a.join(n, t);
  await o.mkdir(r, { recursive: !0 });
  const i = [];
  for (const s of e) {
    const l = a.basename(s), c = a.join(r, l);
    await o.copyFile(s, c), i.push({
      fileName: l,
      relativePath: b(a.relative(n, c))
    });
  }
  return i;
}
async function Te(n) {
  let e = n.filePath;
  if (!e) {
    const t = a.join(n.projectRoot || x.getPath("documents"), n.subdir || "", n.suggestedName || "Asset.json"), r = await j.showSaveDialog({
      title: n.title || "保存文本资源",
      defaultPath: t,
      filters: [{ name: n.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (r.canceled || !r.filePath) return null;
    e = r.filePath;
  }
  return await o.mkdir(a.dirname(e), { recursive: !0 }), await o.writeFile(e, n.content, "utf-8"), {
    filePath: e,
    name: a.basename(e),
    relativePath: n.projectRoot ? b(a.relative(n.projectRoot, e)) : void 0
  };
}
async function $e(n) {
  var i;
  const e = await j.showOpenDialog({
    title: n.title || "打开文本资源",
    defaultPath: n.projectRoot ? a.join(n.projectRoot, n.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (i = n.extensions) != null && i.length ? n.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const t = e.filePaths[0], r = await o.readFile(t, "utf-8");
  return {
    filePath: t,
    name: a.basename(t),
    relativePath: n.projectRoot ? b(a.relative(n.projectRoot, t)) : void 0,
    content: r
  };
}
function K() {
  const n = new Y({
    width: 1120,
    height: 700,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111318",
    webPreferences: {
      preload: a.join(C, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  re(n, "launcher"), x.isPackaged ? n.loadFile(a.join(x.getAppPath(), "dist", "index.html")) : (n.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && n.webContents.openDevTools({ mode: "detach" })), S = n, n.on("closed", () => {
    S === n && (S = null);
  });
}
function re(n, e) {
  if (!n || n.isDestroyed()) return;
  const t = ae.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const s = Math.min(1680, Math.max(1200, t.width - 120)), l = Math.min(980, Math.max(760, t.height - 100));
    n.setSize(s, l, !0), n.center();
    return;
  }
  const r = Math.min(1180, Math.max(980, t.width - 220)), i = Math.min(760, Math.max(640, t.height - 180));
  n.setSize(r, i, !0), n.center();
}
function De(n) {
  x.isPackaged ? n.loadFile(a.join(x.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : n.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function Re(n) {
  return T = n || null, S ? (!h || h.isDestroyed() ? (h = new Y({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: S,
    webPreferences: {
      preload: a.join(C, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), De(h), h.on("closed", () => {
    h = null;
  })) : (h.isMinimized() && h.restore(), h.focus()), h.webContents.once("did-finish-load", () => {
    !h || h.isDestroyed() || h.webContents.send("unu:tilemap-editor-init", T);
  }), h.webContents.isLoadingMainFrame() ? { ok: !0 } : (h.webContents.send("unu:tilemap-editor-init", T), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
function ke(n) {
  const e = /* @__PURE__ */ new Date(), t = (i) => String(i).padStart(2, "0"), r = [
    e.getFullYear(),
    t(e.getMonth() + 1),
    t(e.getDate()),
    "-",
    t(e.getHours()),
    t(e.getMinutes()),
    t(e.getSeconds())
  ].join("");
  return `${M(n) || "UNUGame"}-web-${r}`;
}
async function Me() {
  const n = x.isPackaged ? [
    a.join(process.resourcesPath, "dist"),
    a.join(process.resourcesPath, "app.asar.unpacked", "dist"),
    a.join(process.cwd(), "dist")
  ] : [
    a.join(process.cwd(), "dist"),
    a.resolve(C, "..", "dist"),
    a.join(C, "dist"),
    a.join(x.getAppPath(), "dist")
  ];
  for (const e of n)
    if (!e.includes(".asar") && await w(a.join(e, "index.html")))
      return e;
  throw new Error(
    x.isPackaged ? "未找到可复制的 Web 构建目录 resources/dist，请重新打包应用后再导出。" : "未找到 Web 构建目录 dist，请先执行 npm run build。"
  );
}
async function Ie(n) {
  if (!await w(n)) return 0;
  let e = 0;
  const t = async (r) => {
    const i = await o.readdir(r, { withFileTypes: !0 }).catch(() => []);
    for (const s of i) {
      const l = a.join(r, s.name);
      s.isDirectory() ? await t(l) : s.isFile() && (e += 1);
    }
  };
  return await t(n), e;
}
async function Ue(n, e) {
  let t = await o.readFile(n, "utf-8");
  t = t.replace(/(src|href)="\/assets\//g, '$1="./assets/').replace(/<title>.*?<\/title>/i, `<title>${Le(e || "UNU Game")}</title>`), t.includes("__UNU_GAME_EXPORT__") || (t = t.replace(
    /<head([^>]*)>/i,
    `<head$1>
    <script>window.__UNU_GAME_EXPORT__ = true;<\/script>`
  )), await o.writeFile(n, t, "utf-8");
}
async function Oe(n, e) {
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
  await o.writeFile(a.join(n, "PLAY_GAME.bat"), t, "utf-8"), await o.writeFile(a.join(n, "PLAY_GAME.ps1"), r, "utf-8"), await o.writeFile(a.join(n, "EXPORT_README.md"), i, "utf-8");
}
function Le(n) {
  return String(n).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
process.on("unhandledRejection", (n) => {
  console.error("[UNU][main] Unhandled promise rejection:", n);
});
process.on("uncaughtException", (n) => {
  console.error("[UNU][main] Uncaught exception:", n);
});
x.whenReady().then(() => {
  p.handle("unu:create-project", async () => {
    const n = await j.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const e = n.filePaths[0];
    return await F(e), await I(e), {
      rootPath: e,
      name: a.basename(e),
      created: !0
    };
  }), p.handle("unu:create-project-v2", async (n, e) => {
    let t = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!t) {
      const c = await j.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (c.canceled || c.filePaths.length === 0) return null;
      t = c.filePaths[0];
    }
    const r = await o.stat(t).catch(() => null);
    if (!(r != null && r.isDirectory()))
      throw new Error("无效的项目目录");
    const i = M(e == null ? void 0 : e.projectName) || xe(), s = a.join(t, i);
    if (await w(s))
      throw new Error(`目标目录已存在: ${s}`);
    await F(s), await I(s, i), await D(s);
    const l = await k(s);
    return {
      rootPath: s,
      name: i,
      parentDir: t,
      created: !0,
      integrity: l
    };
  }), p.handle("unu:pick-directory", async (n, e) => {
    const t = await j.showOpenDialog({
      title: (e == null ? void 0 : e.title) || "选择目标目录",
      defaultPath: e == null ? void 0 : e.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0];
    return {
      dirPath: r,
      name: a.basename(r)
    };
  }), p.handle("unu:pick-project-folder", async () => {
    const n = await j.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const e = n.filePaths[0];
    return await F(e), {
      rootPath: e,
      name: a.basename(e)
    };
  }), p.handle("unu:save-project-as", async (n, e) => {
    const t = await j.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = a.resolve(r), s = e.sourceProjectRoot ? a.resolve(e.sourceProjectRoot) : "";
    if (s && s !== "sample-project" && s === i)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await F(r);
    const l = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !l && s && await w(s) ? (await A(a.join(s, "assets"), a.join(r, "assets")), await A(a.join(s, "scenes"), a.join(r, "scenes")), await A(a.join(s, "prefabs"), a.join(r, "prefabs")), await A(a.join(s, "project.json"), a.join(r, "project.json"))) : await Ce(r), await I(r, e.projectName), await D(r);
    let c;
    const u = Array.isArray(e.sceneFiles) ? e.sceneFiles : [];
    if (u.length > 0) {
      const m = /* @__PURE__ */ new Set();
      for (const g of u) {
        const y = U(g.fileName);
        let d = y, v = 2;
        for (; m.has(d.toLowerCase()); )
          d = y.replace(/\.scene\.json$/i, `_${v}.scene.json`), v += 1;
        m.add(d.toLowerCase());
        const _ = a.join(r, "scenes", d);
        await o.mkdir(a.dirname(_), { recursive: !0 }), await o.writeFile(_, String(g.content || ""), "utf-8"), c || (c = _);
        const $ = U(e.currentSceneName);
        d.toLowerCase() === $.toLowerCase() && (c = _);
      }
    } else if (e.currentSceneContent) {
      const m = U(e.currentSceneName);
      c = a.join(r, "scenes", m), await o.mkdir(a.dirname(c), { recursive: !0 }), await o.writeFile(c, e.currentSceneContent, "utf-8");
    }
    await R(r, e.projectName);
    const f = await k(r);
    return {
      rootPath: r,
      name: a.basename(r),
      sceneFilePath: c,
      fromSample: l,
      integrity: f
    };
  }), p.handle("unu:export-game", async (n, e) => {
    const t = await N(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project" || !await w(t))
      throw new Error("请先打开一个本地项目，再导出游戏。");
    await F(t), await D(t);
    const r = M(e == null ? void 0 : e.projectName) || a.basename(t), i = await R(t, r), s = await k(t), l = await j.showOpenDialog({
      title: "导出 Web 游戏到目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (l.canceled || l.filePaths.length === 0) return null;
    const c = await Me(), u = a.join(l.filePaths[0], ke(r));
    await o.mkdir(u, { recursive: !0 }), await o.cp(c, u, { recursive: !0, force: !0 }), await A(a.join(t, "project.json"), a.join(u, "project.json")), await A(a.join(t, "assets"), a.join(u, "assets")), await A(a.join(t, "scenes"), a.join(u, "scenes")), await A(a.join(t, "prefabs"), a.join(u, "prefabs"));
    const f = a.join(u, "index.html");
    await Ue(f, r), await Oe(u, r);
    const m = await Ie(a.join(u, "assets")), g = {
      format: "unu-web-export",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      projectName: r,
      projectRoot: t,
      outputDir: u,
      indexPath: f,
      launchScript: a.join(u, "PLAY_GAME.bat"),
      sceneCount: i.sceneCount,
      startupScene: i.startupScene,
      assetCount: m,
      assetIntegrityRepaired: s.repaired,
      unresolvedAssets: s.unresolvedAssets
    };
    return await o.writeFile(a.join(u, "export-report.json"), JSON.stringify(g, null, 2), "utf-8"), {
      ok: !0,
      outputDir: u,
      indexPath: f,
      sceneCount: i.sceneCount,
      assetCount: m
    };
  }), p.handle("unu:scan-project", async (n, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    const t = await N(e);
    await F(t), await D(t);
    const r = a.basename(t), i = await R(t, r), s = await k(t), l = await ne(t, t);
    return {
      rootPath: t,
      name: r,
      tree: l,
      sceneCatalogRepaired: i.repaired,
      sceneCount: i.sceneCount,
      sceneCreatedByReference: i.createdByReference,
      assetIntegrityRepaired: s.repaired,
      normalizedSceneFiles: s.normalizedSceneFiles,
      copiedAssets: s.copiedAssets,
      unresolvedAssets: s.unresolvedAssets
    };
  }), p.handle("unu:save-scene", async (n, e) => {
    let t = e.filePath;
    if (!t) {
      const r = a.join(e.projectRoot || x.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), i = await j.showSaveDialog({
        title: "保存场景",
        defaultPath: r,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await o.mkdir(a.dirname(t), { recursive: !0 }), await o.writeFile(t, e.content, "utf-8"), e.projectRoot && await R(e.projectRoot, a.basename(e.projectRoot)), {
      filePath: t,
      name: a.basename(t)
    };
  }), p.handle("unu:open-scene", async (n, e) => {
    const t = await j.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = await o.readFile(r, "utf-8");
    return {
      filePath: r,
      name: a.basename(r),
      content: i
    };
  }), p.handle("unu:read-asset-data-url", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    try {
      const t = await N(e.projectRoot), r = await X(t, e.relativePath);
      return r ? { dataUrl: await Ne(r) } : null;
    } catch (t) {
      const r = t instanceof Error ? t.message : String(t);
      return console.warn("[UNU][main] read-asset-data-url fallback failed:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        message: r
      }), null;
    }
  }), p.handle("unu:import-images", async (n, e) => {
    if (!e.projectRoot) return null;
    const t = await j.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await H(e.projectRoot, t.filePaths, "assets/images") };
  }), p.handle("unu:import-audios", async (n, e) => {
    if (!e.projectRoot) return null;
    const t = await j.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return t.canceled || t.filePaths.length === 0 ? null : { imported: await H(e.projectRoot, t.filePaths, "assets/audio") };
  }), p.handle("unu:save-prefab", async (n, e) => {
    let t = e.filePath;
    if (!t) {
      const r = a.join(e.projectRoot || x.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), i = await j.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: r,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      t = i.filePath;
    }
    return await o.mkdir(a.dirname(t), { recursive: !0 }), await o.writeFile(t, e.content, "utf-8"), {
      filePath: t,
      name: a.basename(t),
      relativePath: e.projectRoot ? b(a.relative(e.projectRoot, t)) : void 0
    };
  }), p.handle("unu:open-prefab", async (n, e) => {
    const t = await j.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const r = t.filePaths[0], i = await o.readFile(r, "utf-8");
    return {
      filePath: r,
      name: a.basename(r),
      relativePath: e.projectRoot ? b(a.relative(e.projectRoot, r)) : void 0,
      content: i
    };
  }), p.handle("unu:save-text-asset", async (n, e) => Te(e)), p.handle("unu:open-text-asset", async (n, e) => $e(e)), p.handle("unu:create-text-asset-in-folder", async (n, e) => {
    const t = await N(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再新建文件。");
    const r = V((e == null ? void 0 : e.folderPath) || "assets"), i = J(t, r);
    if (!i) throw new Error("目标目录不在当前项目内。");
    const s = await o.stat(i).catch(() => null);
    if (!s || !s.isDirectory()) throw new Error("目标目录不存在。");
    const l = !!String((e == null ? void 0 : e.fileName) || "").trim(), c = G(e == null ? void 0 : e.fileName) || "NewFile.ts", u = a.join(i, c), f = a.resolve(t), m = a.relative(f, a.resolve(u));
    if (m.startsWith("..") || a.isAbsolute(m)) throw new Error("目标文件不在当前项目内。");
    const g = l ? u : await ye(u);
    if (l && await w(g)) throw new Error("同名文件已存在。");
    return await o.writeFile(g, (e == null ? void 0 : e.content) ?? "", "utf-8"), {
      filePath: g,
      name: a.basename(g),
      relativePath: b(a.relative(t, g))
    };
  }), p.handle("unu:rename-asset", async (n, e) => {
    const t = await N(String((e == null ? void 0 : e.projectRoot) || "").trim());
    if (!t || t === "sample-project")
      throw new Error("请先打开或另存为本地项目，再重命名资源。");
    const r = J(t, (e == null ? void 0 : e.relativePath) || "");
    if (!r) throw new Error("源资源不在当前项目内。");
    const i = await o.stat(r).catch(() => null);
    if (!i) throw new Error("源资源不存在。");
    const s = G(e == null ? void 0 : e.nextName);
    if (!s) throw new Error("资源名称不能为空。");
    const l = a.basename(r), c = i.isDirectory() || a.extname(s) ? s : `${s}${Q(l).ext}`, u = a.join(a.dirname(r), c), f = a.resolve(t), m = a.relative(f, a.resolve(u));
    if (m.startsWith("..") || a.isAbsolute(m)) throw new Error("目标资源不在当前项目内。");
    if (a.resolve(u) === a.resolve(r))
      return {
        filePath: r,
        name: l,
        relativePath: b(a.relative(t, r))
      };
    if (await w(u)) throw new Error("同名资源已存在。");
    return await o.rename(r, u), {
      filePath: u,
      name: a.basename(u),
      relativePath: b(a.relative(t, u))
    };
  }), p.handle("unu:read-text-asset", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const t = await N(e.projectRoot), r = a.join(t, e.relativePath), i = await o.readFile(r, "utf-8");
    return { filePath: r, name: a.basename(r), relativePath: e.relativePath, content: i };
  }), p.handle("unu:rename-project", async (n, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim(), r = String((e == null ? void 0 : e.nextName) || "").trim(), i = M(r);
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
    const l = a.resolve(t), c = await o.stat(l).catch(() => null);
    if (!c || !c.isDirectory())
      throw new Error("项目目录不存在");
    const u = a.dirname(l), f = a.join(u, i);
    if (a.resolve(f) === l)
      return {
        rootPath: l,
        name: i
      };
    if (await w(f))
      throw new Error("目标目录已存在");
    await Pe(l, f);
    const m = a.join(f, "project.json");
    try {
      const g = await o.readFile(m, "utf-8"), y = JSON.parse(g), d = {
        ...y && typeof y == "object" ? y : {},
        format: "unu-project",
        version: 1,
        name: i,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await o.writeFile(m, JSON.stringify(d, null, 2), "utf-8");
    } catch {
    }
    return {
      rootPath: f,
      name: i
    };
  }), p.handle("unu:delete-project", async (n, e) => {
    const t = String((e == null ? void 0 : e.projectRoot) || "").trim();
    if (!t) return { ok: !1 };
    if (t === "sample-project")
      throw new Error("示例项目不支持删除");
    const r = a.resolve(t), i = await o.stat(r).catch(() => null);
    return !i || !i.isDirectory() ? { ok: !1, error: "项目目录不存在" } : (await o.rm(r, { recursive: !0, force: !0 }), { ok: !0 });
  }), p.handle("unu:reveal-in-folder", async (n, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const t = a.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: t
      });
      const r = await o.stat(t).catch(() => null);
      if (!r)
        return { ok: !1, error: `Path not found: ${t}` };
      if (e.isDirectory || r.isDirectory()) {
        const i = await B.openPath(t);
        return { ok: !i, error: i || void 0 };
      }
      return B.showItemInFolder(t), { ok: !0 };
    } catch (r) {
      return { ok: !1, error: r instanceof Error ? r.message : String(r) };
    }
  }), p.handle("unu:open-tilemap-editor", async (n, e) => Re(e)), p.handle("unu:tilemap-editor-update", async (n, e) => !S || S.isDestroyed() ? { ok: !1, error: "Main window not available" } : (S.webContents.send("unu:tilemap-editor-apply", e), T = { ...T || {}, ...e || {} }, { ok: !0 })), p.handle("unu:close-tilemap-editor", async () => (h && !h.isDestroyed() && h.close(), h = null, { ok: !0 })), p.handle("unu:set-main-window-preset", async (n, e) => !S || S.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (re(S, e), { ok: !0 })), K(), x.on("activate", () => {
    Y.getAllWindows().length === 0 && K();
  });
});
x.on("window-all-closed", () => {
  process.platform !== "darwin" && x.quit();
});
