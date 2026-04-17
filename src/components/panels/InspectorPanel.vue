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
import { CameraComponent } from '../../engine/components/CameraComponent'
import type { ColliderComponent } from '../../engine/components/ColliderComponent'
import type { SpriteComponent } from '../../engine/components/SpriteComponent'
import type { TransformComponent } from '../../engine/components/TransformComponent'
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

function setEntityName(value: string) {
  if (!entity.value) return
  entity.value.name = value
  sceneStore.markDirty()
}

function setNumber(group: 'transform' | 'sprite' | 'collider' | 'animation' | 'camera', key: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (group === 'transform' && transform.value) (transform.value as Record<string, number>)[key] = value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, number>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, number>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, number>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, number>)[key] = value
  sceneStore.markDirty()
}

function setText(group: 'sprite' | 'camera', key: string, event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, string>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, string>)[key] = value
  sceneStore.markDirty()
}

function setChecked(group: 'sprite' | 'collider' | 'animation' | 'camera', key: string, event: Event) {
  const value = (event.target as HTMLInputElement).checked
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, boolean>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, boolean>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, boolean>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, boolean>)[key] = value
  sceneStore.markDirty()
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
</script>

<style scoped>
.inspector { display: grid; gap: 12px; }
h3 { margin: 0; }
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; }
input, textarea {
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
