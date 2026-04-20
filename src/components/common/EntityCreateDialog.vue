<template>
  <div v-if="editor.entityCreateDialogVisible" class="entity-dialog-mask" @click.self="close">
    <div class="entity-dialog">
      <div class="header">
        <div class="title">新建实体</div>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="form">
        <label>
          实体类型
          <select v-model="form.type" @change="onTypeChange">
            <option value="empty">Empty</option>
            <option value="sprite">Sprite</option>
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
            <option value="tilemap">Tilemap</option>
            <option value="camera">Camera</option>
            <option value="ui-text">UI Text</option>
            <option value="ui-button">UI Button</option>
            <option value="interactable">Interactable</option>
          </select>
        </label>

        <label>
          名称
          <input v-model="form.name" placeholder="可留空，使用默认名称" />
        </label>

        <div class="row">
          <label>X <input type="number" v-model="form.x" placeholder="留空使用默认值" /></label>
          <label>Y <input type="number" v-model="form.y" placeholder="留空使用默认值" /></label>
        </div>
        <div class="row">
          <label>Scale X <input type="number" step="0.1" v-model="form.scaleX" placeholder="留空使用默认值" /></label>
          <label>Scale Y <input type="number" step="0.1" v-model="form.scaleY" placeholder="留空使用默认值" /></label>
        </div>
        <label>
          Rotation
          <input type="number" step="0.01" v-model="form.rotation" placeholder="留空使用默认值" />
        </label>
      </div>

      <div class="footer">
        <button @click="close">取消</button>
        <button class="primary" @click="submit">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useSceneStore } from '../../stores/scene'

type EntityType = 'empty' | 'sprite' | 'player' | 'enemy' | 'tilemap' | 'camera' | 'ui-text' | 'ui-button' | 'interactable'

const editor = useEditorStore()
const scene = useSceneStore()

const form = reactive({
  type: 'empty' as EntityType,
  name: '',
  x: '',
  y: '',
  scaleX: '',
  scaleY: '',
  rotation: ''
})

const suggestedNames: Record<EntityType, string> = {
  empty: 'Entity',
  sprite: 'Sprite',
  player: 'Player',
  enemy: 'Enemy',
  tilemap: 'LevelTilemap',
  camera: 'Camera',
  'ui-text': 'UIText',
  'ui-button': 'UIButton',
  interactable: 'Interactable'
}

function resetForm() {
  form.type = 'empty'
  form.name = ''
  form.x = ''
  form.y = ''
  form.scaleX = ''
  form.scaleY = ''
  form.rotation = ''
}

function onTypeChange() {
  if (!form.name.trim()) form.name = suggestedNames[form.type]
}

function close() {
  editor.closeEntityCreateDialog()
}

function submit() {
  const parseOptional = (raw: string) => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
  scene.createEntityFromDialog({
    type: form.type,
    name: form.name,
    x: parseOptional(form.x),
    y: parseOptional(form.y),
    scaleX: parseOptional(form.scaleX),
    scaleY: parseOptional(form.scaleY),
    rotation: parseOptional(form.rotation)
  })
  close()
}

watch(
  () => editor.entityCreateDialogVisible,
  (visible) => {
    if (!visible) return
    resetForm()
    form.name = suggestedNames[form.type]
  }
)
</script>

<style scoped>
.entity-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(6, 8, 13, 0.62);
  display: grid;
  place-items: center;
  padding: 20px;
}
.entity-dialog {
  width: min(520px, calc(100vw - 40px));
  background: #111826;
  border: 1px solid #32435e;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 14px;
  color: #cfe1f8;
}
.close-btn {
  border: 1px solid #3f5170;
  background: #1c2a42;
  color: #ecf3ff;
  border-radius: 8px;
  width: 28px;
  height: 28px;
  cursor: pointer;
}
.form {
  display: grid;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
label {
  display: grid;
  gap: 6px;
  color: #9fb5d2;
  font-size: 12px;
}
input, select {
  background: #0f141d;
  color: #ecf2fd;
  border: 1px solid #33445f;
  border-radius: 8px;
  padding: 8px;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.footer button {
  border: 1px solid #33445f;
  background: #1d2a40;
  color: #ecf2fd;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
.footer .primary {
  background: #235a7a;
  border-color: #3b7ea5;
}
</style>
