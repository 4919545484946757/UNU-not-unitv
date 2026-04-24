<template>
  <div class="inspector">
    <template v-if="entity && transform">
      <h3>{{ entity.name }}</h3>
      <div v-if="runtime.isPlaying" class="tips">播放态为只读同步预览（显示运行时实体状态），停止播放后可编辑。</div>

      <div class="group">
        <div class="group-title">Basic</div>
        <label>
          Entity Name
          <input :value="entity.name" @input="setEntityName(($event.target as HTMLInputElement).value)" />
        </label>
        <div class="readonly">ID: {{ entity.id }}</div>
      </div>

      <div class="group">
        <div class="group-title">Transform</div>
        <label>X <input type="number" :value="transform.x" @input="setNumber('transform', 'x', $event)" /></label>
        <label>Y <input type="number" :value="transform.y" @input="setNumber('transform', 'y', $event)" /></label>
        <label>Scale X <input type="number" step="0.1" :value="transform.scaleX" @input="setNumber('transform', 'scaleX', $event)" /></label>
        <label>Scale Y <input type="number" step="0.1" :value="transform.scaleY" @input="setNumber('transform', 'scaleY', $event)" /></label>
        <label>Rotation <input type="number" step="0.01" :value="transform.rotation" @input="setNumber('transform', 'rotation', $event)" /></label>
      </div>

      <div class="group" v-if="sprite">
        <div class="group-title">Sprite</div>
        <label>Width <input type="number" :value="sprite.width" @input="setNumber('sprite', 'width', $event)" /></label>
        <label>Height <input type="number" :value="sprite.height" @input="setNumber('sprite', 'height', $event)" /></label>
        <label>Alpha <input type="number" step="0.1" min="0" max="1" :value="sprite.alpha" @input="setNumber('sprite', 'alpha', $event)" /></label>
        <label>Texture Path <input :value="sprite.texturePath" @input="setText('sprite', 'texturePath', $event)" /></label>
        <div class="asset-picker">
          <button @click="void applySelectedImage()">Use Selected Image</button>
          <span>{{ assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : 'Select an image in Asset Tree first' }}</span>
        </div>
        <label class="checkbox-row">
          <input type="checkbox" :checked="sprite.visible" @change="setChecked('sprite', 'visible', $event)" />
          Visible
        </label>
      </div>

      <div class="group">
        <div class="group-title">Background</div>
        <template v-if="background">
          <label class="checkbox-row">
            <input type="checkbox" :checked="background.enabled" @change="setChecked('background', 'enabled', $event)" />
            Enabled
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="background.followCamera" @change="setChecked('background', 'followCamera', $event)" />
            Follow Camera
          </label>
          <label>
            Fit Mode
            <select :value="background.fitMode" @change="setBackgroundFitMode">
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </label>
          <div class="asset-picker">
            <button @click="void applySelectedImageToBackground()">Use Selected Image As Background</button>
            <span>{{ assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : 'Select an image in Asset Tree first' }}</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Background component.</div>
          <button class="small" @click="addBackgroundComponent">Add Background Component</button>
        </template>
      </div>

      <div class="group" v-if="animation || sprite">
        <div class="group-title">Animation</div>
        <template v-if="animation">
          <label>FPS <input type="number" min="1" :value="animation.fps" @input="setNumber('animation', 'fps', $event)" /></label>
          <label>Animation Asset <input :value="animation.animationAssetPath" readonly /></label>
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

          <div class="subgroup">
            <div class="group-title">State Machine</div>
            <label class="checkbox-row">
              <input type="checkbox" :checked="animation.stateMachine.enabled" @change="setAnimationStateMachineEnabled($event)" />
              Enable
            </label>
            <label>Initial State <input :value="animation.stateMachine.initialState" @input="setAnimationStateInitial($event)" /></label>
            <label>Default Action Name <input :value="getAnimationStateAction()" @input="setAnimationStateAction($event)" /></label>

            <div class="row-inline">
              <input
                class="grow"
                :value="newAnimationStateName"
                placeholder="New State Name"
                @input="newAnimationStateName = ($event.target as HTMLInputElement).value"
                @keydown.enter.prevent="addAnimationState"
              />
              <button class="small" @click="addAnimationState">Add State</button>
            </div>

            <div class="state-list" v-if="animation.stateMachine.clips.length">
              <button
                v-for="clip in animation.stateMachine.clips"
                :key="clip.name"
                type="button"
                class="state-chip"
                :class="{ active: selectedAnimationStateName === clip.name }"
                @click="selectAnimationState(clip.name)"
              >
                {{ clip.name }}
              </button>
            </div>

            <template v-if="selectedAnimationStateName">
              <label>Selected State Name <input :value="selectedAnimationStateName" @input="setSelectedAnimationStateName($event)" /></label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="selectedAnimationStateClip()?.loop ?? true" @change="setSelectedAnimationStateLoop($event)" />
                Selected State Loop
              </label>
              <label>
                Selected State Frames (one path per line)
                <textarea :value="getSelectedAnimationStateFrameText()" @input="setSelectedAnimationStateFrameText($event)"></textarea>
              </label>
              <label>
                Selected State Durations (one number per line)
                <textarea :value="getSelectedAnimationStateDurationText()" @input="setSelectedAnimationStateDurationText($event)"></textarea>
              </label>
              <button class="small danger" @click="removeAnimationState(selectedAnimationStateName)">Remove Selected State</button>
            </template>

            <div class="state-transitions">
              <div class="row-inline">
                <div class="group-title">Transitions</div>
                <button class="small" @click="addAnimationTransition">Add Transition</button>
              </div>
              <div v-if="animation.stateMachine.transitions.length" class="transition-list">
                <div v-for="(transition, index) in animation.stateMachine.transitions" :key="index" class="transition-card">
                  <label>
                    From
                    <select :value="transition.from" @change="setAnimationTransitionFrom(index, $event)">
                      <option value="*">*</option>
                      <option v-for="clip in animation.stateMachine.clips" :key="`from_${clip.name}`" :value="clip.name">{{ clip.name }}</option>
                    </select>
                  </label>
                  <label>
                    To
                    <select :value="transition.to" @change="setAnimationTransitionTo(index, $event)">
                      <option v-for="clip in animation.stateMachine.clips" :key="`to_${clip.name}`" :value="clip.name">{{ clip.name }}</option>
                    </select>
                  </label>
                  <label>
                    Condition
                    <select :value="transition.condition" @change="setAnimationTransitionCondition(index, $event)">
                      <option value="always">always</option>
                      <option value="ifMoving">ifMoving</option>
                      <option value="ifNotMoving">ifNotMoving</option>
                      <option value="ifActionDown">ifActionDown</option>
                      <option value="ifActionUp">ifActionUp</option>
                    </select>
                  </label>
                  <label v-if="transition.condition === 'ifActionDown' || transition.condition === 'ifActionUp'">
                    Action
                    <input :value="transition.action || ''" @input="setAnimationTransitionAction(index, $event)" />
                  </label>
                  <label>
                    Priority
                    <input type="number" :value="transition.priority ?? 0" @input="setAnimationTransitionPriority(index, $event)" />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.canInterrupt ?? true" @change="setAnimationTransitionCanInterrupt(index, $event)" />
                    Can Interrupt
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.once ?? false" @change="setAnimationTransitionOnce(index, $event)" />
                    Once
                  </label>
                  <label>
                    Min Progress (0-1)
                    <input type="number" step="0.01" min="0" max="1" :value="transition.minNormalizedTime ?? 0" @input="setAnimationTransitionMinNormalizedTime(index, $event)" />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.exitTime ?? false" @change="setAnimationTransitionExitTime(index, $event)" />
                    Exit Time (At Last Frame)
                  </label>
                  <button class="small danger" @click="removeAnimationTransition(index)">Remove</button>
                </div>
              </div>
              <div v-else class="tips">No transition yet.</div>
            </div>
          </div>

          <label>
            Frame Paths (one path per line)
            <textarea :value="animation.framePaths.join('\n')" @input="setAnimationFrames($event)"></textarea>
          </label>
          <div class="asset-picker">
            <button @click="appendSelectedImageToAnimation">Append Selected Image</button>
            <span>{{ animation.framePaths.length }} frames</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Animation component.</div>
          <button class="small" @click="addAnimationComponent">Add Animation Component</button>
        </template>
      </div>

      <div class="group" v-if="collider">
        <div class="group-title">Collider</div>
        <label>Width <input type="number" :value="collider.width" @input="setNumber('collider', 'width', $event)" /></label>
        <label>Height <input type="number" :value="collider.height" @input="setNumber('collider', 'height', $event)" /></label>
        <label>Offset X <input type="number" :value="collider.offsetX" @input="setNumber('collider', 'offsetX', $event)" /></label>
        <label>Offset Y <input type="number" :value="collider.offsetY" @input="setNumber('collider', 'offsetY', $event)" /></label>
        <label class="checkbox-row">
          <input type="checkbox" :checked="collider.isTrigger" @change="setChecked('collider', 'isTrigger', $event)" />
          Trigger
        </label>
      </div>

      <div class="group">
        <div class="group-title">Interactable</div>
        <template v-if="interactable">
          <label class="checkbox-row">
            <input type="checkbox" :checked="interactable.enabled" @change="setChecked('interactable', 'enabled', $event)" />
            Enabled
          </label>
          <label>Interact Distance <input type="number" min="0" :value="interactable.interactDistance" @input="setNumber('interactable', 'interactDistance', $event)" /></label>
          <label>
            Action Type
            <select :value="interactable.actionType" @change="setInteractableActionType">
              <option value="none">none</option>
              <option value="switchScene">switchScene</option>
              <option value="cycleTexture">cycleTexture</option>
              <option value="cycleTint">cycleTint</option>
              <option value="scripted">scripted</option>
            </select>
          </label>
          <label v-if="interactable.actionType === 'switchScene'">
            Target Scene
            <input :value="interactable.targetScene" @input="setText('interactable', 'targetScene', $event)" />
          </label>
          <label v-if="interactable.actionType === 'cycleTexture'">
            Texture Cycle Paths (one per line)
            <textarea :value="interactableTextureCycleBuffer" @input="setInteractableTextureCycle($event)"></textarea>
          </label>
          <label v-if="interactable.actionType === 'cycleTint'">
            Tint Cycle (decimal or 0xhex, one per line)
            <textarea :value="interactableTintCycleBuffer" @input="setInteractableTintCycle($event)"></textarea>
          </label>
          <template v-if="interactable.actionType === 'scripted'">
            <div class="tips">Use Script component + JSON actions to define interaction behavior.</div>
            <button class="small" @click="ensureInteractionScript">Create/Reset Interaction Script Template</button>
          </template>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Interactable component.</div>
          <button class="small" @click="addInteractableComponent">Add Interactable Component</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">Tilemap</div>
        <template v-if="tilemap">
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.enabled" @change="setChecked('tilemap', 'enabled', $event)" />
            Enabled
          </label>
          <label>Columns <input type="number" min="1" :value="tilemap.columns" @input="setNumber('tilemap', 'columns', $event)" @change="resizeTilemapData" /></label>
          <label>Rows <input type="number" min="1" :value="tilemap.rows" @input="setNumber('tilemap', 'rows', $event)" @change="resizeTilemapData" /></label>
          <label>Tile Width <input type="number" min="8" :value="tilemap.tileWidth" @input="setNumber('tilemap', 'tileWidth', $event)" @change="resizeTilemapData" /></label>
          <label>Tile Height <input type="number" min="8" :value="tilemap.tileHeight" @input="setNumber('tilemap', 'tileHeight', $event)" @change="resizeTilemapData" /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.showCollision" @change="setChecked('tilemap', 'showCollision', $event)" />
            Show Collision Overlay
          </label>
          <div class="row-inline">
            <button class="small" @click="openTilemapEditor('tiles')">打开 Tiles 图形窗口</button>
            <button class="small" @click="openTilemapEditor('collision')">打开 Collision 图形窗口</button>
          </div>
          <label>
            Tiles (CSV rows)
            <textarea v-model="tilemapTilesBuffer" @input="applyTilemapBuffer('tiles')"></textarea>
          </label>
          <label>
            Collision (CSV rows, 0/1)
            <textarea v-model="tilemapCollisionBuffer" @input="applyTilemapBuffer('collision')"></textarea>
          </label>
          <label>
            Tile Texture Map (value=assetPath, one per line)
            <textarea v-model="tileTextureMapBuffer" @input="applyTileTextureMapBuffer"></textarea>
          </label>
          <div class="asset-picker">
            <button @click="bindSelectedImageToTileValue">Bind Selected Image To Tile Value</button>
            <input
              class="tile-bind-input"
              v-model="tileTextureBindValueInput"
              type="number"
              min="1"
              step="1"
              placeholder="Tile Value"
            />
            <span>{{ assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : 'Select an image and bind to numeric tile value' }}</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Tilemap component.</div>
          <button class="small" @click="addTilemapComponent">Add Tilemap Component</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">UI</div>
        <template v-if="ui">
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.enabled" @change="setChecked('ui', 'enabled', $event)" />
            Enabled
          </label>
          <label>Mode
            <select :value="ui.mode" @change="setUIMode">
              <option value="text">Text</option>
              <option value="button">Button</option>
            </select>
          </label>
          <label>Text <input :value="ui.text" @input="setText('ui', 'text', $event)" /></label>
          <label>Font Size <input type="number" min="8" max="96" :value="ui.fontSize" @input="setNumber('ui', 'fontSize', $event)" /></label>
          <label>Text Color (Hex) <input :value="`0x${Number(ui.textColor).toString(16)}`" @input="setHexNumber('ui', 'textColor', $event)" /></label>
          <label>Width <input type="number" min="10" :value="ui.width" @input="setNumber('ui', 'width', $event)" /></label>
          <label>Height <input type="number" min="10" :value="ui.height" @input="setNumber('ui', 'height', $event)" /></label>
          <label>Background (Hex) <input :value="`0x${Number(ui.backgroundColor).toString(16)}`" @input="setHexNumber('ui', 'backgroundColor', $event)" /></label>
          <label>Anchor X <input type="number" min="0" max="1" step="0.01" :value="ui.anchorX" @input="setNumber('ui', 'anchorX', $event)" /></label>
          <label>Anchor Y <input type="number" min="0" max="1" step="0.01" :value="ui.anchorY" @input="setNumber('ui', 'anchorY', $event)" /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.interactable" @change="setChecked('ui', 'interactable', $event)" />
            Interactable
          </label>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have UI component.</div>
          <button class="small" @click="addUIComponent">Add UI Component</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">Audio</div>
        <template v-if="audio">
          <label class="checkbox-row">
            <input type="checkbox" :checked="audio.enabled" @change="setChecked('audio', 'enabled', $event)" />
            Enabled
          </label>
          <label>Clip Path <input :value="audio.clipPath" @input="setText('audio', 'clipPath', $event)" /></label>
          <div class="asset-picker">
            <button @click="void applySelectedAudio()">Use Selected Audio</button>
            <span>{{ assets.selectedAsset?.type === 'audio' ? assets.selectedAsset.path : 'Select an audio in Asset Tree first' }}</span>
          </div>
          <label>Group
            <select :value="audio.group" @change="setAudioGroup">
              <option value="bgm">BGM</option>
              <option value="sfx">SFX</option>
              <option value="ui">UI</option>
            </select>
          </label>
          <label>Volume <input type="number" min="0" max="1" step="0.05" :value="audio.volume" @input="setNumber('audio', 'volume', $event)" /></label>
          <label class="checkbox-row"><input type="checkbox" :checked="audio.loop" @change="setChecked('audio', 'loop', $event)" />Loop</label>
          <label class="checkbox-row"><input type="checkbox" :checked="audio.playOnStart" @change="setChecked('audio', 'playOnStart', $event)" />Play On Start</label>
          <label class="checkbox-row"><input type="checkbox" :checked="audio.playing" @change="setChecked('audio', 'playing', $event)" />Playing</label>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Audio component.</div>
          <button class="small" @click="addAudioComponent">Add Audio Component</button>
        </template>
      </div>

      <div class="group">
        <div class="group-title">Camera</div>
        <template v-if="camera">
          <label>Zoom <input type="number" step="0.1" min="0.1" :value="camera.zoom" @input="setNumber('camera', 'zoom', $event)" /></label>
          <label>Follow Entity ID <input :value="camera.followEntityId" @input="setText('camera', 'followEntityId', $event)" /></label>
          <label>Follow Smoothing <input type="number" step="0.01" min="0" max="1" :value="camera.followSmoothing" @input="setNumber('camera', 'followSmoothing', $event)" /></label>
          <label>Offset X <input type="number" :value="camera.offsetX" @input="setNumber('camera', 'offsetX', $event)" /></label>
          <label>Offset Y <input type="number" :value="camera.offsetY" @input="setNumber('camera', 'offsetY', $event)" /></label>
          <label class="checkbox-row"><input type="checkbox" :checked="camera.boundsEnabled" @change="setChecked('camera', 'boundsEnabled', $event)" />Enable Bounds</label>
          <template v-if="camera.boundsEnabled">
            <label>Min X <input type="number" :value="camera.minX" @input="setNumber('camera', 'minX', $event)" /></label>
            <label>Max X <input type="number" :value="camera.maxX" @input="setNumber('camera', 'maxX', $event)" /></label>
            <label>Min Y <input type="number" :value="camera.minY" @input="setNumber('camera', 'minY', $event)" /></label>
            <label>Max Y <input type="number" :value="camera.maxY" @input="setNumber('camera', 'maxY', $event)" /></label>
          </template>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Camera component.</div>
          <button class="small" @click="addCameraComponent">Add Camera Component</button>
        </template>
      </div>
    </template>

    <div v-else class="empty">Select an entity in Scene Tree or Viewport first.</div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AnimationComponent } from '../../engine/components/AnimationComponent'
