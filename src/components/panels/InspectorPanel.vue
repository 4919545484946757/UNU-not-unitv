<template>
  <div class="inspector">
    <template v-if="entity && transform">
      <h3>{{ entity.name }}</h3>

      <div class="group">
        <div class="group-title">基础</div>
        <label>
          实体名称
          <input :value="entity.name" @input="setEntityName(($event.target as HTMLInputElement).value)" />
        </label>
        <div class="readonly">ID: {{ entity.id }}</div>
      </div>

      <div class="group">
        <div class="group-title">Transform</div>
        <label> X <input type="number" :value="transform.x" @input="setNumber('transform', 'x', $event)" /> </label>
        <label> Y <input type="number" :value="transform.y" @input="setNumber('transform', 'y', $event)" /> </label>
        <label> Scale X <input type="number" step="0.1" :value="transform.scaleX" @input="setNumber('transform', 'scaleX', $event)" /> </label>
        <label> Scale Y <input type="number" step="0.1" :value="transform.scaleY" @input="setNumber('transform', 'scaleY', $event)" /> </label>
        <label> Rotation <input type="number" step="0.01" :value="transform.rotation" @input="setNumber('transform', 'rotation', $event)" /> </label>
      </div>

      <div class="group" v-if="sprite">
        <div class="group-title">Sprite</div>
        <label> Width <input type="number" :value="sprite.width" @input="setNumber('sprite', 'width', $event)" /> </label>
        <label> Height <input type="number" :value="sprite.height" @input="setNumber('sprite', 'height', $event)" /> </label>
        <label> Alpha <input type="number" step="0.1" min="0" max="1" :value="sprite.alpha" @input="setNumber('sprite', 'alpha', $event)" /> </label>
        <label>
          Texture Path
          <input :value="sprite.texturePath" @input="setText('sprite', 'texturePath', $event)" />
        </label>
        <div class="asset-picker">
          <button @click="void applySelectedImage()">使用当前选中图片</button>
          <span>{{ assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : '请先在素材箱选择图片资源' }}</span>
        </div>
        <label class="checkbox-row">
          <input type="checkbox" :checked="sprite.visible" @change="setChecked('sprite', 'visible', $event)" />
          Visible
        </label>
      </div>

      <div class="group" v-if="animation || sprite">
        <div class="group-title">Animation</div>
        <template v-if="animation">
          <label> FPS <input type="number" min="1" :value="animation.fps" @input="setNumber('animation', 'fps', $event)" /> </label>
          <label>
            Animation Asset
            <input :value="animation.animationAssetPath" readonly />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.enabled" @change="setChecked('animation', 'enabled', $event)" />
            Enabled
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.playing" @change="setChecked('animation', 'playing', $event)" />
            Playing
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.loop" @change="setChecked('animation', 'loop', $event)" />
            Loop
          </label>
          <label>
            帧路径（每行一张图片）
            <textarea :value="animation.framePaths.join('\n')" @input="setAnimationFrames($event)"></textarea>
          </label>
          <div class="asset-picker">
            <button @click="appendSelectedImageToAnimation">追加当前选中图片</button>
            <span>{{ animation.framePaths.length }} 帧</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">当前实体还没有 Animation 组件。</div>
          <button class="small" @click="addAnimationComponent">添加 Animation 组件</button>
        </template>
      </div>

      <div class="group" v-if="collider">
        <div class="group-title">Collider</div>
        <label> Width <input type="number" :value="collider.width" @input="setNumber('collider', 'width', $event)" /> </label>
        <label> Height <input type="number" :value="collider.height" @input="setNumber('collider', 'height', $event)" /> </label>
        <label class="checkbox-row">
          <input type="checkbox" :checked="collider.isTrigger" @change="setChecked('collider', 'isTrigger', $event)" />
          Trigger
        </label>
      </div>

      <div class="group">
        <div class="group-title">Tilemap</div>
        <template v-if="tilemap">
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.enabled" @change="setChecked('tilemap', 'enabled', $event)" />
            Enabled
          </label>
          <label> Columns <input type="number" min="1" :value="tilemap.columns" @input="setNumber('tilemap', 'columns', $event)" @change="resizeTilemapData" /> </label>
          <label> Rows <input type="number" min="1" :value="tilemap.rows" @input="setNumber('tilemap', 'rows', $event)" @change="resizeTilemapData" /> </label>
          <label> Tile Width <input type="number" min="8" :value="tilemap.tileWidth" @input="setNumber('tilemap', 'tileWidth', $event)" @change="resizeTilemapData" /> </label>
          <label> Tile Height <input type="number" min="8" :value="tilemap.tileHeight" @input="setNumber('tilemap', 'tileHeight', $event)" @change="resizeTilemapData" /> </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.showCollision" @change="setChecked('tilemap', 'showCollision', $event)" />
            Show Collision Overlay
          </label>
          <label>
            Tiles (CSV rows)
            <textarea :value="tilemapToText(tilemap.tiles)" @input="setTilemapArray('tiles', $event)"></textarea>
          </label>
          <label>
            Collision (CSV rows, 0/1)
            <textarea :value="tilemapToText(tilemap.collision)" @input="setTilemapArray('collision', $event)"></textarea>
          </label>
        </template>
        <template v-else>
          <div class="tips">当前实体还没有 Tilemap 组件。</div>
          <button class="small" @click="addTilemapComponent">添加 Tilemap 组件</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">UI</div>
        <template v-if="ui">
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.enabled" @change="setChecked('ui', 'enabled', $event)" />
            Enabled
          </label>
          <label>
            Mode
            <select :value="ui.mode" @change="setUIMode">
              <option value="text">Text</option>
              <option value="button">Button</option>
            </select>
          </label>
          <label> Text <input :value="ui.text" @input="setText('ui', 'text', $event)" /> </label>
          <label> Font Size <input type="number" min="8" max="96" :value="ui.fontSize" @input="setNumber('ui', 'fontSize', $event)" /> </label>
          <label> Text Color (Hex) <input :value="`0x${Number(ui.textColor).toString(16)}`" @input="setHexNumber('ui', 'textColor', $event)" /> </label>
          <label> Width <input type="number" min="10" :value="ui.width" @input="setNumber('ui', 'width', $event)" /> </label>
          <label> Height <input type="number" min="10" :value="ui.height" @input="setNumber('ui', 'height', $event)" /> </label>
          <label> Background (Hex) <input :value="`0x${Number(ui.backgroundColor).toString(16)}`" @input="setHexNumber('ui', 'backgroundColor', $event)" /> </label>
          <label> Anchor X <input type="number" min="0" max="1" step="0.01" :value="ui.anchorX" @input="setNumber('ui', 'anchorX', $event)" /> </label>
          <label> Anchor Y <input type="number" min="0" max="1" step="0.01" :value="ui.anchorY" @input="setNumber('ui', 'anchorY', $event)" /> </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.interactable" @change="setChecked('ui', 'interactable', $event)" />
            Interactable
          </label>
        </template>
        <template v-else>
          <div class="tips">当前实体还没有 UI 组件。</div>
          <button class="small" @click="addUIComponent">添加 UI 组件</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">Audio</div>
        <template v-if="audio">
          <label class="checkbox-row">
            <input type="checkbox" :checked="audio.enabled" @change="setChecked('audio', 'enabled', $event)" />
            Enabled
          </label>
          <label>
            Clip Path
            <input :value="audio.clipPath" @input="setText('audio', 'clipPath', $event)" />
          </label>
          <div class="asset-picker">
            <button @click="void applySelectedAudio()">使用当前选中音频</button>
            <span>{{ assets.selectedAsset?.type === 'audio' ? assets.selectedAsset.path : '请先在资源树中选择音频资源' }}</span>
          </div>
          <label>
            Group
            <select :value="audio.group" @change="setAudioGroup">
              <option value="bgm">BGM</option>
              <option value="sfx">SFX</option>
              <option value="ui">UI</option>
            </select>
          </label>
          <label>
            Volume
            <input type="number" min="0" max="1" step="0.05" :value="audio.volume" @input="setNumber('audio', 'volume', $event)" />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="audio.loop" @change="setChecked('audio', 'loop', $event)" />
            Loop
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="audio.playOnStart" @change="setChecked('audio', 'playOnStart', $event)" />
            Play On Start
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="audio.playing" @change="setChecked('audio', 'playing', $event)" />
            Playing
          </label>
        </template>
        <template v-else>
          <div class="tips">当前实体还没有 Audio 组件。</div>
          <button class="small" @click="addAudioComponent">添加 Audio 组件</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">Camera</div>
        <template v-if="camera">
          <label> Zoom <input type="number" step="0.1" min="0.1" :value="camera.zoom" @input="setNumber('camera', 'zoom', $event)" /> </label>
          <label>
            Follow Entity ID
            <input :value="camera.followEntityId" @input="setText('camera', 'followEntityId', $event)" />
          </label>
          <label> Follow Smoothing <input type="number" step="0.01" min="0" max="1" :value="camera.followSmoothing" @input="setNumber('camera', 'followSmoothing', $event)" /> </label>
          <label> Offset X <input type="number" :value="camera.offsetX" @input="setNumber('camera', 'offsetX', $event)" /> </label>
          <label> Offset Y <input type="number" :value="camera.offsetY" @input="setNumber('camera', 'offsetY', $event)" /> </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="camera.boundsEnabled" @change="setChecked('camera', 'boundsEnabled', $event)" />
            Enable Bounds
          </label>
          <template v-if="camera.boundsEnabled">
            <label> Min X <input type="number" :value="camera.minX" @input="setNumber('camera', 'minX', $event)" /> </label>
            <label> Max X <input type="number" :value="camera.maxX" @input="setNumber('camera', 'maxX', $event)" /> </label>
            <label> Min Y <input type="number" :value="camera.minY" @input="setNumber('camera', 'minY', $event)" /> </label>
            <label> Max Y <input type="number" :value="camera.maxY" @input="setNumber('camera', 'maxY', $event)" /> </label>
          </template>
        </template>
        <template v-else>
          <div class="tips">当前实体还没有 Camera 组件。</div>
          <button class="small" @click="addCameraComponent">添加 Camera 组件</button>
        </template>
      </div>
    </template>

    <div v-else class="empty">请在场景树或视口中选择一个实体。</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AnimationComponent } from '../../engine/components/AnimationComponent'
