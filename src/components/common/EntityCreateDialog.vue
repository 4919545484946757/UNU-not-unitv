<template>
  <div v-if="editor.entityCreateDialogVisible" class="entity-dialog-mask" @click.self="close">
    <div class="entity-dialog">
      <div class="header">
        <div class="title">Create Entity</div>
        <button class="close-btn" @click="close">x</button>
      </div>

      <div class="form">
        <label>
          Entity Type
          <select v-model="form.type" @change="onTypeChange">
            <option v-for="item in entityTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <label>
          Name
          <input v-model="form.name" placeholder="Leave blank to use default name" />
        </label>

        <div class="row">
          <label>X <input type="number" v-model="form.x" placeholder="Default" /></label>
          <label>Y <input type="number" v-model="form.y" placeholder="Default" /></label>
        </div>
        <label v-if="is3DProject">Z <input type="number" v-model="form.z" placeholder="Default" /></label>
        <div class="row">
          <label>Scale X <input type="number" step="0.1" v-model="form.scaleX" placeholder="Default" /></label>
          <label>Scale Y <input type="number" step="0.1" v-model="form.scaleY" placeholder="Default" /></label>
        </div>
        <label v-if="is3DProject">Scale Z <input type="number" step="0.1" v-model="form.scaleZ" placeholder="Default" /></label>
        <div v-if="is3DProject" class="row three-rotation-row">
          <label>Rot X (deg) <input type="number" step="1" v-model="form.rotationX" placeholder="0" /></label>
          <label>Rot Y (deg) <input type="number" step="1" v-model="form.rotationY" placeholder="0" /></label>
          <label>Rot Z (deg) <input type="number" step="1" v-model="form.rotationZ" placeholder="0" /></label>
        </div>
        <label v-else>
          Rotation (deg)
          <input type="number" step="1" v-model="form.rotation" placeholder="Default" />
        </label>
      </div>

      <div class="footer">
        <button @click="close">Cancel</button>
        <button class="primary" @click="submit">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'

type EntityType =
  | 'empty'
  | 'sprite'
  | 'player'
  | 'enemy'
  | 'tilemap'
  | 'camera'
  | 'background'
  | 'ui-text'
  | 'ui-button'
  | 'interactable'
  | 'three-box'
  | 'three-plane'
  | 'three-model'
  | 'three-directional-light'
  | 'three-point-light'
  | 'three-spot-light'
  | 'three-ambient-light'
  | 'three-environment-light'
  | 'three-world-environment'

const editor = useEditorStore()
const project = useProjectStore()
const scene = useSceneStore()
const is3DProject = computed(() => project.renderBackend === 'three')
const entityTypeOptions = computed<Array<{ value: EntityType; label: string }>>(() => {
  if (is3DProject.value) {
    return [
      { value: 'empty', label: 'Empty' },
      { value: 'three-box', label: '3D Box' },
      { value: 'three-plane', label: '3D Plane' },
      { value: 'three-model', label: '3D Model' },
      { value: 'three-directional-light', label: 'Directional Light' },
      { value: 'three-point-light', label: 'Point Light' },
      { value: 'three-spot-light', label: 'Spot Light' },
      { value: 'three-ambient-light', label: 'Ambient Light' },
      { value: 'three-environment-light', label: 'Environment Map Light' },
      { value: 'three-world-environment', label: 'World Environment Sphere' },
      { value: 'camera', label: 'Camera' }
    ]
  }
  return [
    { value: 'empty', label: 'Empty' },
    { value: 'sprite', label: 'Sprite' },
    { value: 'player', label: 'Player' },
    { value: 'enemy', label: 'Enemy' },
    { value: 'tilemap', label: 'Tilemap' },
    { value: 'camera', label: 'Camera' },
    { value: 'background', label: 'Background' },
    { value: 'ui-text', label: 'UI Text' },
    { value: 'ui-button', label: 'UI Button' },
    { value: 'interactable', label: 'Interactable' }
  ]
})

const form = reactive({
  type: 'empty' as EntityType,
  name: '',
  x: '',
  y: '',
  z: '',
  scaleX: '',
  scaleY: '',
  scaleZ: '',
  rotation: '',
  rotationX: '',
  rotationY: '',
  rotationZ: ''
})

const suggestedNames: Record<EntityType, string> = {
  empty: 'Entity',
  sprite: 'Sprite',
  player: 'Player',
  enemy: 'Enemy',
  tilemap: 'LevelTilemap',
  camera: 'Camera',
  background: 'Background',
  'ui-text': 'UIText',
  'ui-button': 'UIButton',
  interactable: 'Interactable',
  'three-box': 'Box',
  'three-plane': 'Plane',
  'three-model': 'Model',
  'three-directional-light': 'DirectionalLight',
  'three-point-light': 'PointLight',
  'three-spot-light': 'SpotLight',
  'three-ambient-light': 'AmbientLight',
  'three-environment-light': 'EnvironmentLight',
  'three-world-environment': 'WorldEnvironment'
}

function resetForm() {
  form.type = entityTypeOptions.value[0]?.value || 'empty'
  form.name = ''
  form.x = ''
  form.y = ''
  form.z = ''
  form.scaleX = ''
  form.scaleY = ''
  form.scaleZ = ''
  form.rotation = ''
  form.rotationX = ''
  form.rotationY = ''
  form.rotationZ = ''
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
    z: parseOptional(form.z),
    scaleX: parseOptional(form.scaleX),
    scaleY: parseOptional(form.scaleY),
    scaleZ: parseOptional(form.scaleZ),
    rotation: degreesToRadians(parseOptional(form.rotation)),
    rotationX: degreesToRadians(parseOptional(form.rotationX)),
    rotationY: degreesToRadians(parseOptional(form.rotationY)),
    rotationZ: degreesToRadians(parseOptional(form.rotationZ))
  })
  close()
}

function degreesToRadians(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) * Math.PI / 180 : undefined
}

watch(
  () => [editor.entityCreateDialogVisible, is3DProject.value],
  ([visible]) => {
    if (!visible) return
    resetForm()
    form.name = suggestedNames[form.type]
  },
  { immediate: true }
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
  width: min(560px, calc(100vw - 40px));
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
.three-rotation-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
label {
  display: grid;
  gap: 6px;
  color: #9fb5d2;
  font-size: 12px;
}
input,
select {
  background: #0f141d;
  color: #ecf2fd;
  border: 1px solid #33445f;
  border-radius: 8px;
  padding: 8px;
  min-width: 0;
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
@media (max-width: 520px) {
  .row,
  .three-rotation-row {
    grid-template-columns: 1fr;
  }
}
</style>