import { AudioComponent } from '../../engine/components/AudioComponent'
import { BackgroundComponent } from '../../engine/components/BackgroundComponent'
import { CameraComponent } from '../../engine/components/CameraComponent'
import type { ColliderComponent } from '../../engine/components/ColliderComponent'
import { InteractableComponent } from '../../engine/components/InteractableComponent'
import { ScriptComponent } from '../../engine/components/ScriptComponent'
import type { SpriteComponent } from '../../engine/components/SpriteComponent'
import { TilemapComponent } from '../../engine/components/TilemapComponent'
import type { TransformComponent } from '../../engine/components/TransformComponent'
import { UIComponent } from '../../engine/components/UIComponent'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()

const activeScene = computed(() => {
  if (runtime.isPlaying && sceneStore.runtimeScene) {
    const _tick = sceneStore.runtimeRevision
    void _tick
    return sceneStore.runtimeScene
  }
  return sceneStore.currentScene
})

const entity = computed(() => activeScene.value?.getEntityById(selection.selectedEntityId) ?? null)
const transform = computed(() => entity.value?.getComponent<TransformComponent>('Transform') ?? null)
const sprite = computed(() => entity.value?.getComponent<SpriteComponent>('Sprite') ?? null)
const background = computed(() => entity.value?.getComponent<BackgroundComponent>('Background') ?? null)
const animation = computed(() => entity.value?.getComponent<AnimationComponent>('Animation') ?? null)
const collider = computed(() => entity.value?.getComponent<ColliderComponent>('Collider') ?? null)
const interactable = computed(() => entity.value?.getComponent<InteractableComponent>('Interactable') ?? null)
const script = computed(() => entity.value?.getComponent<ScriptComponent>('Script') ?? null)
const camera = computed(() => entity.value?.getComponent<CameraComponent>('Camera') ?? null)
const audio = computed(() => entity.value?.getComponent<AudioComponent>('Audio') ?? null)
const ui = computed(() => entity.value?.getComponent<UIComponent>('UI') ?? null)
const tilemap = computed(() => entity.value?.getComponent<TilemapComponent>('Tilemap') ?? null)
const newAnimationStateName = ref('')
const selectedAnimationStateName = ref('Idle')
const animationStateClips = computed(() => animation.value?.stateMachine.clips ?? [])
const tilemapTilesBuffer = ref('')
const tilemapCollisionBuffer = ref('')
const tileTextureMapBuffer = ref('')
const tileTextureBindValueInput = ref('1')
const interactableTextureCycleBuffer = ref('')
const interactableTintCycleBuffer = ref('')

