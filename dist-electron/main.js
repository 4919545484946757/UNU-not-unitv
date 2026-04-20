import { app as f, ipcMain as l, dialog as u, shell as y, BrowserWindow as v, nativeImage as T } from "electron";
import * as s from "node:fs/promises";
import r from "node:path";
import { fileURLToPath as E } from "node:url";
const N = E(import.meta.url), D = r.dirname(N);
let h = null, c = null, j = null;
function p(t) {
  return t.split(r.sep).join("/");
}
function C(t) {
  const e = r.extname(t).toLowerCase();
  return t.endsWith(".anim.json") ? "animation" : t.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : t.endsWith(".scene.json") ? "scene" : t.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "folder";
}
async function w(t) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((n) => s.mkdir(r.join(t, n), { recursive: !0 })));
}
async function b(t, e) {
  const n = r.join(t, "project.json"), a = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || r.basename(t),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await s.writeFile(n, JSON.stringify(a, null, 2), "utf-8"), a;
}
async function U(t) {
  try {
    return await s.access(t), !0;
  } catch {
    return !1;
  }
}
async function P(t, e) {
  await U(t) && (await s.mkdir(r.dirname(e), { recursive: !0 }), await s.cp(t, e, { recursive: !0, force: !0 }));
}
async function A(t) {
  const e = r.join(t, "assets", "scripts");
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
    Object.entries(n).map(([i, a]) => s.writeFile(r.join(e, i), a, "utf-8"))
  );
}
async function _(t) {
  const e = r.join(t, "assets", "images");
  await s.mkdir(e, { recursive: !0 });
  const n = x("player"), i = x("enemy"), a = x("chest");
  await Promise.all([
    s.writeFile(r.join(e, "player.png"), n),
    s.writeFile(r.join(e, "enemy.png"), i),
    s.writeFile(r.join(e, "chest.png"), a)
  ]);
}
async function $(t) {
  const e = r.join(t, "assets", "animations");
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
  }, i = {
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
    s.writeFile(r.join(e, "TorchFX.anim.json"), JSON.stringify(n, null, 2), "utf-8"),
    s.writeFile(r.join(e, "TorchSheet.atlas.json"), JSON.stringify(i, null, 2), "utf-8")
  ]);
}
async function I(t) {
  const e = r.join(t, "assets", "audio");
  await s.mkdir(e, { recursive: !0 }), await s.writeFile(r.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function O(t) {
  await Promise.all([
    A(t),
    _(t),
    $(t),
    I(t)
  ]);
}
function x(t) {
  const n = t === "player" ? { bg: "#0E2A47", accent: "#56CCF2", stroke: "#BDEBFF", symbol: "P" } : t === "enemy" ? { bg: "#3A1518", accent: "#EB5757", stroke: "#FFC4C4", symbol: "E" } : { bg: "#3A2A11", accent: "#F2C94C", stroke: "#FFE8A3", symbol: "C" }, i = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
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
  return T.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(i)}`).toPNG();
}
async function R(t, e) {
  const i = (await s.readdir(t, { withFileTypes: !0 })).sort((a, o) => Number(o.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(o.name));
  return Promise.all(
    i.map(async (a) => {
      const o = r.join(t, a.name), d = p(r.relative(e, o)) || ".", m = a.isDirectory(), g = {
        id: d,
        name: a.name,
        type: m ? "folder" : C(a.name),
        path: d,
        absolutePath: o,
        children: []
      };
      return m && (g.children = await R(o, e)), g;
    })
  );
}
async function z(t) {
  const e = r.extname(t).toLowerCase(), n = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", i = await s.readFile(t);
  return `data:${n};base64,${i.toString("base64")}`;
}
async function F(t, e, n) {
  await w(t);
  const i = r.join(t, n);
  await s.mkdir(i, { recursive: !0 });
  const a = [];
  for (const o of e) {
    const d = r.basename(o), m = r.join(i, d);
    await s.copyFile(o, m), a.push({
      fileName: d,
      relativePath: p(r.relative(t, m))
    });
  }
  return a;
}
async function M(t) {
  let e = t.filePath;
  if (!e) {
    const n = r.join(t.projectRoot || f.getPath("documents"), t.subdir || "", t.suggestedName || "Asset.json"), i = await u.showSaveDialog({
      title: t.title || "保存文本资源",
      defaultPath: n,
      filters: [{ name: t.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (i.canceled || !i.filePath) return null;
    e = i.filePath;
  }
  return await s.mkdir(r.dirname(e), { recursive: !0 }), await s.writeFile(e, t.content, "utf-8"), {
    filePath: e,
    name: r.basename(e),
    relativePath: t.projectRoot ? p(r.relative(t.projectRoot, e)) : void 0
  };
}
async function W(t) {
  var a;
  const e = await u.showOpenDialog({
    title: t.title || "打开文本资源",
    defaultPath: t.projectRoot ? r.join(t.projectRoot, t.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (a = t.extensions) != null && a.length ? t.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const n = e.filePaths[0], i = await s.readFile(n, "utf-8");
  return {
    filePath: n,
    name: r.basename(n),
    relativePath: t.projectRoot ? p(r.relative(t.projectRoot, n)) : void 0,
    content: i
  };
}
function S() {
  const t = new v({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: "#111318",
    webPreferences: {
      preload: r.join(D, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  f.isPackaged ? t.loadFile(r.join(f.getAppPath(), "dist", "index.html")) : (t.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && t.webContents.openDevTools({ mode: "detach" })), h = t, t.on("closed", () => {
    h === t && (h = null);
  });
}
function B(t) {
  f.isPackaged ? t.loadFile(r.join(f.getAppPath(), "dist", "index.html"), {
    query: { tilemapEditor: "1" }
  }) : t.loadURL("http://localhost:5173/?tilemapEditor=1");
}
function L(t) {
  return j = t || null, h ? (!c || c.isDestroyed() ? (c = new v({
    width: 1200,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: "Tilemap Graphical Editor",
    backgroundColor: "#0f1420",
    parent: h,
    webPreferences: {
      preload: r.join(D, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  }), B(c), c.on("closed", () => {
    c = null;
  })) : (c.isMinimized() && c.restore(), c.focus()), c.webContents.once("did-finish-load", () => {
    !c || c.isDestroyed() || c.webContents.send("unu:tilemap-editor-init", j);
  }), c.webContents.isLoadingMainFrame() ? { ok: !0 } : (c.webContents.send("unu:tilemap-editor-init", j), { ok: !0 })) : { ok: !1, error: "Main window not ready" };
}
process.on("unhandledRejection", (t) => {
  console.error("[UNU][main] Unhandled promise rejection:", t);
});
process.on("uncaughtException", (t) => {
  console.error("[UNU][main] Uncaught exception:", t);
});
f.whenReady().then(() => {
  l.handle("unu:create-project", async () => {
    const t = await u.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await w(e), await b(e), {
      rootPath: e,
      name: r.basename(e),
      created: !0
    };
  }), l.handle("unu:pick-project-folder", async () => {
    const t = await u.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await w(e), {
      rootPath: e,
      name: r.basename(e)
    };
  }), l.handle("unu:save-project-as", async (t, e) => {
    var g;
    const n = await u.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const i = n.filePaths[0], a = r.resolve(i), o = e.sourceProjectRoot ? r.resolve(e.sourceProjectRoot) : "";
    if (o && o !== "sample-project" && o === a)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await w(i);
    const d = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !d && o && await U(o) ? (await P(r.join(o, "assets"), r.join(i, "assets")), await P(r.join(o, "scenes"), r.join(i, "scenes")), await P(r.join(o, "prefabs"), r.join(i, "prefabs")), await P(r.join(o, "project.json"), r.join(i, "project.json"))) : await O(i), await b(i, e.projectName);
    let m;
    if (e.currentSceneContent) {
      const k = ((g = e.currentSceneName) == null ? void 0 : g.trim()) || "MainScene.scene.json";
      m = r.join(i, "scenes", k), await s.mkdir(r.dirname(m), { recursive: !0 }), await s.writeFile(m, e.currentSceneContent, "utf-8");
    }
    return {
      rootPath: i,
      name: r.basename(i),
      sceneFilePath: m,
      fromSample: d
    };
  }), l.handle("unu:scan-project", async (t, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    await w(e);
    const n = await R(e, e);
    return {
      rootPath: e,
      name: r.basename(e),
      tree: n
    };
  }), l.handle("unu:save-scene", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const i = r.join(e.projectRoot || f.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), a = await u.showSaveDialog({
        title: "保存场景",
        defaultPath: i,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (a.canceled || !a.filePath) return null;
      n = a.filePath;
    }
    return await s.mkdir(r.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: r.basename(n)
    };
  }), l.handle("unu:open-scene", async (t, e) => {
    const n = await u.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? r.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const i = n.filePaths[0], a = await s.readFile(i, "utf-8");
    return {
      filePath: i,
      name: r.basename(i),
      content: a
    };
  }), l.handle("unu:read-asset-data-url", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = r.join(e.projectRoot, e.relativePath);
    return { dataUrl: await z(n) };
  }), l.handle("unu:import-images", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await u.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await F(e.projectRoot, n.filePaths, "assets/images") };
  }), l.handle("unu:import-audios", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await u.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await F(e.projectRoot, n.filePaths, "assets/audio") };
  }), l.handle("unu:save-prefab", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const i = r.join(e.projectRoot || f.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), a = await u.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: i,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (a.canceled || !a.filePath) return null;
      n = a.filePath;
    }
    return await s.mkdir(r.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: r.basename(n),
      relativePath: e.projectRoot ? p(r.relative(e.projectRoot, n)) : void 0
    };
  }), l.handle("unu:open-prefab", async (t, e) => {
    const n = await u.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? r.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const i = n.filePaths[0], a = await s.readFile(i, "utf-8");
    return {
      filePath: i,
      name: r.basename(i),
      relativePath: e.projectRoot ? p(r.relative(e.projectRoot, i)) : void 0,
      content: a
    };
  }), l.handle("unu:save-text-asset", async (t, e) => M(e)), l.handle("unu:open-text-asset", async (t, e) => W(e)), l.handle("unu:read-text-asset", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = r.join(e.projectRoot, e.relativePath), i = await s.readFile(n, "utf-8");
    return { filePath: n, name: r.basename(n), relativePath: e.relativePath, content: i };
  }), l.handle("unu:reveal-in-folder", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const n = r.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: n
      });
      const i = await s.stat(n).catch(() => null);
      if (!i)
        return { ok: !1, error: `Path not found: ${n}` };
      if (e.isDirectory || i.isDirectory()) {
        const a = await y.openPath(n);
        return { ok: !a, error: a || void 0 };
      }
      return y.showItemInFolder(n), { ok: !0 };
    } catch (i) {
      return { ok: !1, error: i instanceof Error ? i.message : String(i) };
    }
  }), l.handle("unu:open-tilemap-editor", async (t, e) => L(e)), l.handle("unu:tilemap-editor-update", async (t, e) => !h || h.isDestroyed() ? { ok: !1, error: "Main window not available" } : (h.webContents.send("unu:tilemap-editor-apply", e), j = { ...j || {}, ...e || {} }, { ok: !0 })), l.handle("unu:close-tilemap-editor", async () => (c && !c.isDestroyed() && c.close(), c = null, { ok: !0 })), S(), f.on("activate", () => {
    v.getAllWindows().length === 0 && S();
  });
});
f.on("window-all-closed", () => {
  process.platform !== "darwin" && f.quit();
});
