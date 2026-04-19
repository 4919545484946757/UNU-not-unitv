import { app as f, ipcMain as c, dialog as l, shell as j, BrowserWindow as y, nativeImage as D } from "electron";
import * as i from "node:fs/promises";
import r from "node:path";
import { fileURLToPath as U } from "node:url";
const R = U(import.meta.url), T = r.dirname(R);
function h(t) {
  return t.split(r.sep).join("/");
}
function N(t) {
  const e = r.extname(t).toLowerCase();
  return t.endsWith(".anim.json") ? "animation" : t.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg", ".m4a"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : t.endsWith(".scene.json") ? "scene" : t.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "folder";
}
async function d(t) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((n) => i.mkdir(r.join(t, n), { recursive: !0 })));
}
async function P(t, e) {
  const n = r.join(t, "project.json"), s = {
    format: "unu-project",
    version: 1,
    name: (e == null ? void 0 : e.trim()) || r.basename(t),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await i.writeFile(n, JSON.stringify(s, null, 2), "utf-8"), s;
}
async function b(t) {
  try {
    return await i.access(t), !0;
  } catch {
    return !1;
  }
}
async function g(t, e) {
  await b(t) && (await i.mkdir(r.dirname(e), { recursive: !0 }), await i.cp(t, e, { recursive: !0, force: !0 }));
}
async function k(t) {
  const e = r.join(t, "assets", "scripts");
  await i.mkdir(e, { recursive: !0 });
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
    Object.entries(n).map(([a, s]) => i.writeFile(r.join(e, a), s, "utf-8"))
  );
}
async function A(t) {
  const e = r.join(t, "assets", "images");
  await i.mkdir(e, { recursive: !0 });
  const n = w("player"), a = w("enemy"), s = w("chest");
  await Promise.all([
    i.writeFile(r.join(e, "player.png"), n),
    i.writeFile(r.join(e, "enemy.png"), a),
    i.writeFile(r.join(e, "chest.png"), s)
  ]);
}
async function $(t) {
  const e = r.join(t, "assets", "animations");
  await i.mkdir(e, { recursive: !0 });
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
  }, a = {
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
    i.writeFile(r.join(e, "TorchFX.anim.json"), JSON.stringify(n, null, 2), "utf-8"),
    i.writeFile(r.join(e, "TorchSheet.atlas.json"), JSON.stringify(a, null, 2), "utf-8")
  ]);
}
async function E(t) {
  const e = r.join(t, "assets", "audio");
  await i.mkdir(e, { recursive: !0 }), await i.writeFile(r.join(e, "bgm.mp3"), Buffer.alloc(0));
}
async function _(t) {
  await Promise.all([
    k(t),
    A(t),
    $(t),
    E(t)
  ]);
}
function w(t) {
  const n = t === "player" ? { bg: "#0E2A47", accent: "#56CCF2", stroke: "#BDEBFF", symbol: "P" } : t === "enemy" ? { bg: "#3A1518", accent: "#EB5757", stroke: "#FFC4C4", symbol: "E" } : { bg: "#3A2A11", accent: "#F2C94C", stroke: "#FFE8A3", symbol: "C" }, a = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
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
  return D.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(a)}`).toPNG();
}
async function F(t, e) {
  const a = (await i.readdir(t, { withFileTypes: !0 })).sort((s, o) => Number(o.isDirectory()) - Number(s.isDirectory()) || s.name.localeCompare(o.name));
  return Promise.all(
    a.map(async (s) => {
      const o = r.join(t, s.name), m = h(r.relative(e, o)) || ".", u = s.isDirectory(), p = {
        id: m,
        name: s.name,
        type: u ? "folder" : N(s.name),
        path: m,
        absolutePath: o,
        children: []
      };
      return u && (p.children = await F(o, e)), p;
    })
  );
}
async function C(t) {
  const e = r.extname(t).toLowerCase(), n = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : e === ".mp3" ? "audio/mpeg" : e === ".wav" ? "audio/wav" : e === ".ogg" ? "audio/ogg" : e === ".m4a" ? "audio/mp4" : "application/octet-stream", a = await i.readFile(t);
  return `data:${n};base64,${a.toString("base64")}`;
}
async function x(t, e, n) {
  await d(t);
  const a = r.join(t, n);
  await i.mkdir(a, { recursive: !0 });
  const s = [];
  for (const o of e) {
    const m = r.basename(o), u = r.join(a, m);
    await i.copyFile(o, u), s.push({
      fileName: m,
      relativePath: h(r.relative(t, u))
    });
  }
  return s;
}
async function O(t) {
  let e = t.filePath;
  if (!e) {
    const n = r.join(t.projectRoot || f.getPath("documents"), t.subdir || "", t.suggestedName || "Asset.json"), a = await l.showSaveDialog({
      title: t.title || "保存文本资源",
      defaultPath: n,
      filters: [{ name: t.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (a.canceled || !a.filePath) return null;
    e = a.filePath;
  }
  return await i.mkdir(r.dirname(e), { recursive: !0 }), await i.writeFile(e, t.content, "utf-8"), {
    filePath: e,
    name: r.basename(e),
    relativePath: t.projectRoot ? h(r.relative(t.projectRoot, e)) : void 0
  };
}
async function I(t) {
  var s;
  const e = await l.showOpenDialog({
    title: t.title || "打开文本资源",
    defaultPath: t.projectRoot ? r.join(t.projectRoot, t.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (s = t.extensions) != null && s.length ? t.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const n = e.filePaths[0], a = await i.readFile(n, "utf-8");
  return {
    filePath: n,
    name: r.basename(n),
    relativePath: t.projectRoot ? h(r.relative(t.projectRoot, n)) : void 0,
    content: a
  };
}
function v() {
  const t = new y({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: "#111318",
    webPreferences: {
      preload: r.join(T, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  f.isPackaged ? t.loadFile(r.join(f.getAppPath(), "dist", "index.html")) : (t.loadURL("http://localhost:5173"), process.env.UNU_OPEN_DEVTOOLS === "1" && t.webContents.openDevTools({ mode: "detach" }));
}
process.on("unhandledRejection", (t) => {
  console.error("[UNU][main] Unhandled promise rejection:", t);
});
process.on("uncaughtException", (t) => {
  console.error("[UNU][main] Uncaught exception:", t);
});
f.whenReady().then(() => {
  c.handle("unu:create-project", async () => {
    const t = await l.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await d(e), await P(e), {
      rootPath: e,
      name: r.basename(e),
      created: !0
    };
  }), c.handle("unu:pick-project-folder", async () => {
    const t = await l.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await d(e), {
      rootPath: e,
      name: r.basename(e)
    };
  }), c.handle("unu:save-project-as", async (t, e) => {
    var p;
    const n = await l.showOpenDialog({
      title: "项目另存为",
      properties: ["openDirectory", "createDirectory"]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const a = n.filePaths[0], s = r.resolve(a), o = e.sourceProjectRoot ? r.resolve(e.sourceProjectRoot) : "";
    if (o && o !== "sample-project" && o === s)
      throw new Error("目标目录与当前工程目录相同，请选择其他目录。");
    await d(a);
    const m = !e.sourceProjectRoot || e.sourceProjectRoot === "sample-project";
    !m && o && await b(o) ? (await g(r.join(o, "assets"), r.join(a, "assets")), await g(r.join(o, "scenes"), r.join(a, "scenes")), await g(r.join(o, "prefabs"), r.join(a, "prefabs")), await g(r.join(o, "project.json"), r.join(a, "project.json"))) : await _(a), await P(a, e.projectName);
    let u;
    if (e.currentSceneContent) {
      const S = ((p = e.currentSceneName) == null ? void 0 : p.trim()) || "MainScene.scene.json";
      u = r.join(a, "scenes", S), await i.mkdir(r.dirname(u), { recursive: !0 }), await i.writeFile(u, e.currentSceneContent, "utf-8");
    }
    return {
      rootPath: a,
      name: r.basename(a),
      sceneFilePath: u,
      fromSample: m
    };
  }), c.handle("unu:scan-project", async (t, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    await d(e);
    const n = await F(e, e);
    return {
      rootPath: e,
      name: r.basename(e),
      tree: n
    };
  }), c.handle("unu:save-scene", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const a = r.join(e.projectRoot || f.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), s = await l.showSaveDialog({
        title: "保存场景",
        defaultPath: a,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (s.canceled || !s.filePath) return null;
      n = s.filePath;
    }
    return await i.mkdir(r.dirname(n), { recursive: !0 }), await i.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: r.basename(n)
    };
  }), c.handle("unu:open-scene", async (t, e) => {
    const n = await l.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? r.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const a = n.filePaths[0], s = await i.readFile(a, "utf-8");
    return {
      filePath: a,
      name: r.basename(a),
      content: s
    };
  }), c.handle("unu:read-asset-data-url", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = r.join(e.projectRoot, e.relativePath);
    return { dataUrl: await C(n) };
  }), c.handle("unu:import-images", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await l.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await x(e.projectRoot, n.filePaths, "assets/images") };
  }), c.handle("unu:import-audios", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await l.showOpenDialog({
      title: "导入音频资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await x(e.projectRoot, n.filePaths, "assets/audio") };
  }), c.handle("unu:save-prefab", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const a = r.join(e.projectRoot || f.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), s = await l.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: a,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (s.canceled || !s.filePath) return null;
      n = s.filePath;
    }
    return await i.mkdir(r.dirname(n), { recursive: !0 }), await i.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: r.basename(n),
      relativePath: e.projectRoot ? h(r.relative(e.projectRoot, n)) : void 0
    };
  }), c.handle("unu:open-prefab", async (t, e) => {
    const n = await l.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? r.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const a = n.filePaths[0], s = await i.readFile(a, "utf-8");
    return {
      filePath: a,
      name: r.basename(a),
      relativePath: e.projectRoot ? h(r.relative(e.projectRoot, a)) : void 0,
      content: s
    };
  }), c.handle("unu:save-text-asset", async (t, e) => O(e)), c.handle("unu:open-text-asset", async (t, e) => I(e)), c.handle("unu:read-text-asset", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = r.join(e.projectRoot, e.relativePath), a = await i.readFile(n, "utf-8");
    return { filePath: n, name: r.basename(n), relativePath: e.relativePath, content: a };
  }), c.handle("unu:reveal-in-folder", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const n = r.join(e.projectRoot, e.relativePath);
    try {
      console.log("[UNU][main] reveal-in-folder request:", {
        projectRoot: e.projectRoot,
        relativePath: e.relativePath,
        isDirectory: e.isDirectory,
        targetPath: n
      });
      const a = await i.stat(n).catch(() => null);
      if (!a)
        return { ok: !1, error: `Path not found: ${n}` };
      if (e.isDirectory || a.isDirectory()) {
        const s = await j.openPath(n);
        return { ok: !s, error: s || void 0 };
      }
      return j.showItemInFolder(n), { ok: !0 };
    } catch (a) {
      return { ok: !1, error: a instanceof Error ? a.message : String(a) };
    }
  }), v(), f.on("activate", () => {
    y.getAllWindows().length === 0 && v();
  });
});
f.on("window-all-closed", () => {
  process.platform !== "darwin" && f.quit();
});