interface TilemapEditorApplyPayload {
  entityId: string
  mode: 'tiles' | 'collision'
  tiles: number[]
  collision: number[]
  tileTextureMap?: Record<number, string>
}

let removeTilemapEditorListener: (() => void) | null = null

function applyTilemapEditorPayload(raw: unknown) {
  const payload = (raw || {}) as Partial<TilemapEditorApplyPayload>
  if (!payload.entityId || !sceneStore.currentScene) return
  const entity = sceneStore.currentScene.getEntityById(String(payload.entityId))
  const map = entity?.getComponent<TilemapComponent>('Tilemap')
  if (!map) return
  const size = Math.max(1, map.columns * map.rows)
  map.tiles = normalizeTileArray((payload.tiles || []) as number[], size)
  map.collision = normalizeTileArray((payload.collision || []) as number[], size)
  if (payload.tileTextureMap && typeof payload.tileTextureMap === 'object') {
    map.tileTextureMap = { ...(payload.tileTextureMap as Record<number, string>) }
  }
  tilemapTilesBuffer.value = tilemapToText(map.tiles)
  tilemapCollisionBuffer.value = tilemapToText(map.collision)
  tileTextureMapBuffer.value = tileTextureMapToText(map.tileTextureMap)
  sceneStore.markDirty()
}