import { AudioComponent } from '../../engine/components/AudioComponent'
import { CameraComponent } from '../../engine/components/CameraComponent'
import type { ColliderComponent } from '../../engine/components/ColliderComponent'
import type { SpriteComponent } from '../../engine/components/SpriteComponent'
import { TilemapComponent } from '../../engine/components/TilemapComponent'
import type { TransformComponent } from '../../engine/components/TransformComponent'
import { UIComponent } from '../../engine/components/UIComponent'
import { useAssetStore } from '../../stores/assets'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const assets = useAssetStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()

const entity = computed(() => sceneStore.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
const transform = computed(() => entity.value?.getComponent<TransformComponent>('Transform') ?? null)
const sprite = computed(() => entity.value?.getComponent<SpriteComponent>('Sprite') ?? null)
const animation = computed(() => entity.value?.getComponent<AnimationComponent>('Animation') ?? null)
const collider = computed(() => entity.value?.getComponent<ColliderComponent>('Collider') ?? null)
const camera = computed(() => entity.value?.getComponent<CameraComponent>('Camera') ?? null)
const audio = computed(() => entity.value?.getComponent<AudioComponent>('Audio') ?? null)
const ui = computed(() => entity.value?.getComponent<UIComponent>('UI') ?? null)
const tilemap = computed(() => entity.value?.getComponent<TilemapComponent>('Tilemap') ?? null)

function setEntityName(value: string) {
  if (!entity.value) return
  entity.value.name = value
  sceneStore.markDirty()
}

function setNumber(group: 'transform' | 'sprite' | 'collider' | 'animation' | 'camera' | 'audio' | 'ui' | 'tilemap', key: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (group === 'transform' && transform.value) (transform.value as Record<string, number>)[key] = value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, number>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, number>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, number>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, number>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, number>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, number>)[key] = value
  if (group === 'tilemap' && tilemap.value) (tilemap.value as Record<string, number>)[key] = Math.round(value)
  sceneStore.markDirty()
}

