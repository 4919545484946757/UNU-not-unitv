<template>
  <div class="prefab-panel">
    <div class="section-title">Prefab</div>
    <div class="tips">这一版支持把当前选中实体保存为 Prefab，并从磁盘重新实例化回场景。</div>
    <div class="actions">
      <button @click="scene.saveSelectedAsPrefab()">保存当前实体为 Prefab</button>
      <button @click="scene.instantiatePrefabFromDisk()">从文件实例化 Prefab</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSceneStore } from '../../stores/scene'

const scene = useSceneStore()
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
</style>
