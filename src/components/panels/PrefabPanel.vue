<template>
  <div class="prefab-panel">
    <div class="section-title">Prefab</div>
    <div class="tips">
      支持保存 Prefab、实例化、Variant 差异预览、源更新同步，以及嵌套 Prefab 的源路径保留。
    </div>

    <div class="tips" v-if="selectedEntity">
      当前选中：{{ selectedEntity.name }}
      <span v-if="selectedEntity.prefabSourcePath"> | 源文件：{{ selectedEntity.prefabSourcePath }}</span>
      <span v-else> | 源文件：未绑定</span>
      <span v-if="selectedEntity.prefabVariantBasePath"> | 变体基线：{{ selectedEntity.prefabVariantBasePath }}</span>
    </div>

    <div class="actions">
      <button @click="scene.saveSelectedAsPrefab()">保存当前实体为 Prefab</button>
      <button :disabled="!selectedEntity?.prefabSourcePath" @click="scene.saveSelectedAsPrefabVariant()">保存当前实体为 Prefab 变体</button>
      <button @click="scene.instantiatePrefabFromDisk()">从文件实例化 Prefab</button>
      <button :disabled="!selectedEntity?.prefabSourcePath" @click="scene.applySelectedPrefabSource()">应用源 Prefab 更新到当前实例</button>
      <button :disabled="!selectedEntity?.prefabSourcePath" @click="scene.syncSelectedPrefabSourceInstances()">同步源 Prefab 到全部实例</button>
      <button :disabled="!selectedEntity?.prefabSourcePath || diffLoading" @click="loadPrefabDiff">
        {{ diffLoading ? '正在计算差异...' : '查看 Variant / 实例差异' }}
      </button>
    </div>

    <section v-if="nestedPrefabs.length" class="diff-box">
      <div class="diff-title">嵌套 Prefab</div>
      <div v-for="item in nestedPrefabs" :key="item.id" class="nested-row">
        <span>{{ item.name }}</span>
        <code>{{ item.prefabSourcePath }}</code>
      </div>
    </section>

    <section v-if="diffError" class="diff-box error">{{ diffError }}</section>
    <section v-else-if="diffRows.length" class="diff-box">
      <div class="diff-title">差异列表</div>
      <div v-for="row in diffRows" :key="row.path" class="diff-row" :class="row.kind">
        <div class="diff-path">{{ row.path }}</div>
        <div class="diff-values">
          <span><b>源</b>{{ row.source }}</span>
          <span><b>实例</b>{{ row.instance }}</span>
        </div>
      </div>
    </section>
    <section v-else-if="diffLoaded" class="diff-box">当前实例与源 Prefab 没有可见差异。</section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { instantiatePrefab } from '../../engine/prefabs/prefabSerializer'
import { serializeEntity } from '../../engine/serialization/sceneSerializer'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

type DiffRow = {
  kind: 'added' | 'removed' | 'changed'
  path: string
  source: string
  instance: string
}

const scene = useSceneStore()
const project = useProjectStore()
const selection = useSelectionStore()
const diffRows = ref<DiffRow[]>([])
const diffError = ref('')
const diffLoaded = ref(false)
const diffLoading = ref(false)
const selectedEntity = computed(() => scene.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
const nestedPrefabs = computed(() => {
  const root = selectedEntity.value
  if (!root) return []
  const rows: Array<{ id: string; name: string; prefabSourcePath: string }> = []
  const visit = (entity: typeof root) => {
    for (const child of entity.children) {
      if (child.prefabSourcePath && child.prefabSourcePath !== root.prefabSourcePath) {
        rows.push({ id: child.id, name: child.name, prefabSourcePath: child.prefabSourcePath })
      }
      visit(child)
    }
  }
  visit(root)
  return rows
})

async function loadPrefabDiff() {
  diffRows.value = []
  diffError.value = ''
  diffLoaded.value = false
  const entity = selectedEntity.value
  if (!entity?.prefabSourcePath) return
  if (!window.unu?.readTextAsset || !project.rootPath || project.isMemoryProject) {
    diffError.value = '当前环境无法读取 Prefab 源文件。'
    return
  }
  diffLoading.value = true
  try {
    const raw = await window.unu.readTextAsset({
      projectRoot: project.rootPath,
      relativePath: entity.prefabSourcePath
    })
    if (!raw?.content) {
      diffError.value = '读取 Prefab 源文件失败。'
      return
    }
    const sourceEntity = await instantiatePrefab(raw.content, entity.id, entity.prefabSourcePath)
    diffRows.value = buildDiffRows(flattenForDiff(serializeEntity(sourceEntity)), flattenForDiff(serializeEntity(entity)))
    diffLoaded.value = true
  } catch (error) {
    diffError.value = error instanceof Error ? error.message : String(error)
  } finally {
    diffLoading.value = false
  }
}

function flattenForDiff(value: unknown) {
  const output: Record<string, string> = {}
  const walk = (node: unknown, path: string) => {
    if (path === 'id' || path === 'prefabSourcePath' || path === 'prefabVariantBasePath') return
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`))
      if (!node.length) output[path] = '[]'
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        walk(child, path ? `${path}.${key}` : key)
      }
      return
    }
    output[path] = formatValue(node)
  }
  walk(value, '')
  return output
}

function buildDiffRows(source: Record<string, string>, instance: Record<string, string>) {
  const keys = Array.from(new Set([...Object.keys(source), ...Object.keys(instance)])).sort()
  return keys
    .filter((key) => source[key] !== instance[key])
    .map((key) => ({
      kind: source[key] === undefined ? 'added' : instance[key] === undefined ? 'removed' : 'changed',
      path: key,
      source: source[key] ?? '-',
      instance: instance[key] ?? '-'
    }))
    .slice(0, 200) as DiffRow[]
}

function formatValue(value: unknown) {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value || '""'
  return JSON.stringify(value)
}
</script>

<style scoped>
.prefab-panel { display: grid; gap: 12px; }
.section-title { color: #94a3b8; font-size: 13px; }
.tips { color: #8ea0b8; font-size: 12px; line-height: 1.6; }
.actions { display: grid; gap: 8px; }
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.diff-box {
  display: grid;
  gap: 8px;
  border: 1px solid #303848;
  border-radius: 10px;
  background: #151b26;
  padding: 10px;
  color: #cbd7e8;
  font-size: 12px;
}
.diff-box.error { color: #ffb4b4; }
.diff-title { color: #edf5ff; font-weight: 700; }
.nested-row {
  display: grid;
  gap: 4px;
  padding: 7px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.nested-row code {
  color: #9dd9ff;
  white-space: normal;
  overflow-wrap: anywhere;
}
.diff-row {
  display: grid;
  gap: 5px;
  padding: 8px;
  border-left: 3px solid #56b6c2;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.diff-row.added { border-left-color: #6fcf97; }
.diff-row.removed { border-left-color: #eb5757; }
.diff-path { color: #f2c94c; overflow-wrap: anywhere; }
.diff-values {
  display: grid;
  gap: 4px;
}
.diff-values span {
  display: grid;
  gap: 2px;
  color: #9fb0c6;
  overflow-wrap: anywhere;
}
.diff-values b { color: #dbe4ee; }
</style>