onMounted(() => {
  removeTilemapEditorListener = window.unu?.onTilemapEditorApply?.((payload) => applyTilemapEditorPayload(payload)) || null
})

onBeforeUnmount(() => {
  removeTilemapEditorListener?.()
  removeTilemapEditorListener = null
})

watch(
  animationStateClips,
  (clips) => {
    if (!clips.length) {
      selectedAnimationStateName.value = ''
      return
    }
    if (!clips.some((clip) => clip.name === selectedAnimationStateName.value)) {
      selectedAnimationStateName.value = clips[0].name
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => [
    tilemap.value?.columns,
    tilemap.value?.rows,
    tilemap.value?.tiles,
    tilemap.value?.collision,
    tilemap.value?.tileTextureMap
  ],
  () => {
    if (!tilemap.value) {
      tilemapTilesBuffer.value = ''
      tilemapCollisionBuffer.value = ''
      tileTextureMapBuffer.value = ''
      return
    }
    tilemapTilesBuffer.value = tilemapToText(tilemap.value.tiles)
    tilemapCollisionBuffer.value = tilemapToText(tilemap.value.collision)
    tileTextureMapBuffer.value = tileTextureMapToText(tilemap.value.tileTextureMap)
  },
  { immediate: true, deep: true }
)

watch(
  () => [interactable.value?.actionType, interactable.value?.targetScene, interactable.value?.textureCycle, interactable.value?.tintCycle],
  () => {
    if (!interactable.value) {
      interactableTextureCycleBuffer.value = ''
      interactableTintCycleBuffer.value = ''
      return
    }
    interactableTextureCycleBuffer.value = (interactable.value.textureCycle || []).map((item) => String(item || '').trim()).filter(Boolean).join('\n')
    interactableTintCycleBuffer.value = (interactable.value.tintCycle || []).map((item) => String(Math.round(Number(item) || 0))).join('\n')
  },
  { immediate: true, deep: true }
)

function setEntityName(value: string) {
  if (runtime.isPlaying) return
  if (!entity.value) return
  entity.value.name = value
  sceneStore.markDirty()
}

function setNumber(group: 'transform' | 'sprite' | 'collider' | 'animation' | 'camera' | 'audio' | 'ui' | 'tilemap' | 'interactable', key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = Number((event.target as HTMLInputElement).value)
  if (group === 'transform' && transform.value) (transform.value as Record<string, number>)[key] = value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, number>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, number>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, number>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, number>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, number>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, number>)[key] = value
  if (group === 'tilemap' && tilemap.value) (tilemap.value as Record<string, number>)[key] = Math.round(value)
  if (group === 'interactable' && interactable.value) (interactable.value as unknown as Record<string, number>)[key] = Math.max(0, value)
  sceneStore.markDirty()
}

function setText(group: 'sprite' | 'camera' | 'audio' | 'ui' | 'interactable', key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = (event.target as HTMLInputElement).value
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, string>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, string>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, string>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, string>)[key] = value
  if (group === 'interactable' && interactable.value) (interactable.value as unknown as Record<string, string>)[key] = value
  sceneStore.markDirty()
}

