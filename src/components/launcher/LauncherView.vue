<template>
  <div class="launcher-shell">
    <div class="hero">
      <h1>UNU Engine</h1>
      <p>选择项目后进入编辑器</p>
    </div>

    <div class="actions">
      <button @click="pickProjectFolder">打开本地项目</button>
      <button class="primary" @click="openCreateDialog">新建项目</button>
      <button class="ghost danger-text" :disabled="clearingData" @click="clearApplicationData">
        {{ clearingData ? '清理中...' : '清理应用数据' }}
      </button>
    </div>

    <section class="samples">
      <div class="section-head">
        <h2>示例项目</h2>
      </div>
      <div class="sample-list">
        <article v-for="sample in samples" :key="sample.id" class="sample-card" :class="{ unavailable: !sample.available }">
          <div class="sample-title">{{ sample.title }}</div>
          <div class="sample-desc">{{ sample.description }}</div>
          <div class="sample-actions">
            <button class="small primary" :disabled="!sample.available" @click="openSampleProject(sample)">
              {{ sample.available ? '打开示例' : '即将推出' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="history">
      <div class="section-head">
        <h2>历史项目</h2>
        <button class="ghost" @click="refreshHistory">刷新</button>
      </div>
      <div v-if="loading" class="empty">正在读取历史项目...</div>
      <div v-else-if="!history.length" class="empty">暂无历史项目</div>
      <div v-else class="history-list">
        <article v-for="item in history" :key="item.rootPath" class="history-item">
          <div class="meta" @dblclick="openProject(item)">
            <div class="name">{{ item.name }}</div>
            <div class="path">{{ item.rootPath }}</div>
            <div class="time">最近打开：{{ formatTime(item.lastOpenedAt) }}</div>
          </div>
          <div class="item-actions">
            <button class="small primary" @click="openProject(item)">打开</button>
            <button class="small" @click="openRenameDialog(item)">重命名</button>
            <button class="small danger" @click="deleteProject(item)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <div v-if="createDialogVisible" class="create-dialog-mask" @click.self="closeCreateDialog">
      <div class="create-dialog">
        <div class="dialog-head">
          <div>
            <h3>新建项目</h3>
            <p>配置基础信息后创建工程</p>
          </div>
          <button class="close-btn" @click="closeCreateDialog">×</button>
        </div>

        <div class="create-form">
          <section class="form-section">
            <div class="section-title">基础信息</div>
            <div class="form-grid">
              <label class="field">
                <span>项目名称</span>
                <input
                  v-model="createForm.projectName"
                  type="text"
                  placeholder="留空则自动使用默认名称"
                  maxlength="80"
                >
              </label>

              <label class="field">
                <span>项目模板</span>
                <select v-model="createForm.template">
                  <option value="blank-2d">空白 2D 项目</option>
                  <option value="blank-3d">3D项目</option>
                </select>
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="section-title">存储位置</div>
            <label class="field">
              <span>目标目录</span>
              <div class="dir-row">
                <input
                  :value="createForm.parentDir"
                  type="text"
                  placeholder="留空则创建时选择目录"
                  readonly
                >
                <button @click="pickCreateParentDir">选择目录</button>
                <button class="ghost" @click="clearCreateParentDir">清空</button>
              </div>
            </label>
            <p class="hint">创建路径：目标目录 / 项目名称 / ...</p>
          </section>

          <section class="form-section settings-section">
            <div class="section-title">项目设置</div>
            <label class="field">
              <span>渲染方式</span>
              <select v-model="createForm.renderBackend">
                <option value="pixi">Pixi Renderer</option>
                <option value="canvas2d">原生 Canvas 2D</option>
                <option value="three">Three.js 3D</option>
              </select>
            </label>
            <label class="field">
              <span>物理后端</span>
              <select v-model="createForm.physicsBackend">
                <option value="none">None</option>
                <option value="cannon">Cannon-compatible</option>
                <option value="rapier">Rapier-compatible</option>
              </select>
            </label>
            <div class="setting-row">
              <span>默认场景</span>
              <strong>{{ createForm.template === 'blank-3d' ? 'MainScene (3D)' : 'MainScene' }}</strong>
            </div>
            <div class="setting-row">
              <span>资源目录</span>
              <strong>{{ createForm.template === 'blank-3d' ? 'assets / scenes / scripts / models / materials' : 'assets / scenes / scripts' }}</strong>
            </div>
          </section>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>

        <div class="dialog-actions">
          <button class="ghost" :disabled="creatingProject" @click="closeCreateDialog">取消</button>
          <button class="primary" :disabled="creatingProject" @click="submitCreateProject">
            {{ creatingProject ? '创建中...' : '创建并打开' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="renameDialogVisible" class="create-dialog-mask" @click.self="closeRenameDialog">
      <div class="create-dialog rename-dialog">
        <div class="dialog-head">
          <h3>重命名项目</h3>
          <button class="close-btn" @click="closeRenameDialog">×</button>
        </div>

        <div class="rename-form-body">
          <label class="field">
            <span>当前项目</span>
            <input :value="renameForm.currentName" type="text" readonly>
          </label>

          <label class="field">
            <span>新项目名称</span>
            <input
              v-model="renameForm.nextName"
              type="text"
              placeholder="输入新的项目名称"
              maxlength="80"
              @keydown.enter.prevent="submitRenameProject"
            >
          </label>

          <p class="hint">项目目录将被重命名，内部配置会自动同步。</p>
          <p v-if="renameError" class="error">{{ renameError }}</p>
        </div>

        <div class="dialog-actions">
          <button class="ghost" :disabled="renamingProject" @click="closeRenameDialog">取消</button>
          <button class="primary" :disabled="renamingProject" @click="submitRenameProject">
            {{ renamingProject ? '重命名中...' : '确认重命名' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fallbackSampleProjectCatalog, type SampleProjectEntry } from '../../engine/project/sampleCatalog'

interface HistoryProject {
  rootPath: string
  name: string
  lastOpenedAt: number
}

const emit = defineEmits<{
  (e: 'open-project', payload: { rootPath: string; name: string; sampleProjectId?: string }): void
}>()

const HISTORY_KEY = 'unu-launcher-history-v1'
const MAX_HISTORY = 24
const loading = ref(false)
const clearingData = ref(false)
const history = ref<HistoryProject[]>([])
const samples = ref<SampleProjectEntry[]>(fallbackSampleProjectCatalog)

const createDialogVisible = ref(false)
const creatingProject = ref(false)
const createError = ref('')
const createForm = ref({
  projectName: '',
  parentDir: '',
  template: 'blank-2d',
  renderBackend: 'pixi' as UnuProjectRenderBackend,
  physicsBackend: 'none' as UnuProjectPhysicsBackend
})

const renameDialogVisible = ref(false)
const renamingProject = ref(false)
const renameError = ref('')
const renameForm = ref({
  projectRoot: '',
  currentName: '',
  nextName: ''
})

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return [] as HistoryProject[]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [] as HistoryProject[]
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const row = item as Record<string, unknown>
        return {
          rootPath: String(row.rootPath || '').trim(),
          name: String(row.name || '').trim(),
          lastOpenedAt: Number(row.lastOpenedAt || 0)
        }
      })
      .filter((item) => !!item.rootPath)
      .slice(0, MAX_HISTORY)
  } catch {
    return [] as HistoryProject[]
  }
}

function saveHistory(rows: HistoryProject[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, MAX_HISTORY)))
}

