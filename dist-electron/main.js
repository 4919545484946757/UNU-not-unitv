import { app as u, ipcMain as o, dialog as l, shell as g, BrowserWindow as P } from "electron";
import * as s from "node:fs/promises";
import a from "node:path";
import { fileURLToPath as v } from "node:url";
const b = v(import.meta.url), x = a.dirname(b);
function d(t) {
  return t.split(a.sep).join("/");
}
function U(t) {
  const e = a.extname(t).toLowerCase();
  return t.endsWith(".anim.json") ? "animation" : t.endsWith(".atlas.json") ? "atlas" : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(e) ? "image" : [".mp3", ".wav", ".ogg"].includes(e) ? "audio" : [".js", ".ts", ".mjs"].includes(e) ? "script" : t.endsWith(".scene.json") ? "scene" : t.endsWith(".prefab.json") ? "prefab" : [".json"].includes(e) ? "animation" : "folder";
}
async function m(t) {
  const e = [
    "assets",
    "assets/images",
    "assets/audio",
    "assets/scripts",
    "assets/animations",
    "scenes",
    "prefabs"
  ];
  await Promise.all(e.map((n) => s.mkdir(a.join(t, n), { recursive: !0 })));
}
async function D(t) {
  const e = a.join(t, "project.json"), i = {
    format: "unu-project",
    version: 1,
    name: a.basename(t),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await s.writeFile(e, JSON.stringify(i, null, 2), "utf-8"), i;
}
async function j(t, e) {
  const i = (await s.readdir(t, { withFileTypes: !0 })).sort((r, c) => Number(c.isDirectory()) - Number(r.isDirectory()) || r.name.localeCompare(c.name));
  return Promise.all(
    i.map(async (r) => {
      const c = a.join(t, r.name), f = d(a.relative(e, c)) || ".", h = r.isDirectory(), p = {
        id: f,
        name: r.name,
        type: h ? "folder" : U(r.name),
        path: f,
        absolutePath: c,
        children: []
      };
      return h && (p.children = await j(c, e)), p;
    })
  );
}
async function F(t) {
  const e = a.extname(t).toLowerCase(), n = e === ".png" ? "image/png" : e === ".jpg" || e === ".jpeg" ? "image/jpeg" : e === ".webp" ? "image/webp" : e === ".gif" ? "image/gif" : "application/octet-stream", i = await s.readFile(t);
  return `data:${n};base64,${i.toString("base64")}`;
}
async function R(t, e, n) {
  await m(t);
  const i = a.join(t, n);
  await s.mkdir(i, { recursive: !0 });
  const r = [];
  for (const c of e) {
    const f = a.basename(c), h = a.join(i, f);
    await s.copyFile(c, h), r.push({
      fileName: f,
      relativePath: d(a.relative(t, h))
    });
  }
  return r;
}
async function N(t) {
  let e = t.filePath;
  if (!e) {
    const n = a.join(t.projectRoot || u.getPath("documents"), t.subdir || "", t.suggestedName || "Asset.json"), i = await l.showSaveDialog({
      title: t.title || "保存文本资源",
      defaultPath: n,
      filters: [{ name: t.filterName || "Text Asset", extensions: ["json", "txt"] }]
    });
    if (i.canceled || !i.filePath) return null;
    e = i.filePath;
  }
  return await s.mkdir(a.dirname(e), { recursive: !0 }), await s.writeFile(e, t.content, "utf-8"), {
    filePath: e,
    name: a.basename(e),
    relativePath: t.projectRoot ? d(a.relative(t.projectRoot, e)) : void 0
  };
}
async function _(t) {
  var r;
  const e = await l.showOpenDialog({
    title: t.title || "打开文本资源",
    defaultPath: t.projectRoot ? a.join(t.projectRoot, t.defaultSubdir || "") : void 0,
    properties: ["openFile"],
    filters: [{ name: "Text Asset", extensions: (r = t.extensions) != null && r.length ? t.extensions : ["json", "txt", "js", "ts"] }]
  });
  if (e.canceled || e.filePaths.length === 0) return null;
  const n = e.filePaths[0], i = await s.readFile(n, "utf-8");
  return {
    filePath: n,
    name: a.basename(n),
    relativePath: t.projectRoot ? d(a.relative(t.projectRoot, n)) : void 0,
    content: i
  };
}
function w() {
  const t = new P({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: "#111318",
    webPreferences: {
      preload: a.join(x, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  u.isPackaged ? t.loadFile(a.join(u.getAppPath(), "dist", "index.html")) : (t.loadURL("http://localhost:5173"), t.webContents.openDevTools({ mode: "detach" }));
}
process.on("unhandledRejection", (t) => {
  console.error("[UNU][main] Unhandled promise rejection:", t);
});
process.on("uncaughtException", (t) => {
  console.error("[UNU][main] Uncaught exception:", t);
});
u.whenReady().then(() => {
  o.handle("unu:create-project", async () => {
    const t = await l.showOpenDialog({
      title: "新建 UNU 工程",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await m(e), await D(e), {
      rootPath: e,
      name: a.basename(e),
      created: !0
    };
  }), o.handle("unu:pick-project-folder", async () => {
    const t = await l.showOpenDialog({
      title: "选择 UNU 工程目录",
      properties: ["openDirectory", "createDirectory"]
    });
    if (t.canceled || t.filePaths.length === 0) return null;
    const e = t.filePaths[0];
    return await m(e), {
      rootPath: e,
      name: a.basename(e)
    };
  }), o.handle("unu:scan-project", async (t, e) => {
    if (!e) return { rootPath: "", name: "", tree: [] };
    await m(e);
    const n = await j(e, e);
    return {
      rootPath: e,
      name: a.basename(e),
      tree: n
    };
  }), o.handle("unu:save-scene", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const i = a.join(e.projectRoot || u.getPath("documents"), "scenes", e.suggestedName || "Main.scene.json"), r = await l.showSaveDialog({
        title: "保存场景",
        defaultPath: i,
        filters: [{ name: "UNU Scene", extensions: ["json"] }]
      });
      if (r.canceled || !r.filePath) return null;
      n = r.filePath;
    }
    return await s.mkdir(a.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: a.basename(n)
    };
  }), o.handle("unu:open-scene", async (t, e) => {
    const n = await l.showOpenDialog({
      title: "打开场景",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "scenes") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Scene", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const i = n.filePaths[0], r = await s.readFile(i, "utf-8");
    return {
      filePath: i,
      name: a.basename(i),
      content: r
    };
  }), o.handle("unu:read-asset-data-url", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = a.join(e.projectRoot, e.relativePath);
    return { dataUrl: await F(n) };
  }), o.handle("unu:import-images", async (t, e) => {
    if (!e.projectRoot) return null;
    const n = await l.showOpenDialog({
      title: "导入图片资源",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return n.canceled || n.filePaths.length === 0 ? null : { imported: await R(e.projectRoot, n.filePaths, "assets/images") };
  }), o.handle("unu:save-prefab", async (t, e) => {
    let n = e.filePath;
    if (!n) {
      const i = a.join(e.projectRoot || u.getPath("documents"), "prefabs", e.suggestedName || "Entity.prefab.json"), r = await l.showSaveDialog({
        title: "保存 Prefab",
        defaultPath: i,
        filters: [{ name: "UNU Prefab", extensions: ["json"] }]
      });
      if (r.canceled || !r.filePath) return null;
      n = r.filePath;
    }
    return await s.mkdir(a.dirname(n), { recursive: !0 }), await s.writeFile(n, e.content, "utf-8"), {
      filePath: n,
      name: a.basename(n)
    };
  }), o.handle("unu:open-prefab", async (t, e) => {
    const n = await l.showOpenDialog({
      title: "打开 Prefab",
      defaultPath: e.projectRoot ? a.join(e.projectRoot, "prefabs") : void 0,
      properties: ["openFile"],
      filters: [{ name: "UNU Prefab", extensions: ["json"] }]
    });
    if (n.canceled || n.filePaths.length === 0) return null;
    const i = n.filePaths[0], r = await s.readFile(i, "utf-8");
    return {
      filePath: i,
      name: a.basename(i),
      content: r
    };
  }), o.handle("unu:save-text-asset", async (t, e) => N(e)), o.handle("unu:open-text-asset", async (t, e) => _(e)), o.handle("unu:read-text-asset", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return null;
    const n = a.join(e.projectRoot, e.relativePath), i = await s.readFile(n, "utf-8");
    return { filePath: n, name: a.basename(n), relativePath: e.relativePath, content: i };
  }), o.handle("unu:reveal-in-folder", async (t, e) => {
    if (!e.projectRoot || !e.relativePath) return { ok: !1 };
    const n = a.join(e.projectRoot, e.relativePath);
    try {
      if (e.isDirectory) {
        const i = await g.openPath(n);
        return { ok: !i, error: i || void 0 };
      }
      return g.showItemInFolder(n), { ok: !0 };
    } catch (i) {
      return { ok: !1, error: i instanceof Error ? i.message : String(i) };
    }
  }), w(), u.on("activate", () => {
    P.getAllWindows().length === 0 && w();
  });
});
u.on("window-all-closed", () => {
  process.platform !== "darwin" && u.quit();
});