function setHexNumber(group: 'ui', key: string, event: Event) {
  if (runtime.isPlaying) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const normalized = raw.startsWith('0x') || raw.startsWith('0X') ? raw.slice(2) : raw.replace('#', '')
  const parsed = Number.parseInt(normalized, 16)
  if (!Number.isFinite(parsed)) return
  if (group === 'ui' && ui.value) (ui.value as Record<string, number>)[key] = parsed
  sceneStore.markDirty()
}

function setChecked(group: 'sprite' | 'background' | 'collider' | 'animation' | 'camera' | 'audio' | 'ui' | 'tilemap' | 'interactable', key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = (event.target as HTMLInputElement).checked
  if (group === 'sprite' && sprite.value) (sprite.value as Record<string, boolean>)[key] = value
  if (group === 'background' && background.value) (background.value as unknown as Record<string, boolean>)[key] = value
  if (group === 'collider' && collider.value) (collider.value as Record<string, boolean>)[key] = value
  if (group === 'animation' && animation.value) (animation.value as Record<string, boolean>)[key] = value
  if (group === 'camera' && camera.value) (camera.value as Record<string, boolean>)[key] = value
  if (group === 'audio' && audio.value) (audio.value as Record<string, boolean>)[key] = value
  if (group === 'ui' && ui.value) (ui.value as Record<string, boolean>)[key] = value
  if (group === 'tilemap' && tilemap.value) (tilemap.value as Record<string, boolean>)[key] = value
  if (group === 'interactable' && interactable.value) (interactable.value as unknown as Record<string, boolean>)[key] = value
  sceneStore.markDirty()
}

function setInteractableActionType(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const value = (event.target as HTMLSelectElement).value
  if (value === 'switchScene' || value === 'cycleTexture' || value === 'cycleTint' || value === 'scripted' || value === 'none') {
    interactable.value.actionType = value
    sceneStore.markDirty()
  }
}

function setInteractableTextureCycle(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const rows = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  interactableTextureCycleBuffer.value = rows.join('\n')
  interactable.value.textureCycle = rows
  sceneStore.markDirty()
}

function setInteractableTintCycle(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const rows = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  const parsed = rows
    .map((value) => {
      if (/^0x[0-9a-f]+$/i.test(value)) return Number.parseInt(value.slice(2), 16)
      const n = Number(value)
      return Number.isFinite(n) ? Math.round(n) : null
    })
    .filter((value): value is number => value !== null)
  interactableTintCycleBuffer.value = rows.join('\n')
  interactable.value.tintCycle = parsed
  sceneStore.markDirty()
}

function addInteractableComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || interactable.value) return
  entity.value.addComponent(new InteractableComponent(true, 180, 'none'))
  sceneStore.markDirty()
}

function ensureInteractionScript() {
  if (runtime.isPlaying) return
  if (!entity.value) return
  const template = `{
  "onInteract": [
    {
      "type": "cycleTint",
      "target": "self",
      "values": [16777215, 16762880, 9293460, 7979007]
    }
  ]
}`
  let component = script.value
  if (!component) {
    component = new ScriptComponent('custom://interaction', template, true)
    entity.value.addComponent(component)
  } else {
    component.scriptPath = component.scriptPath || 'custom://interaction'
    component.sourceCode = template
    component.enabled = true
    component.instance = null
    component.initialized = false
    component.started = false
  }
  sceneStore.markDirty()
}

