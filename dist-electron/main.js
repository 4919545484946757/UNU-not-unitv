import { app as d, ipcMain as c, dialog as m, shell as D, BrowserWindow as y, screen as E, nativeImage as T } from "electron";
import * as s from "node:fs/promises";
import i from "node:path";
import { fileURLToPath as _ } from "node:url";
const $ = _(import.meta.url), k = i.dirname($);
let h = null, l = null, j = null;
function g(t) {
  return t.split(i.sep).join("/");
}
function A(t) {
  const e = i.extname(t).toLowerCase();
  return t.endsWith(".anim.json") ? "animation" : t.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : t.endsWith(".scene.json") ? "scene" : t.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "folder";
}
async function p(t) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((n) => s.mkdir(i.join(t, n), { recursive: !0 })));
}
async function v(t, e) {
  const n = i.join(t, "project.json"), a = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || i.basename(t),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await s.writeFile(n, JSON.stringify(a, null, 2), "utf-8"), a;
}
async function x(t) {
  try {
    return await s.access(t), !0;
  } catch {
    return !1;
  }
}
function M() {
  const t = /* @__PURE__ */ new Date(), e = (a) => String(a).padStart(2, "0"), n = `${t.getFullYear()}${e(t.getMonth() + 1)}${e(t.getDate())}`, r = `${e(t.getHours())}${e(t.getMinutes())}`;
  return `UNUProject_${n}_${r}`;
}
function C(t) {
  return String(t || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "";
}
async function P(t, e) {
  await x(t) && (await s.mkdir(i.dirname(e), { recursive: !0 }), await s.cp(t, e, { recursive: !0, force: !0 }));
}
async function z(t) {
  const e = i.join(t, "assets", "scripts");
  await s.mkdir(e, { recursive: !0 });
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
`
  };
  await Promise.all(
    Object.entries(n).map(([r, a]) => s.writeFile(i.join(e, r), a, "utf-8"))
  );
}
async function O(t) {
  const e = i.join(t, "assets", "images");
  await s.mkdir(e, { recursive: !0 });
  const n = b("player"), r = b("enemy"), a = b("chest");
  await Promise.all([
    s.writeFile(i.join(e, "player.png"), n),
    s.writeFile(i.join(e, "enemy.png"), r),
    s.writeFile(i.join(e, "chest.png"), a)
  ]);
}
async function I(t) {
  const e = i.join(t, "assets", "animations");
  await s.mkdir(e, { recursive: !0 });
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
    s.writeFile(i.join(e, "TorchFX.anim.json"), JSON.stringify(n, null, 2), "utf-8"),
    s.writeFile(i.join(e, "TorchSheet.atlas.json"), JSON.stringify(r, null, 2), "utf-8")
  ]);
}
async function W(t) {
  const e = i.join(t, "assets", "audio");
  await s.mkdir(e, { recursive: !0 }), await s.writeFile(i.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function B(t) {
  await Promise.all([
    z(t),
    O(t),
    I(t),
    W(t)
  ]);
}
function b(t) {
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
  return T.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r)}`).toPNG();
}
async function U(t, e) {
  const r = (await s.readdir(t, { withFileTypes: !0 })).sort((a, o) => Number(o.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(o.name));
  return Promise.all(
    r.map(async (a) => {
      const o = i.join(t, a.name), u = g(i.relative(e, o)) || ".", f = a.isDirectory(), w = {
        id: u,
        name: a.name,
        type: f ? "folder" : A(a.name),
        path: u,
        absolutePath: o,
        children: []
      };
      return f && (w.children = await U(o, e)), w;
    })
  );
}
async function L(t) {
  const e = i.extname(t).toLowerCase(), n = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", r = await s.readFile(t);
  return `data:${n};base64,${r.toString("base64")}`;
}
async function S(t, e, n) {
  await p(t);
  const r = i.join(t, n);
  await s.mkdir(r, { recursive: !0 });
  const a = [];
  for (const o of e) {
    const u = i.basename(o), f = i.join(r, u);
    await s.copyFile(o, f), a.push({
      fileName: u,
      relativePath: g(i.relative(t, f))
    });
  }
  return a;
}
async function X(t) {
  let e = t.filePath;
  if (!e) {
    const n = i.join(t.projectRoot || d.getPath("documents"), t.subdir || "", t.suggestedName || "Asset.json"), r = await m.showSaveDialog({
      title: t.title || "保存文本资源",
      defaultPath: n,
      filters: [{ name: t.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (r.canceled || !r.filePath) return null;
    e = r.filePath;
  }
  return await s.mkdir(i.dirname(e), { recursive: !0 }), await s.writeFile(e, t.content, "utf-8"), {
    filePath: e,
    name: i.basename(e),
    relativePath: t.projectRoot ? g(i.relative(t.projectRoot, e)) : void 0
  };
}
async function G(t) {
  var a;
  const e = await m.showOpenDialog({
    title: t.title || "打开文本资源",
    defaultPath: t.projectRoot ? i.join(t.projectRoot, t.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (a = t.extensions) != null && a.length ? t.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const n = e.filePaths[0], r = await s.readFile(n, "utf-8");
  return {
    filePath: n,
    name: i.basename(n),
    relativePath: t.projectRoot ? g(i.relative(t.projectRoot, n)) : void 0,
    content: r
  };
}
function F() {
  const t = new y({
    width: 1120,
    height: 700,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111318",
    webPreferences: {
      preload: i.join(k, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  R(t, "launcher"), d.isPackaged ? t.loadFile(i.join(d.getAppPath(), "dist", "index.html")) : (t.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && t.webContents.openDevTools({ mode: "detach" })), h = t, t.on("closed", () => {
    h === t && (h = null);
  });
}
function R(t, e) {
  if (!t || t.isDestroyed()) return;
  const n = E.getPrimaryDisplay().workAreaSize;
  if (e === "editor") {
    const o = Math.min(1680, Math.max(1200, n.width - 120)), u = Math.min(980, Math.max(760, n.height - 100));
    t.setSize(o, u, !0), t.center();
    return;
  }
  const r = Math.min(1180, Math.max(980, n.width - 220)), a = Math.min(760, Math.max(640, n.height - 180));
  t.setSize(r, a, !0), t.center();
}
function H(t) {
  d.isPackaged ? t.loadFile(i.join(d.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : t.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function q(t) {
  return j = t || null, h ? (!l || l.isDestroyed() ? (l = new y({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: h,
    webPreferences: {
      preload: i.join(k, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), H(l), l.on("closed", () => {
    l = null;
  })) : (l.isMinimized() && l.restore(), l.focus()), l.webContents.once("did-finish-load", () => {
    !l || l.isDestroyed() || l.webContents.send("unu:tilemap-editor-init", j);
  }), l.webContents.isLoadingMainFrame() ? { ok: !0 } : (l.webContents.send("unu:tilemap-editor-init", j), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
process.on("unhandledRejection", (t) => {
  console.error("[UNU][main] Unhandled promise rejection:", t);
});
process.on("uncaughtException", (t) => {
  console.error("[UNU][main] Uncaught exception:", t);
});
d.whenReady().then(() => {
  c.handle("unu:create-project", async () => {
    const t = await m.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await p(e), await v(e), {
      rootPath: e,
      name: i.basename(e),
      created: !0
    };
  }), c.handle("unu:create-project-v2", async (t, e) => {
    let n = String((e == null ? void 0 : e.parentDir) || "").trim();
    if (!n) {
      const u = await m.showOpenDialog({
        title: "新建 UNU 工程",
        properties: ["openDirectory", "createDirectory"]
      });
      if (u.canceled || u.filePaths.length === 0) return null;
      n = u.filePaths[0];
    }
    const r = await s.stat(n).catch(() => null);
    if (!(r != null && r.isDirectory()))
      throw new Error("无效的项目目录");
    const a = C(e == null ? void 0 : e.projectName) || M(), o = i.join(n, a);
    if (await x(o))
      throw new Error(`目标目录已存在: ${o}`);
    return await p(o), await v(o, a), {
      rootPath: o,
      name: a,
      parentDir: n,
      created: !0
    };
  }), c.handle("unu:pick-directory", async (t, e) => {
    const n = await m.showOpenDialog({
      title: (e == null ? void 0 : e.title) || "选择目标目录",
      defaultPath: e == null ? void 0 : e.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0];
    return {
      dirPath: r,
      name: i.basename(r)
    };
  }), c.handle("unu:pick-project-folder", async () => {
    const t = await m.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await p(e), {
      rootPath: e,
      name: i.basename(e)
    };
  }), c.handle("unu:save-project-as", async (t, e) => {
    var w;
    const n = await m.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], a = i.resolve(r), o = e.sourceProjectRoot ? i.resolve(e.sourceProjectRoot) : "";
    if (o && o !== "sample-project" && o === a)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await p(r);
    const u = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !u && o && await x(o) ? (await P(i.join(o, "assets"), i.join(r, "assets")), await P(i.join(o, "scenes"), i.join(r, "scenes")), await P(i.join(o, "prefabs"), i.join(r, "prefabs")), await P(i.join(o, "project.json"), i.join(r, "project.json"))) : await B(r), await v(r, e.projectName);
    let f;
    if (e.currentSceneContent) {
      const N = ((w = e.currentSceneName) == null ? void 0 : w.trim()) || "MainScene.scene.json";
      f = i.join(r, "scenes", N), await s.mkdir(i.dirname(f), { recursive: !0 }), await s.writeFile(f, e.currentSceneContent, "utf-8");
    }
    return {
      rootPath: r,
      name: i.basename(r),
      sceneFilePath: f,
      fromSample: u
    };
  }), c.handle("unu:scan-project", async (t, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    await p(e);
    const n = await U(e, e);
    return {
      rootPath: e,
      name: i.basename(e),
      tree: n
    };
  }), c.handle("unu:save-scene", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const r = i.join(e.projectRoot || d.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), a = await m.showSaveDialog({
        title: "保存场景",
        defaultPath: r,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (a.canceled || !a.filePath) return null;
      n = a.filePath;
    }
    return await s.mkdir(i.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: i.basename(n)
    };
  }), c.handle("unu:open-scene", async (t, e) => {
    const n = await m.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? i.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], a = await s.readFile(r, "utf-8");
    return {
      filePath: r,
      name: i.basename(r),
      content: a
    };
  }), c.handle("unu:read-asset-data-url", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = i.join(e.projectRoot, e.relativePath);
    return { dataUrl: await L(n) };
  }), c.handle("unu:import-images", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await m.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await S(e.projectRoot, n.filePaths, "assets/images") };
  }), c.handle("unu:import-audios", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await m.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await S(e.projectRoot, n.filePaths, "assets/audio") };
  }), c.handle("unu:save-prefab", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const r = i.join(e.projectRoot || d.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), a = await m.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: r,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (a.canceled || !a.filePath) return null;
      n = a.filePath;
    }
    return await s.mkdir(i.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: i.basename(n),
      relativePath: e.projectRoot ? g(i.relative(e.projectRoot, n)) : void 0
    };
  }), c.handle("unu:open-prefab", async (t, e) => {
    const n = await m.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? i.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const r = n.filePaths[0], a = await s.readFile(r, "utf-8");
    return {
      filePath: r,
      name: i.basename(r),
      relativePath: e.projectRoot ? g(i.relative(e.projectRoot, r)) : void 0,
      content: a
    };
  }), c.handle("unu:save-text-asset", async (t, e) => X(e)), c.handle("unu:open-text-asset", async (t, e) => G(e)), c.handle("unu:read-text-asset", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = i.join(e.projectRoot, e.relativePath), r = await s.readFile(n, "utf-8");
    return { filePath: n, name: i.basename(n), relativePath: e.relativePath, content: r };
  }), c.handle("unu:rename-project", async (t, e) => {
    const n = String((e == null ? void 0 : e.projectRoot) || "").trim(), r = String((e == null ? void 0 : e.nextName) || "").trim();
    if (!n || !r) return null;
    if (n === "sample-project")
      throw new Error("示例项目不支持重命名");
    if (/[\\/]/.test(r))
      throw new Error("项目名称不能包含路径分隔符");
    const a = i.resolve(n), o = await s.stat(a).catch(() => null);
    if (!o || !o.isDirectory())
      throw new Error("项目目录不存在");
    const u = i.dirname(a), f = i.join(u, r);
    if (i.resolve(f) === a)
      return {
        rootPath: a,
        name: r
      };
    if (await x(f))
      throw new Error("目标目录已存在");
    return await s.rename(a, f), {
      rootPath: f,
      name: r
    };
  }), c.handle("unu:delete-project", async (t, e) => {
    const n = String((e == null ? void 0 : e.projectRoot) || "").trim();
    if (!n) return { ok: !1 };
    if (n === "sample-project")
      throw new Error("示例项目不支持删除");
    const r = i.resolve(n), a = await s.stat(r).catch(() => null);
    return !a || !a.isDirectory() ? { ok: !1, error: "项目目录不存在" } : (await s.rm(r, { recursive: !0, force: !0 }), { ok: !0 });
  }), c.handle("unu:reveal-in-folder", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const n = i.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: n
      });
      const r = await s.stat(n).catch(() => null);
      if (!r)
        return { ok: !1, error: `Path not found: ${n}` };
      if (e.isDirectory || r.isDirectory()) {
        const a = await D.openPath(n);
        return { ok: !a, error: a || void 0 };
      }
      return D.showItemInFolder(n), { ok: !0 };
    } catch (r) {
      return { ok: !1, error: r instanceof Error ? r.message : String(r) };
    }
  }), c.handle("unu:open-tilemap-editor", async (t, e) => q(e)), c.handle("unu:tilemap-editor-update", async (t, e) => !h || h.isDestroyed() ? { ok: !1, error: "Main window not available" } : (h.webContents.send("unu:tilemap-editor-apply", e), j = { ...j || {}, ...e || {} }, { ok: !0 })), c.handle("unu:close-tilemap-editor", async () => (l && !l.isDestroyed() && l.close(), l = null, { ok: !0 })), c.handle("unu:set-main-window-preset", async (t, e) => !h || h.isDestroyed() ? { ok: !1, error: "main window not ready" } : e !== "launcher" && e !== "editor" ? { ok: !1, error: "invalid preset" } : (R(h, e), { ok: !0 })), F(), d.on("activate", () => {
    y.getAllWindows().length === 0 && F();
  });
});
d.on("window-all-closed", () => {
  process.platform !== "darwin" && d.quit();
});
