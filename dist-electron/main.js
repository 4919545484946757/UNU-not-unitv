import { app as S, ipcMain as d, dialog as y, shell as L, BrowserWindow as $, screen as Z, nativeImage as ee } from "electron";
import * as o from "node:fs/promises";
import * as te from "node:fs";
import a from "node:path";
import { fileURLToPath as ne } from "node:url";
const re = ne(import.meta.url), C = a.dirname(re);
let j = null, g = null, N = null;
function b(t) {
  return t.split(a.sep).join("/");
}
function ae(t) {
  const e = a.extname(t).toLowerCase();
  return t.endsWith(".anim.json") ? "animation" : t.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : t.endsWith(".scene.json") ? "scene" : t.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "folder";
}
async function A(t) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((n) => o.mkdir(a.join(t, n), { recursive: !0 })));
}
async function k(t, e) {
  const n = a.join(t, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || a.basename(t),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await o.writeFile(n, JSON.stringify(i, null, 2), "utf-8"), i;
}
function ie() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}
`;
}
async function E(t) {
  const e = a.join(t, "assets", "scripts", "ScriptRuntime.ts");
  return await _(e) ? !1 : (await o.mkdir(a.dirname(e), { recursive: !0 }), await o.writeFile(e, ie(), "utf-8"), !0);
}
function se(t) {
  return t.replace(/\.scene\.json$/i, "");
}
function H(t) {
  return String(t || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
}
function oe(t) {
  return `${H(t) || "MainScene"}.scene.json`;
}
function ce(t) {
  const e = H(t) || "MainScene", n = `scene_${e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "main"}`;
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
      id: n,
      name: e,
      entities: []
    }
  }, null, 2);
}
function X(t, e) {
  if (!t || typeof t != "object") return;
  if (Array.isArray(t)) {
    for (const r of t) X(r, e);
    return;
  }
  const n = t;
  if (n.actionType === "switchScene") {
    const r = String(n.targetScene || "").trim();
    r && e.add(r);
  }
  for (const r of Object.keys(n))
    X(n[r], e);
}
async function le(t, e) {
  const n = a.join(t, "scenes"), r = new Set(e.map((l) => l.toLowerCase())), i = /* @__PURE__ */ new Set();
  for (const l of e) {
    const s = a.join(n, l);
    try {
      const u = await o.readFile(s, "utf-8"), f = JSON.parse(u);
      X(f, i);
    } catch {
    }
  }
  let c = 0;
  for (const l of i) {
    const s = oe(l), u = s.toLowerCase();
    if (r.has(u)) continue;
    const f = a.join(n, s), m = ce(l);
    await o.writeFile(f, m, "utf-8"), r.add(u), c += 1;
  }
  return c;
}
async function O(t) {
  const e = a.join(t, "scenes");
  return (await o.readdir(e, { withFileTypes: !0 }).catch(() => [])).filter((r) => r.isFile() && r.name.toLowerCase().endsWith(".scene.json")).map((r) => r.name).sort((r, i) => r.localeCompare(i));
}
async function M(t, e) {
  const n = a.join(t, "project.json");
  let r = await O(t);
  const i = await le(t, r);
  i > 0 && (r = await O(t));
  const c = (e == null ? void 0 : e.trim()) || a.basename(t), l = (/* @__PURE__ */ new Date()).toISOString();
  let s = {};
  try {
    const w = await o.readFile(n, "utf-8"), F = JSON.parse(w);
    F && typeof F == "object" && (s = F);
  } catch {
    s = {};
  }
  const u = r.map((w) => ({
    file: w,
    name: se(w)
  })), f = Array.isArray(s.sceneCatalog) ? s.sceneCatalog.map((w) => String((w == null ? void 0 : w.file) || (w == null ? void 0 : w.fileName) || "")).filter(Boolean) : [], m = u.map((w) => w.file), x = f.length !== m.length || f.some((w, F) => w !== m[F]), h = String(s.startupScene || "").trim(), p = r.length ? r.includes(h) ? h : r[0] : "", P = h !== p, v = {
    ...s,
    format: "unu-project",
    version: 1,
    name: String(s.name || e || "").trim() || c,
    createdAt: String(s.createdAt || "").trim() || l,
    updatedAt: l,
    sceneCatalogVersion: 1,
    sceneCatalog: u,
    startupScene: p
  }, T = !s.format || !s.version || !Array.isArray(s.sceneCatalog) || x || P || String(s.name || "").trim() !== v.name || i > 0;
  return T && await o.writeFile(n, JSON.stringify(v, null, 2), "utf-8"), {
    repaired: T,
    sceneCount: r.length,
    startupScene: p,
    createdByReference: i
  };
}
async function _(t) {
  try {
    return await o.access(t), !0;
  } catch {
    return !1;
  }
}
function me() {
  const t = /* @__PURE__ */ new Date(), e = (i) => String(i).padStart(2, "0"), n = `${t.getFullYear()}${e(t.getMonth() + 1)}${e(t.getDate())}`, r = `${e(t.getHours())}${e(t.getMinutes())}`;
  return `UNUProject_${n}_${r}`;
}
function Y(t) {
  return String(t || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
function I(t) {
  return `${String(t || "").trim().replace(/\.scene\.json$/i, "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "MainScene"}.scene.json`;
}
async function D(t, e) {
  await _(t) && (await o.mkdir(a.dirname(e), { recursive: !0 }), await o.cp(t, e, { recursive: !0, force: !0 }));
}
async function ue(t, e) {
  try {
    await o.rename(t, e);
    return;
  } catch (n) {
    const r = n == null ? void 0 : n.code;
    if (r !== "EPERM" && r !== "EXDEV" && r !== "EACCES")
      throw n;
  }
  await o.cp(t, e, {
    recursive: !0,
    force: !1,
    errorOnExist: !0
  });
  try {
    await o.rm(t, {
      recursive: !0,
      force: !1,
      maxRetries: 6,
      retryDelay: 120
    });
  } catch (n) {
    const r = n instanceof Error ? n.message : String(n);
    throw new Error(`Project files are busy. Please close occupying programs and retry. (${r})`);
  }
}
async function G(t, e) {
  return await _(t) ? (await o.mkdir(a.dirname(e), { recursive: !0 }), await o.copyFile(t, e), !0) : !1;
}
function V() {
  return [
    a.resolve(C, "..", "assets-for-sample"),
    a.resolve(process.cwd(), "assets-for-sample")
  ].find((e) => te.existsSync(e)) || "";
}
const q = [
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
async function fe(t) {
  const e = a.join(t, "assets", "scripts");
  await o.mkdir(e, { recursive: !0 });
  const n = {
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

        const hitEnemy = ctx.api.findEnemyOverlap(ctx.entity)
        if (!hitEnemy) return
        ctx.api.removeEntity(ctx.entity)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: 160
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
`
  };
  await Promise.all(
    Object.entries(n).map(([r, i]) => o.writeFile(a.join(e, r), i, "utf-8"))
  );
}
async function pe(t) {
  const e = a.join(t, "assets", "images");
  await o.mkdir(e, { recursive: !0 });
  const n = z("player"), r = z("enemy"), i = z("chest");
  await Promise.all([
    o.writeFile(a.join(e, "player.png"), n),
    o.writeFile(a.join(e, "enemy.png"), r),
    o.writeFile(a.join(e, "chest.png"), i)
  ]);
}
async function de(t) {
  const e = V();
  if (!e) return !1;
  let n = 0;
  for (const r of q)
    await G(a.join(e, r.from), a.join(t, r.to)) && (n += 1);
  return n > 0;
}
async function ge(t) {
  const e = a.join(t, "assets", "animations");
  await o.mkdir(e, { recursive: !0 });
  const n = {
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
    o.writeFile(a.join(e, "TorchFX.anim.json"), JSON.stringify(n, null, 2), "utf-8"),
    o.writeFile(a.join(e, "TorchSheet.atlas.json"), JSON.stringify(r, null, 2), "utf-8")
  ]);
}
async function he(t) {
  const e = a.join(t, "assets", "audio");
  await o.mkdir(e, { recursive: !0 }), await o.writeFile(a.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function we(t) {
  const e = await de(t);
  await Promise.all([
    fe(t),
    ...e ? [] : [pe(t)],
    ge(t),
    he(t)
  ]);
}
function R(t, e) {
  const n = String(t || "").trim();
  if (!n) return "";
  if (n.startsWith("data:") || n.startsWith("http://") || n.startsWith("https://")) return n;
  let r = n.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  const i = b(a.resolve(e)), c = i.toLowerCase(), l = r.toLowerCase();
  l.startsWith(`${c}/`) && (r = r.slice(i.length + 1));
  const u = l.lastIndexOf("/assets/");
  return u >= 0 && (r = r.slice(u + 1)), r = r.replace(/^\/+/, ""), r.toLowerCase().startsWith("dist/assets/") && (r = r.slice(5)), r.toLowerCase().startsWith("dist-electron/assets/") && (r = r.slice(14)), r;
}
function ye(t, e, n) {
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
  ]), c = (s, u, f) => {
    const m = R(f, e);
    m && !m.startsWith("data:") && !m.startsWith("http://") && !m.startsWith("https://") && n.add(m), m !== f && (s[u] = m, r = !0);
  }, l = (s) => {
    if (!s || typeof s != "object") return;
    if (Array.isArray(s)) {
      for (const f of s) l(f);
      return;
    }
    const u = s;
    for (const [f, m] of Object.entries(u)) {
      if (typeof m == "string" && i.has(f)) {
        c(u, f, m);
        continue;
      }
      if (Array.isArray(m) && (f === "framePaths" || f === "textureCycle")) {
        const x = m.map((h) => {
          if (typeof h != "string") return h;
          const p = R(h, e);
          return p && !p.startsWith("data:") && !p.startsWith("http://") && !p.startsWith("https://") && n.add(p), p !== h && (r = !0), p;
        });
        u[f] = x;
        continue;
      }
      if (m && typeof m == "object" && f === "tileTextureMap" && !Array.isArray(m)) {
        const x = m;
        for (const [h, p] of Object.entries(x)) {
          if (typeof p != "string") continue;
          const P = R(p, e);
          P && !P.startsWith("data:") && !P.startsWith("http://") && !P.startsWith("https://") && n.add(P), P !== p && (x[h] = P, r = !0);
        }
      }
      l(m);
    }
  };
  return l(t), r;
}
async function xe(t, e) {
  if (!e.length) return 0;
  const n = V();
  if (!n) return 0;
  const r = new Map(q.map((c) => [c.to.toLowerCase(), c.from]));
  let i = 0;
  for (const c of e) {
    const l = r.get(c.toLowerCase());
    if (!l) continue;
    await G(a.join(n, l), a.join(t, c)) && (i += 1);
  }
  return i;
}
async function U(t) {
  const e = await O(t);
  if (!e.length)
    return { repaired: !1, normalizedSceneFiles: 0, copiedAssets: 0, unresolvedAssets: 0 };
  let n = 0;
  const r = /* @__PURE__ */ new Set();
  for (const s of e) {
    const u = a.join(t, "scenes", s), f = await o.readFile(u, "utf-8").catch(() => "");
    if (!f) continue;
    let m = null;
    try {
      m = JSON.parse(String(f).replace(/^\uFEFF/, ""));
    } catch {
      continue;
    }
    ye(m, t, r) && (n += 1, await o.writeFile(u, JSON.stringify(m, null, 2), "utf-8"));
  }
  const i = [];
  for (const s of r)
    await W(t, s) || i.push(s);
  const c = await xe(t, i);
  let l = 0;
  for (const s of r)
    await W(t, s) || (l += 1);
  return {
    repaired: n > 0 || c > 0,
    normalizedSceneFiles: n,
    copiedAssets: c,
    unresolvedAssets: l
  };
}
function z(t) {
  const n = t === "player" ? { bg: "#0E2A47", accent: "#56CCF2", stroke: "#BDEBFF", symbol: "P" } : t === "enemy" ? { bg: "#3A1518", accent: "#EB5757", stroke: "#FFC4C4", symbol: "E" } : { bg: "#3A2A11", accent: "#F2C94C", stroke: "#FFE8A3", symbol: "C" }, r = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${n.bg}" />
      <stop offset="100%" stop-color="${n.accent}" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="22" fill="url(#g)" stroke="${n.stroke}" stroke-width="4"/>
  <circle cx="${128 / 2}" cy="${128 / 2}" r="26" fill="rgba(0,0,0,0.25)" />
  <text x="${128 / 2}" y="${128 / 2 + 15}" text-anchor="middle" fill="#ffffff" font-size="54" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${n.symbol}</text>
</svg>`;
  return ee.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r)}`).toPNG();
}
async function K(t, e) {
  const r = (await o.readdir(t, { withFileTypes: !0 })).sort((i, c) => Number(c.isDirectory()) - Number(i.isDirectory()) || i.name.localeCompare(c.name));
  return Promise.all(
    r.map(async (i) => {
      const c = a.join(t, i.name), l = b(a.relative(e, c)) || ".", s = i.isDirectory(), u = {
        id: l,
        name: i.name,
        type: s ? "folder" : ae(i.name),
        path: l,
        absolutePath: c,
        children: []
      };
      return s && (u.children = await K(c, e)), u;
    })
  );
}
async function Pe(t) {
  const e = a.extname(t).toLowerCase(), n = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", r = await o.readFile(t);
  return `data:${n};base64,${r.toString("base64")}`;
}
function Se(t) {
  return String(t || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}
async function W(t, e) {
  const n = Se(e);
  if (!n) return null;
  const r = S.getAppPath(), i = n.startsWith("assets/") ? n.slice(7) : n, c = [
    a.join(t, n),
    a.join(t, "assets", i),
    a.join(r, n),
    a.join(r, "assets", i),
    a.join(r, "dist", n),
    a.join(r, "dist", "assets", i),
    a.join(r, "dist-electron", n),
    a.join(r, "dist-electron", "assets", i),
    a.join(C, n),
    a.join(C, "assets", i)
  ];
  for (const l of c) {
    const s = await o.stat(l).catch(() => null);
    if (s != null && s.isFile()) return l;
  }
  return null;
}
async function B(t, e, n) {
  await A(t);
  const r = a.join(t, n);
  await o.mkdir(r, { recursive: !0 });
  const i = [];
  for (const c of e) {
    const l = a.basename(c), s = a.join(r, l);
    await o.copyFile(c, s), i.push({
      fileName: l,
      relativePath: b(a.relative(t, s))
    });
  }
  return i;
}
async function je(t) {
  let e = t.filePath;
  if (!e) {
    const n = a.join(t.projectRoot || S.getPath("documents"), t.subdir || "", t.suggestedName || "Asset.json"), r = await y.showSaveDialog({
      title: t.title || "保存文本资源",
      defaultPath: n,
      filters: [{ name: t.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (r.canceled || !r.filePath) return null;
    e = r.filePath;
  }
  return await o.mkdir(a.dirname(e), { recursive: !0 }), await o.writeFile(e, t.content, "utf-8"), {
    filePath: e,
    name: a.basename(e),
    relativePath: t.projectRoot ? b(a.relative(t.projectRoot, e)) : void 0
  };
}
async function ve(t) {
  var i;
  const e = await y.showOpenDialog({
    title: t.title || "打开文本资源",
    defaultPath: t.projectRoot ? a.join(t.projectRoot, t.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (i = t.extensions) != null && i.length ? t.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const n = e.filePaths[0], r = await o.readFile(n, "utf-8");
  return {
    filePath: n,
    name: a.basename(n),
    relativePath: t.projectRoot ? b(a.relative(t.projectRoot, n)) : void 0,
    content: r
  };
}
function J() {
  const t = new $({
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
  Q(t, "launcher"), S.isPackaged ? t.loadFile(a.join(S.getAppPath(), "dist", "index.html")) : (t.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && t.webContents.openDevTools({ mode: "detach" })), j = t, t.on("closed", () => {
    j === t && (j = null);
  });
}
function Q(t, e) {
  if (!t || t.isDestroyed()) return;
  const n = Z.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const c = Math.min(1680, Math.max(1200, n.width - 120)), l = Math.min(980, Math.max(760, n.height - 100));
    t.setSize(c, l, !0), t.center();
    return;
  }
  const r = Math.min(1180, Math.max(980, n.width - 220)), i = Math.min(760, Math.max(640, n.height - 180));
  t.setSize(r, i, !0), t.center();
}
function be(t) {
  S.isPackaged ? t.loadFile(a.join(S.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : t.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function Ae(t) {
  return N = t || null, j ? (!g || g.isDestroyed() ? (g = new $({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: j,
    webPreferences: {
      preload: a.join(C, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), be(g), g.on("closed", () => {
    g = null;
  })) : (g.isMinimized() && g.restore(), g.focus()), g.webContents.once("did-finish-load", () => {
    !g || g.isDestroyed() || g.webContents.send("unu:tilemap-editor-init", N);
  }), g.webContents.isLoadingMainFrame() ? { ok: !0 } : (g.webContents.send("unu:tilemap-editor-init", N), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
process.on("unhandledRejection", (t) => {
  console.error("[UNU][main] Unhandled promise rejection:", t);
});
process.on("uncaughtException", (t) => {
  console.error("[UNU][main] Uncaught exception:", t);
});
S.whenReady().then(() => {
  d.handle("unu:create-project", async () => {
    const t = await y.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await A(e), await k(e), {
      rootPath: e,
      name: a.basename(e),
      created: !0
    };
  }), d.handle("unu:create-project-v2", async (t, e) => {
    let n = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!n) {
      const s = await y.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (s.canceled || s.filePaths.length === 0) return null;
      n = s.filePaths[0];
    }
    const r = await o.stat(n).catch(() => null);
    if (!(r != null && r.isDirectory()))
      throw new Error("无效的项目目录");
    const i = Y(e == null ? void 0 : e.projectName) || me(), c = a.join(n, i);
    if (await _(c))
      throw new Error(`目标目录已存在: ${c}`);
    await A(c), await k(c, i), await E(c);
    const l = await U(c);
    return {
      rootPath: c,
      name: i,
      parentDir: n,
      created: !0,
      integrity: l
    };
  }), d.handle("unu:pick-directory", async (t, e) => {
    const n = await y.showOpenDialog({
      title: (e == null ? void 0 : e.title) || "选择目标目录",
      defaultPath: e == null ? void 0 : e.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0];
    return {
      dirPath: r,
      name: a.basename(r)
    };
  }), d.handle("unu:pick-project-folder", async () => {
    const t = await y.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await A(e), {
      rootPath: e,
      name: a.basename(e)
    };
  }), d.handle("unu:save-project-as", async (t, e) => {
    const n = await y.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], i = a.resolve(r), c = e.sourceProjectRoot ? a.resolve(e.sourceProjectRoot) : "";
    if (c && c !== "sample-project" && c === i)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await A(r);
    const l = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !l && c && await _(c) ? (await D(a.join(c, "assets"), a.join(r, "assets")), await D(a.join(c, "scenes"), a.join(r, "scenes")), await D(a.join(c, "prefabs"), a.join(r, "prefabs")), await D(a.join(c, "project.json"), a.join(r, "project.json"))) : await we(r), await k(r, e.projectName), await E(r);
    let s;
    const u = Array.isArray(e.sceneFiles) ? e.sceneFiles : [];
    if (u.length > 0) {
      const m = /* @__PURE__ */ new Set();
      for (const x of u) {
        const h = I(x.fileName);
        let p = h, P = 2;
        for (; m.has(p.toLowerCase()); )
          p = h.replace(/\.scene\.json$/i, `_${P}.scene.json`), P += 1;
        m.add(p.toLowerCase());
        const v = a.join(r, "scenes", p);
        await o.mkdir(a.dirname(v), { recursive: !0 }), await o.writeFile(v, String(x.content || ""), "utf-8"), s || (s = v);
        const T = I(e.currentSceneName);
        p.toLowerCase() === T.toLowerCase() && (s = v);
      }
    } else if (e.currentSceneContent) {
      const m = I(e.currentSceneName);
      s = a.join(r, "scenes", m), await o.mkdir(a.dirname(s), { recursive: !0 }), await o.writeFile(s, e.currentSceneContent, "utf-8");
    }
    await M(r, e.projectName);
    const f = await U(r);
    return {
      rootPath: r,
      name: a.basename(r),
      sceneFilePath: s,
      fromSample: l,
      integrity: f
    };
  }), d.handle("unu:scan-project", async (t, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    await A(e), await E(e);
    const n = a.basename(e), r = await M(e, n), i = await U(e), c = await K(e, e);
    return {
      rootPath: e,
      name: n,
      tree: c,
      sceneCatalogRepaired: r.repaired,
      sceneCount: r.sceneCount,
      sceneCreatedByReference: r.createdByReference,
      assetIntegrityRepaired: i.repaired,
      normalizedSceneFiles: i.normalizedSceneFiles,
      copiedAssets: i.copiedAssets,
      unresolvedAssets: i.unresolvedAssets
    };
  }), d.handle("unu:save-scene", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const r = a.join(e.projectRoot || S.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), i = await y.showSaveDialog({
        title: "保存场景",
        defaultPath: r,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      n = i.filePath;
    }
    return await o.mkdir(a.dirname(n), { recursive: !0 }), await o.writeFile(n, e.content, "utf-8"), e.projectRoot && await M(e.projectRoot, a.basename(e.projectRoot)), {
      filePath: n,
      name: a.basename(n)
    };
  }), d.handle("unu:open-scene", async (t, e) => {
    const n = await y.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], i = await o.readFile(r, "utf-8");
    return {
      filePath: r,
      name: a.basename(r),
      content: i
    };
  }), d.handle("unu:read-asset-data-url", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    try {
      const n = await W(e.projectRoot, e.relativePath);
      return n ? { dataUrl: await Pe(n) } : null;
    } catch (n) {
      const r = n instanceof Error ? n.message : String(n);
      return console.warn("[UNU][main] read-asset-data-url fallback failed:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        message: r
      }), null;
    }
  }), d.handle("unu:import-images", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await y.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await B(e.projectRoot, n.filePaths, "assets/images") };
  }), d.handle("unu:import-audios", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await y.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await B(e.projectRoot, n.filePaths, "assets/audio") };
  }), d.handle("unu:save-prefab", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const r = a.join(e.projectRoot || S.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), i = await y.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: r,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (i.canceled || !i.filePath) return null;
      n = i.filePath;
    }
    return await o.mkdir(a.dirname(n), { recursive: !0 }), await o.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: a.basename(n),
      relativePath: e.projectRoot ? b(a.relative(e.projectRoot, n)) : void 0
    };
  }), d.handle("unu:open-prefab", async (t, e) => {
    const n = await y.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], i = await o.readFile(r, "utf-8");
    return {
      filePath: r,
      name: a.basename(r),
      relativePath: e.projectRoot ? b(a.relative(e.projectRoot, r)) : void 0,
      content: i
    };
  }), d.handle("unu:save-text-asset", async (t, e) => je(e)), d.handle("unu:open-text-asset", async (t, e) => ve(e)), d.handle("unu:read-text-asset", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = a.join(e.projectRoot, e.relativePath), r = await o.readFile(n, "utf-8");
    return { filePath: n, name: a.basename(n), relativePath: e.relativePath, content: r };
  }), d.handle("unu:rename-project", async (t, e) => {
    const n = String((e == null ? void 0 : e.projectRoot) || "").trim(), r = String((e == null ? void 0 : e.nextName) || "").trim(), i = Y(r);
    if (!n || !i) return null;
    if (n === "sample-project")
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
    const l = a.resolve(n), s = await o.stat(l).catch(() => null);
    if (!s || !s.isDirectory())
      throw new Error("项目目录不存在");
    const u = a.dirname(l), f = a.join(u, i);
    if (a.resolve(f) === l)
      return {
        rootPath: l,
        name: i
      };
    if (await _(f))
      throw new Error("目标目录已存在");
    await ue(l, f);
    const m = a.join(f, "project.json");
    try {
      const x = await o.readFile(m, "utf-8"), h = JSON.parse(x), p = {
        ...h && typeof h == "object" ? h : {},
        format: "unu-project",
        version: 1,
        name: i,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await o.writeFile(m, JSON.stringify(p, null, 2), "utf-8");
    } catch {
    }
    return {
      rootPath: f,
      name: i
    };
  }), d.handle("unu:delete-project", async (t, e) => {
    const n = String((e == null ? void 0 : e.projectRoot) || "").trim();
    if (!n) return { ok: !1 };
    if (n === "sample-project")
      throw new Error("示例项目不支持删除");
    const r = a.resolve(n), i = await o.stat(r).catch(() => null);
    return !i || !i.isDirectory() ? { ok: !1, error: "项目目录不存在" } : (await o.rm(r, { recursive: !0, force: !0 }), { ok: !0 });
  }), d.handle("unu:reveal-in-folder", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const n = a.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: n
      });
      const r = await o.stat(n).catch(() => null);
      if (!r)
        return { ok: !1, error: `Path not found: ${n}` };
      if (e.isDirectory || r.isDirectory()) {
        const i = await L.openPath(n);
        return { ok: !i, error: i || void 0 };
      }
      return L.showItemInFolder(n), { ok: !0 };
    } catch (r) {
      return { ok: !1, error: r instanceof Error ? r.message : String(r) };
    }
  }), d.handle("unu:open-tilemap-editor", async (t, e) => Ae(e)), d.handle("unu:tilemap-editor-update", async (t, e) => !j || j.isDestroyed() ? { ok: !1, error: "Main window not available" } : (j.webContents.send("unu:tilemap-editor-apply", e), N = { ...N || {}, ...e || {} }, { ok: !0 })), d.handle("unu:close-tilemap-editor", async () => (g && !g.isDestroyed() && g.close(), g = null, { ok: !0 })), d.handle("unu:set-main-window-preset", async (t, e) => !j || j.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (Q(j, e), { ok: !0 })), J(), S.on("activate", () => {
    $.getAllWindows().length === 0 && J();
  });
});
S.on("window-all-closed", () => {
  process.platform !== "darwin" && S.quit();
});