function setAnimationFrames(event: Event) {
  if (runtime.isPlaying) return
  if (!animation.value) return
  animation.value.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  sceneStore.markDirty()
}

function setBackgroundFitMode(event: Event) {
  if (runtime.isPlaying) return
  if (!background.value) return
  const value = (event.target as HTMLSelectElement).value
  background.value.fitMode = value === 'contain' ? 'contain' : 'cover'
  sceneStore.markDirty()
}

function addBackgroundComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || background.value) return
  entity.value.addComponent(new BackgroundComponent(true, true, 'cover'))
  if (!sprite.value) {
    entity.value.addComponent(new SpriteComponent('assets/images/pixel/background/background-img.png', 1539, 1022, true, 1, 0xffffff, false))
  }
  sceneStore.markDirty()
}

function ensureAnimationStateMachineDefaults() {
  if (!animation.value) return
  if (!animation.value.stateMachine.clips.length) {
    animation.value.stateMachine.clips = [
      {
        name: 'Idle',
        framePaths: [...animation.value.framePaths],
        frameDurations: animation.value.framePaths.map((_, index) => Math.max(1, Number(animation.value?.frameDurations[index] ?? 1))),
        loop: true
      },
      { name: 'Run', framePaths: [], frameDurations: [], loop: true },
      { name: 'Attack', framePaths: [], frameDurations: [], loop: false }
    ]
  }
  if (!animation.value.stateMachine.transitions.length) {
    animation.value.stateMachine.transitions = [
      { from: 'Idle', to: 'Run', condition: 'ifMoving' },
      { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
      { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
      { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
      { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6, exitTime: true }
    ]
  }
}

function setAnimationStateMachineEnabled(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.enabled = (event.target as HTMLInputElement).checked
  if (animation.value.stateMachine.enabled) {
    ensureAnimationStateMachineDefaults()
    if (!animation.value.stateMachine.initialState) animation.value.stateMachine.initialState = 'Idle'
    if (!animation.value.stateMachine.currentState) animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  sceneStore.markDirty()
}

function setAnimationStateInitial(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.initialState = (event.target as HTMLInputElement).value.trim() || 'Idle'
  if (!animation.value.stateMachine.currentState) animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  sceneStore.markDirty()
}

function getAnimationStateAction() {
  if (!animation.value) return 'fire'
  const hit = animation.value.stateMachine.transitions.find((item) => item.condition === 'ifActionDown' || item.condition === 'ifActionUp')
  return hit?.action || 'fire'
}

function setAnimationStateAction(event: Event) {
  if (!animation.value) return
  const action = (event.target as HTMLInputElement).value.trim() || 'fire'
  ensureAnimationStateMachineDefaults()
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item) =>
    item.condition === 'ifActionDown' || item.condition === 'ifActionUp' ? { ...item, action } : item
  )
  sceneStore.markDirty()
}

function ensureAnimationStateClip(name: string) {
  if (!animation.value) return null
  let clip = animation.value.stateMachine.clips.find((item) => item.name === name) || null
  if (!clip) {
    clip = { name, framePaths: [], frameDurations: [], loop: name !== 'Attack' }
    animation.value.stateMachine.clips = [...animation.value.stateMachine.clips, clip]
  }
  return clip
}

function getAnimationStateClipText(name: string) {
  const clip = animation.value?.stateMachine.clips.find((item) => item.name === name)
  return clip?.framePaths.join('\n') || ''
}

function setAnimationStateClipText(name: string, event: Event) {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const clip = ensureAnimationStateClip(name)
  if (!clip) return
  clip.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === name ? clip : item)
  sceneStore.markDirty()
}

function addAnimationState() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const name = newAnimationStateName.value.trim()
  if (!name) return
  if (animation.value.stateMachine.clips.some((clip) => clip.name === name)) return
  animation.value.stateMachine.clips = [
    ...animation.value.stateMachine.clips,
    { name, framePaths: [], frameDurations: [], loop: true }
  ]
  if (!animation.value.stateMachine.initialState) animation.value.stateMachine.initialState = name
  selectedAnimationStateName.value = name
  newAnimationStateName.value = ''
  sceneStore.markDirty()
}

function selectAnimationState(name: string) {
  selectedAnimationStateName.value = name
}

function removeAnimationState(name: string) {
  if (!animation.value) return
  if (animation.value.stateMachine.clips.length <= 1) return
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.filter((clip) => clip.name !== name)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((item) => item.from !== name && item.to !== name)
  if (animation.value.stateMachine.initialState === name) {
    animation.value.stateMachine.initialState = animation.value.stateMachine.clips[0]?.name || 'Idle'
  }
  if (animation.value.stateMachine.currentState === name) {
    animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  if (selectedAnimationStateName.value === name) {
    selectedAnimationStateName.value = animation.value.stateMachine.clips[0]?.name || ''
  }
  sceneStore.markDirty()
}

function setSelectedAnimationStateName(event: Event) {
  if (!animation.value) return
  const raw = (event.target as HTMLInputElement).value.trim()
  if (!raw) return
  const clip = animation.value.stateMachine.clips.find((item) => item.name === selectedAnimationStateName.value)
  if (!clip) return
  if (raw !== clip.name && animation.value.stateMachine.clips.some((item) => item.name === raw)) return
  const previous = clip.name
  clip.name = raw
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item === clip ? { ...clip } : item)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item) => ({
    ...item,
    from: item.from === previous ? raw : item.from,
    to: item.to === previous ? raw : item.to
  }))
  if (animation.value.stateMachine.initialState === previous) animation.value.stateMachine.initialState = raw
  if (animation.value.stateMachine.currentState === previous) animation.value.stateMachine.currentState = raw
  selectedAnimationStateName.value = raw
  sceneStore.markDirty()
}