function setText(group: 'sprite' | 'camera' | 'audio' | 'ui', key: string, event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, string>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, string>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, string>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, string>)[key] = value
  sceneStore.markDirty()
}

function setHexNumber(group: 'ui', key: string, event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  const normalized = raw.startsWith('0x') || raw.startsWith('0X') ? raw.slice(2) : raw.replace('#', '')
  const parsed = Number.parseInt(normalized, 16)
  if (!Number.isFinite(parsed)) return
  if (group === 'ui' && ui.value) (ui.value as Record<string, number>)[key] = parsed
  sceneStore.markDirty()
}

function setChecked(group: 'sprite' | 'collider' | 'animation' | 'camera' | 'audio' | 'ui' | 'tilemap', key: string, event: Event) {
  const value = (event.target as HTMLInputElement).checked
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, boolean>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, boolean>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, boolean>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, boolean>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, boolean>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, boolean>)[key] = value
  if (group === 'tilemap' && tilemap.value) (tilemap.value as Record<string, boolean>)[key] = value
  sceneStore.markDirty()
}

function setTilemapArray(kind: 'tiles' | 'collision', event: Event) {
  if (!tilemap.value) return
  const rows = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  const nextRows = rows.slice(0, tilemap.value.rows)
  const array: number[] = []
  for (let r = 0; r < tilemap.value.rows; r += 1) {
    const rowText = nextRows[r] || ''
    const values = rowText.split(',').map((v) => Number(v.trim() || 0))
    for (let c = 0; c < tilemap.value.columns; c += 1) {
      const value = Number(values[c] ?? 0)
      array.push(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0)
    }
  }
  if (kind === 'tiles') tilemap.value.tiles = array
  else tilemap.value.collision = array
  sceneStore.markDirty()
}