function upsertHistory(item: HistoryProject) {
  const next = [item, ...history.value.filter((row) => row.rootPath !== item.rootPath)]
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, MAX_HISTORY)
  history.value = next
  saveHistory(next)
}

function removeHistory(rootPath: string) {
  const next = history.value.filter((item) => item.rootPath !== rootPath)
  history.value = next
  saveHistory(next)
}

async function refreshHistory() {
  loading.value = true
  try {
    const base = readHistory()
    if (!window.unu?.getProjectInfo) {
      history.value = base
      return
    }
    const checked = await Promise.all(base.map(async (item) => {
      try {
        const scanned = await window.unu!.getProjectInfo!(item.rootPath)
        return {
          rootPath: item.rootPath,
          name: scanned?.name || item.name || item.rootPath.split(/[\\/]/).pop() || 'Untitled',
          lastOpenedAt: item.lastOpenedAt || Date.now()
        } as HistoryProject
      } catch {
        return null
      }
    }))
    history.value = checked.filter((item): item is HistoryProject => !!item)
    saveHistory(history.value)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp: number) {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString()
}

function openSampleProject(sample: SampleProjectEntry) {
  if (!sample.available) return
  if (sample.rootPath) {
    emit('open-project', { rootPath: sample.rootPath, name: sample.title, sampleProjectId: sample.id })
    return
  }
  emit('open-project', { rootPath: 'sample-project', name: sample.title, sampleProjectId: sample.id })
}

async function openProject(item: HistoryProject) {
  upsertHistory({ ...item, lastOpenedAt: Date.now() })
  emit('open-project', { rootPath: item.rootPath, name: item.name })
}

async function pickProjectFolder() {
  if (!window.unu?.pickProjectFolder) return
  const picked = await window.unu.pickProjectFolder()
  if (!picked) return
  const row = { rootPath: picked.rootPath, name: picked.name, lastOpenedAt: Date.now() }
  upsertHistory(row)
  emit('open-project', { rootPath: row.rootPath, name: row.name })
}

function openCreateDialog() {
  createError.value = ''
  createDialogVisible.value = true
}

function closeCreateDialog() {
  if (creatingProject.value) return
  createDialogVisible.value = false
}

function clearCreateParentDir() {
  createForm.value.parentDir = ''
}

function resetCreateForm() {
  createForm.value = {
    projectName: '',
    parentDir: '',
    template: 'blank-2d',
    renderBackend: 'pixi',
    physicsBackend: 'none'
  }
}

watch(
  () => createForm.value.template,
  (template) => {
    if (template === 'blank-3d') {
      createForm.value.renderBackend = 'three'
    } else if (createForm.value.renderBackend === 'three') {
      createForm.value.renderBackend = 'pixi'
    }
  }
)

async function pickCreateParentDir() {
  if (!window.unu?.pickDirectory) return
  const picked = await window.unu.pickDirectory({
    title: '选择项目存放目录',
    defaultPath: createForm.value.parentDir || undefined
  })
  if (!picked) return
  createForm.value.parentDir = picked.dirPath
}

async function submitCreateProject() {
  if (!window.unu?.createProject) return
  creatingProject.value = true
  createError.value = ''
  try {
    const created = await window.unu.createProject({
      projectName: createForm.value.projectName.trim() || undefined,
      parentDir: createForm.value.parentDir.trim() || undefined,
      renderBackend: createForm.value.renderBackend,
      physicsBackend: createForm.value.physicsBackend,
      template: createForm.value.template
    })
    if (!created) return
    const row = { rootPath: created.rootPath, name: created.name, lastOpenedAt: Date.now() }
    upsertHistory(row)
    createDialogVisible.value = false
    resetCreateForm()
    emit('open-project', { rootPath: row.rootPath, name: row.name })
  } catch (error) {
    createError.value = error instanceof Error ? error.message : String(error)
  } finally {
    creatingProject.value = false
  }
}

function openRenameDialog(item: HistoryProject) {
  renameError.value = ''
  renameForm.value = {
    projectRoot: item.rootPath,
    currentName: item.name,
    nextName: item.name
  }
  renameDialogVisible.value = true
}

function closeRenameDialog() {
  if (renamingProject.value) return
  renameDialogVisible.value = false
}

async function submitRenameProject() {
  if (!window.unu?.renameProject) return
  const nextName = renameForm.value.nextName.trim()
  if (!nextName) {
    renameError.value = '请输入新项目名称'
    return
  }
  if (nextName === renameForm.value.currentName) {
    closeRenameDialog()
    return
  }
  renamingProject.value = true
  renameError.value = ''
  try {
    const renamed = await window.unu.renameProject({
      projectRoot: renameForm.value.projectRoot,
      nextName
    })
    if (!renamed) return
    removeHistory(renameForm.value.projectRoot)
    upsertHistory({ rootPath: renamed.rootPath, name: renamed.name, lastOpenedAt: Date.now() })
    closeRenameDialog()
  } catch (error) {
    renameError.value = error instanceof Error ? error.message : String(error)
  } finally {
    renamingProject.value = false
  }
}

async function deleteProject(item: HistoryProject) {
  const ok = window.confirm(`确认删除项目目录？\n${item.rootPath}\n此操作不可恢复。`)
  if (!ok) return
  if (!window.unu?.deleteProject) return
  try {
    const result = await window.unu.deleteProject({ projectRoot: item.rootPath })
    if (!result?.ok) {
      window.alert(result?.error ? `删除失败：${result.error}` : '删除失败')
      return
    }
    removeHistory(item.rootPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    window.alert(`删除失败：${message}`)
  }
}

async function clearApplicationData() {
  const ok = window.confirm('将清理内置示例缓存、启动器历史和编辑器本地缓存。Android 上等同于应用内清除存储；Windows 上会清理 AppData 中的示例缓存。清理后会刷新页面。是否继续？')
  if (!ok) return
  clearingData.value = true
  try {
    if (window.unu?.clearApplicationData) {
      const result = await window.unu.clearApplicationData()
      if (!result?.ok) {
        window.alert(result?.error ? `清理失败：${result.error}` : '清理失败')
        return
      }
    }
    localStorage.clear()
    window.location.reload()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    window.alert(`清理失败：${message}`)
  } finally {
    clearingData.value = false
  }
}

onMounted(() => {
  void refreshSamples()
  void refreshHistory()
})

async function refreshSamples() {
  if (!window.unu?.listSampleProjects) {
    samples.value = fallbackSampleProjectCatalog
    return
  }
  try {
    const discovered = await window.unu.listSampleProjects()
    samples.value = discovered?.length ? discovered : fallbackSampleProjectCatalog
  } catch {
    samples.value = fallbackSampleProjectCatalog
  }
}
</script>

<style scoped>
.launcher-shell {
  height: 100%;
  padding: 28px;
  background: radial-gradient(circle at 20% 0%, #1a2436 0%, #0f141d 45%, #0a0d12 100%);
  color: #d9e3f1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
}

.hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.15;
}

.hero p {
  margin: 8px 0 0;
  color: #9fb0c7;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  border: 1px solid #324156;
  background: #172131;
  color: #d9e3f1;
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
}

button.primary {
  background: #2b5a8f;
  border-color: #3b78bd;
}

button.ghost {
  background: transparent;
}

button.danger-text {
  color: #ffb4be;
  border-color: #6e3340;
}

button.danger {
  background: #5a2530;
  border-color: #86414c;
}

.history,
.samples {
  border: 1px solid #253244;
  border-radius: 6px;
  background: rgba(11, 16, 24, 0.7);
  padding: 12px;
}

.sample-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.sample-card {
  border: 1px solid #2a374b;
  border-radius: 10px;
  background: #121a27;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sample-card:hover {
  background: #19273d;
}

.sample-card.unavailable {
  opacity: 0.5;
}

.sample-title {
  font-weight: 700;
}

.sample-desc {
  color: #9bb0cb;
  font-size: 12px;
  line-height: 1.45;
}

.sample-actions {
  display: flex;
  justify-content: flex-end;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-head h2 {
  margin: 0;
  font-size: 16px;
}

.empty {
  color: #90a0b8;
  padding: 10px 4px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  /*border: 1px solid #2a374b;*/
  border-top: 3px solid #2a374b;
  border-radius: 0px;
  background: #121a27;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.history-item:hover {
  background: #192436;
}

.meta {
  min-width: 0;
  cursor: pointer;
}

.name {
  font-weight: 700;
}

.path {
  color: #9bb0cb;
  font-size: 12px;
  word-break: break-all;
}

.time {
  color: #7688a3;
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.small {
  padding: 6px 10px;
  font-size: 12px;
}

.create-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(7, 10, 16, 0.72);
  display: grid;
  place-items: center;
  z-index: 999;
}

.create-dialog {
  width: min(760px, calc(100vw - 40px));
  border: 1px solid #2c3d56;
  border-radius: 12px;
  background: #101824;
  padding: 0;
  display: grid;
  overflow: hidden;
}

.rename-dialog {
  width: min(520px, calc(100vw - 40px));
}

.dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #253348;
  background: #121c2a;
}

.dialog-head h3 {
  margin: 0;
  font-size: 18px;
}

.dialog-head p {
  margin: 4px 0 0;
  color: #8ca0bc;
  font-size: 12px;
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  padding: 0;
  flex: 0 0 auto;
}

.create-form {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.rename-form-body {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.form-section {
  display: grid;
  gap: 10px;
  border: 1px solid #253348;
  border-radius: 10px;
  background: #121b29;
  padding: 12px;
}

.section-title {
  color: #dbe8f7;
  font-size: 13px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(180px, 0.8fr);
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 12px;
  color: #9fb1c8;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid #324156;
  background: #131f2f;
  color: #d9e3f1;
  border-radius: 8px;
  padding: 9px 10px;
  min-height: 38px;
}

.dir-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
}

.hint {
  margin: 0;
  color: #8ca0bc;
  font-size: 12px;
}

.settings-section {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-section .section-title {
  grid-column: 1 / -1;
}

.setting-row {
  display: grid;
  gap: 4px;
  min-width: 0;
  border: 1px solid #27364a;
  border-radius: 8px;
  background: #101824;
  padding: 10px;
}

.setting-row span {
  color: #8ca0bc;
  font-size: 12px;
}

.setting-row strong {
  color: #d9e3f1;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error {
  margin: 0 14px;
  color: #ffb4b4;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px 14px;
  border-top: 1px solid #253348;
  background: #0f1724;
}

@media (max-width: 640px) {
  .form-grid,
  .settings-section {
    grid-template-columns: minmax(0, 1fr);
  }

  .dir-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .dialog-actions {
    flex-wrap: wrap;
  }
}
</style>