function selectedAnimationStateClip() {
  if (!animation.value) return null
  return animation.value.stateMachine.clips.find((item) => item.name === selectedAnimationStateName.value) || null
}

function getSelectedAnimationStateFrameText() {
  return selectedAnimationStateClip()?.framePaths.join('\n') || ''
}

function setSelectedAnimationStateFrameText(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  clip.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function getSelectedAnimationStateDurationText() {
  const clip = selectedAnimationStateClip()
  if (!clip) return ''
  return clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1))).join('\n')
}

function setSelectedAnimationStateDurationText(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  const values = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => Math.max(1, Number(line.trim() || 1)))
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(values[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function setSelectedAnimationStateLoop(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  clip.loop = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function addAnimationTransition() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const fallback = animation.value.stateMachine.clips[0]?.name || 'Idle'
  animation.value.stateMachine.transitions = [
    ...animation.value.stateMachine.transitions,
    { from: fallback, to: fallback, condition: 'always' }
  ]
  sceneStore.markDirty()
}

function removeAnimationTransition(index: number) {
  if (!animation.value) return
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((_, i) => i !== index)
  sceneStore.markDirty()
}

function setAnimationTransitionFrom(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, from: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionTo(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, to: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionCondition(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value as 'always' | 'ifMoving' | 'ifNotMoving' | 'ifActionDown' | 'ifActionUp'
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, condition: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionAction(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).value.trim()
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, action: value || undefined } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionPriority(index: number, event: Event) {
  if (!animation.value) return
  const value = Number((event.target as HTMLInputElement).value || 0)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, priority: Number.isFinite(value) ? value : 0 } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionCanInterrupt(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, canInterrupt: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionOnce(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, once: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionMinNormalizedTime(index: number, event: Event) {
  if (!animation.value) return
  const raw = Number((event.target as HTMLInputElement).value || 0)
  const value = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0))
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, minNormalizedTime: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionExitTime(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, exitTime: value } : item
  )
  sceneStore.markDirty()
}

async function applySelectedImage() {
  if (runtime.isPlaying) return
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
  if (runtime.isPlaying) return
  if (!animation.value || assets.selectedAsset?.type !== 'image') return
  animation.value.framePaths = [...animation.value.framePaths, assets.selectedAsset.path]
  sceneStore.markDirty()
}

function addAnimationComponent() {
  if (runtime.isPlaying) return
  if (!entity.value) return
  entity.value.addComponent(
    new AnimationComponent(
      true,
      true,
      8,
      true,
      0,
      0,
      [],
      [],
      '',
      '',
      null,
      [],
      { positionX: [], positionY: [], rotation: [] },
      {
        enabled: false,
        initialState: 'Idle',
        currentState: '',
        clips: [
          { name: 'Idle', framePaths: [], frameDurations: [], loop: true },
          { name: 'Run', framePaths: [], frameDurations: [], loop: true },
          { name: 'Attack', framePaths: [], frameDurations: [], loop: false }
        ],
        transitions: [
          { from: 'Idle', to: 'Run', condition: 'ifMoving' },
          { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
          { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6, exitTime: true }
        ]
      }
    )
  )
  sceneStore.markDirty()
}

function parseTilemapText(text: string, rows: number, cols: number) {
  const lines = text.split('\n')
  const array: number[] = []
  for (let r = 0; r < rows; r += 1) {
    const rowText = (lines[r] || '').trim()
    const values = rowText ? rowText.split(',').map((v) => Number(v.trim() || 0)) : []
    for (let c = 0; c < cols; c += 1) {
      const value = Number(values[c] ?? 0)
      array.push(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0)
    }
  }
  return array
}

function applyTilemapBuffer(kind: 'tiles' | 'collision') {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  const source = kind === 'tiles' ? tilemapTilesBuffer.value : tilemapCollisionBuffer.value
  const parsed = parseTilemapText(source, tilemap.value.rows, tilemap.value.columns)
  if (kind === 'tiles') tilemap.value.tiles = parsed
  else tilemap.value.collision = parsed
  sceneStore.markDirty()
}

function resizeTilemapData() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  tilemap.value.columns = Math.max(1, Math.round(tilemap.value.columns))
  tilemap.value.rows = Math.max(1, Math.round(tilemap.value.rows))
  tilemap.value.tileWidth = Math.max(8, Math.round(tilemap.value.tileWidth))
  tilemap.value.tileHeight = Math.max(8, Math.round(tilemap.value.tileHeight))
  const size = tilemap.value.columns * tilemap.value.rows
  tilemap.value.tiles = normalizeTileArray(tilemap.value.tiles, size)
  tilemap.value.collision = normalizeTileArray(tilemap.value.collision, size)
  tilemapTilesBuffer.value = tilemapToText(tilemap.value.tiles)
  tilemapCollisionBuffer.value = tilemapToText(tilemap.value.collision)
  sceneStore.markDirty()
}

function tilemapToText(values: number[] | undefined) {
  if (!tilemap.value) return ''
  const cols = tilemap.value.columns
  const rows = tilemap.value.rows
  const safe = normalizeTileArray(values || [], cols * rows)
  const lines: string[] = []
  for (let r = 0; r < rows; r += 1) lines.push(safe.slice(r * cols, (r + 1) * cols).join(','))
  return lines.join('\n')
}

function normalizeTileArray(values: number[], size: number) {
  const next = values.slice(0, size).map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0))
  while (next.length < size) next.push(0)
  return next
}

function tileTextureMapToText(map: Record<number, string> | undefined) {
  const source = map || {}
  return Object.keys(source)
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
    .map((value) => `${value}=${String(source[value] || '').trim()}`)
    .join('\n')
}

function applyTileTextureMapBuffer() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  const map: Record<number, string> = {}
  for (const rawLine of tileTextureMapBuffer.value.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const [left, ...rest] = line.split('=')
    const value = Math.round(Number(left.trim()))
    const path = rest.join('=').trim()
    if (!Number.isFinite(value) || value <= 0 || !path) continue
    map[value] = path
  }
  tilemap.value.tileTextureMap = map
  sceneStore.markDirty()
}