function resizeTilemapData() {
  if (!tilemap.value) return
  tilemap.value.columns = Math.max(1, Math.round(tilemap.value.columns))
  tilemap.value.rows = Math.max(1, Math.round(tilemap.value.rows))
  tilemap.value.tileWidth = Math.max(8, Math.round(tilemap.value.tileWidth))
  tilemap.value.tileHeight = Math.max(8, Math.round(tilemap.value.tileHeight))
  const size = tilemap.value.columns * tilemap.value.rows
  tilemap.value.tiles = normalizeTileArray(tilemap.value.tiles, size)
  tilemap.value.collision = normalizeTileArray(tilemap.value.collision, size)
  sceneStore.markDirty()
}

function tilemapToText(values: number[] | undefined) {
  if (!tilemap.value) return ''
  const cols = tilemap.value.columns
  const rows = tilemap.value.rows
  const safe = normalizeTileArray(values || [], cols * rows)
  const lines: string[] = []
  for (let r = 0; r < rows; r += 1) {
    lines.push(safe.slice(r * cols, (r + 1) * cols).join(','))
  }
  return lines.join('\n')
}

function normalizeTileArray(values: number[], size: number) {
  const next = values.slice(0, size).map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0))
  while (next.length < size) next.push(0)
  return next
}

function setAnimationFrames(event: Event) {
  if (!animation.value) return
  animation.value.framePaths = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  sceneStore.markDirty()
}

async function applySelectedImage() {
  if (!sprite.value || assets.selectedAsset?.type !== 'image') return
  sprite.value.texturePath = assets.selectedAsset.path
  const imageSize = await assets.ensureImageSize(assets.selectedAsset.path)
  if (imageSize) {
    const fitScale = Math.min(1, 192 / Math.max(imageSize.width, imageSize.height))
    sprite.value.width = Math.max(24, Math.round(imageSize.width * fitScale))
    sprite.value.height = Math.max(24, Math.round(imageSize.height * fitScale))
  }
  sceneStore.markDirty()
}

function appendSelectedImageToAnimation() {
  if (!animation.value || assets.selectedAsset?.type !== 'image') return
  animation.value.framePaths = [...animation.value.framePaths, assets.selectedAsset.path]
  sceneStore.markDirty()
}

function addAnimationComponent() {
  if (!entity.value) return
  entity.value.addComponent(new AnimationComponent(true, true, 8, true, 0, 0, [], [], ''))
  sceneStore.markDirty()
}

function addCameraComponent() {
  if (!entity.value || camera.value) return
  entity.value.addComponent(new CameraComponent(true, 1, '', 0.18, 0, 0, false))
  sceneStore.markDirty()
}

function setAudioGroup(event: Event) {
  if (!audio.value) return
  const next = (event.target as HTMLSelectElement).value
  audio.value.group = next === 'bgm' || next === 'ui' ? next : 'sfx'
  sceneStore.markDirty()
}

async function applySelectedAudio() {
  if (!audio.value || assets.selectedAsset?.type !== 'audio') return
  audio.value.clipPath = assets.selectedAsset.path
  sceneStore.markDirty()
}

function addAudioComponent() {
  if (!entity.value || audio.value) return
  entity.value.addComponent(new AudioComponent(true, '', 'sfx', 1, false, false, false))
  sceneStore.markDirty()
}

function setUIMode(event: Event) {
  if (!ui.value) return
  const next = (event.target as HTMLSelectElement).value
  ui.value.mode = next === 'button' ? 'button' : 'text'
  sceneStore.markDirty()
}

function addUIComponent() {
  if (!entity.value || ui.value) return
  entity.value.addComponent(new UIComponent(true, 'text', 'UI Text', 20, 0xffffff, 180, 48, 0x2b3242, 0.5, 0.5, true))
  sceneStore.markDirty()
}

function addTilemapComponent() {
  if (!entity.value || tilemap.value) return
  entity.value.addComponent(new TilemapComponent(true, 12, 8, 48, 48))
  sceneStore.markDirty()
}
</script>

<style scoped>
.inspector { display: grid; gap: 12px; }
h3 { margin: 0; }
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; }
input, textarea, select {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
}
textarea {
  min-height: 96px;
  resize: vertical;
}
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.readonly, .empty, .tips { color: #a8b5c7; }
.asset-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #9bb0c9;
}
.asset-picker button, .small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
</style>