function bindSelectedImageToTileValue() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  if (assets.selectedAsset?.type !== 'image') {
    project.setStatus('请先在资源树中选中一张图片。')
    return
  }
  const value = Math.round(Number(tileTextureBindValueInput.value))
  if (!Number.isFinite(value) || value <= 0) {
    project.setStatus('请输入有效的 Tile 数值（正整数）。')
    return
  }
  tilemap.value.tileTextureMap = { ...(tilemap.value.tileTextureMap || {}), [value]: assets.selectedAsset.path }
  tileTextureMapBuffer.value = tileTextureMapToText(tilemap.value.tileTextureMap)
  sceneStore.markDirty()
  project.setStatus(`已绑定 Tile 值 ${value} -> ${assets.selectedAsset.path}`)
}

async function applySelectedImageToBackground() {
  if (runtime.isPlaying) return
  if (assets.selectedAsset?.type !== 'image') return
  if (!entity.value) return
  if (!sprite.value) {
    entity.value.addComponent(new SpriteComponent(assets.selectedAsset.path, 1539, 1022, true, 1, 0xffffff, false))
  } else {
    sprite.value.texturePath = assets.selectedAsset.path
  }
  if (!background.value) {
    entity.value.addComponent(new BackgroundComponent(true, true, 'cover'))
  }
  sceneStore.markDirty()
}

async function openTilemapEditor(mode: 'tiles' | 'collision') {
  if (runtime.isPlaying) return
  if (!tilemap.value || !entity.value) return
  if (!window.unu?.openTilemapEditor) {
    project.setStatus('当前环境未接入 Tilemap 子窗口编辑器，请使用桌面版运行。')
    return
  }
  const result = await window.unu.openTilemapEditor({
    entityId: entity.value.id,
    entityName: entity.value.name,
    projectRoot: project.rootPath,
    mode,
    columns: tilemap.value.columns,
    rows: tilemap.value.rows,
    tileWidth: tilemap.value.tileWidth,
    tileHeight: tilemap.value.tileHeight,
    tiles: [...tilemap.value.tiles],
    collision: [...tilemap.value.collision],
    tileTextureMap: { ...(tilemap.value.tileTextureMap || {}) }
  })
  if (!result?.ok) {
    project.setStatus(`打开 Tilemap 图形窗口失败：${result?.error || '未知错误'}`)
    return
  }
  project.setStatus(`已打开 Tilemap 图形窗口：${mode === 'tiles' ? 'Tiles' : 'Collision'}`)
}

function addTilemapComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || tilemap.value) return
  entity.value.addComponent(new TilemapComponent(true, 12, 8, 48, 48))
  sceneStore.markDirty()
}

function setUIMode(event: Event) {
  if (runtime.isPlaying) return
  if (!ui.value) return
  ui.value.mode = (event.target as HTMLSelectElement).value === 'button' ? 'button' : 'text'
  sceneStore.markDirty()
}

function addUIComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || ui.value) return
  entity.value.addComponent(new UIComponent(true, 'text', 'UI Text', 20, 0xffffff, 180, 48, 0x2b3242, 0.5, 0.5, true))
  sceneStore.markDirty()
}

function setAudioGroup(event: Event) {
  if (runtime.isPlaying) return
  if (!audio.value) return
  const next = (event.target as HTMLSelectElement).value
  audio.value.group = next === 'bgm' || next === 'ui' ? next : 'sfx'
  sceneStore.markDirty()
}

async function applySelectedAudio() {
  if (runtime.isPlaying) return
  if (!audio.value || assets.selectedAsset?.type !== 'audio') return
  audio.value.clipPath = assets.selectedAsset.path
  sceneStore.markDirty()
}

function addAudioComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || audio.value) return
  entity.value.addComponent(new AudioComponent(true, '', 'sfx', 1, false, false, false))
  sceneStore.markDirty()
}

function addCameraComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || camera.value) return
  entity.value.addComponent(new CameraComponent(true, 1, '', 0.18, 0, 0, false))
  sceneStore.markDirty()
}
</script>

<style scoped>
.inspector { display: grid; gap: 12px; min-width: 0; width: 100%; }
h3 { margin: 0; }
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; }
.subgroup { border: 1px solid #2b3344; border-radius: 8px; padding: 8px; display: grid; gap: 8px; background: #161d2a; min-width: 0; width: 100%; box-sizing: border-box; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
input:not([type='checkbox']), textarea, select {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
textarea { min-height: 96px; resize: vertical; }
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.readonly, .empty, .tips { color: #a8b5c7; }
.asset-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #9bb0c9;
  min-width: 0;
  width: 100%;
}
.asset-picker .tile-bind-input {
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  padding: 6px 8px;
}
.asset-picker span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-picker button, .small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.small.danger {
  border-color: #5b2631;
  background: #3b1e27;
}
.row-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  width: 100%;
}
.grow { flex: 1; min-width: 0; }
.state-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.state-chip {
  border: 1px solid #2f3a4c;
  background: #1f2735;
  color: #d7e1ee;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.state-chip.active {
  border-color: #56b6c2;
  background: #1c3741;
}
.state-transitions {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.transition-list {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.transition-card {
  display: grid;
  gap: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  padding: 8px;
  background: #131b28;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
</style>


