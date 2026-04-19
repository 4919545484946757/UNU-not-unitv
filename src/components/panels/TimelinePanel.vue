<template>
  <div class="timeline-panel">
    <div class="title-row">
      <div>
        <div class="title">Timeline</div>
        <div class="subtitle">动画帧、图集切片、播放头、事件轨道、状态机</div>
      </div>
      <div class="badge" v-if="animation">{{ animation.animationAssetPath || '未绑定动画资源' }}</div>
    </div>

    <template v-if="entity && animation">
      <div class="toolbar-row">
        <button @click="togglePreview">{{ editor.timelinePreviewPlaying ? '停止预览' : '播放预览' }}</button>
        <button @click="appendSelectedImage">追加选中图片</button>
        <button @click="bindSelectedAtlas" :disabled="assets.selectedAsset?.type !== 'atlas'">绑定图集</button>
        <button @click="removeCurrentFrame" :disabled="!animation.framePaths.length">删除当前帧</button>
        <button @click="saveAnimationAsset">保存动画资源</button>
        <button @click="openAnimationAsset">打开动画资源</button>
        <button @click="generateAtlasSliceAsset">生成图集描述</button>
      </div>

      <div class="meta-grid">
        <label>
          动画名
          <input :value="entity.name + '_anim'" disabled />
        </label>
        <label>
          FPS
          <input type="number" min="1" :value="animation.fps" @input="setFps" />
        </label>
        <label class="checkbox-row">
          <input type="checkbox" :checked="animation.loop" @change="setLoop" />
          Loop
        </label>
      </div>

      <div class="playhead-block">
        <div class="playhead-header">
          <span>播放头</span>
          <span>{{ Math.round(playheadProgress * 100) }}% · 当前帧 {{ animation.currentFrame }}</span>
        </div>
        <input class="playhead-slider" type="range" min="0" max="1000" :value="Math.round(playheadProgress * 1000)" @input="scrubPlayhead" />
      </div>

      <div class="timeline-strip">
        <button
          v-for="(framePath, index) in animation.framePaths"
          :key="framePath + '_' + index"
          class="frame-card"
          :class="{ active: editor.timelineFrameIndex === index, playback: animation.currentFrame === index && editor.timelinePreviewPlaying }"
          @click="editor.setTimelineFrameIndex(index)"
        >
          <div class="frame-index">{{ index }}</div>
          <div class="frame-name">{{ frameLabel(framePath) }}</div>
          <div class="frame-duration">{{ animation.frameDurations[index] ?? 1 }}x</div>
        </button>
      </div>

      <div class="frame-editor" v-if="currentFramePath">
        <div class="group-title">当前帧</div>
        <label>
          图片路径
          <input :value="currentFramePath" @input="setCurrentFramePath" />
        </label>
        <label>
          时长倍率
          <input type="number" min="1" :value="currentFrameDuration" @input="setCurrentFrameDuration" />
        </label>
      </div>

      <div class="state-machine-block">
        <div class="group-title">动画状态机</div>
        <label class="checkbox-row">
          <input type="checkbox" :checked="animation.stateMachine.enabled" @change="setStateMachineEnabled" />
          启用状态机
        </label>
        <div class="state-meta">
          <label>
            初始状态
            <select :value="animation.stateMachine.initialState" @change="setInitialState">
              <option v-for="clip in animation.stateMachine.clips" :key="`initial_${clip.name}`" :value="clip.name">{{ clip.name }}</option>
            </select>
          </label>
          <label>
            当前状态（运行时）
            <input :value="animation.stateMachine.currentState || '-'" readonly />
          </label>
        </div>

        <div class="row-inline">
          <input
            class="grow"
            :value="newStateName"
            placeholder="新增状态名，如 Jump"
            @input="newStateName = ($event.target as HTMLInputElement).value"
            @keydown.enter.prevent="addState"
          />
          <button @click="addState">新增状态</button>
        </div>

        <div class="state-chip-list" v-if="animation.stateMachine.clips.length">
          <button
            v-for="clip in animation.stateMachine.clips"
            :key="clip.name"
            class="state-chip"
            :class="{ active: selectedState === clip.name }"
            @click="selectState(clip.name)"
          >
            {{ clip.name }}
          </button>
        </div>

        <template v-if="selectedClip">
          <div class="state-editor">
            <label>
              状态名
              <input :value="selectedClip.name" @input="renameSelectedState" />
            </label>
            <label class="checkbox-row">
              <input type="checkbox" :checked="selectedClip.loop" @change="setSelectedStateLoop" />
              该状态循环
            </label>
            <label>
              状态帧（每行一张）
              <textarea :value="selectedClip.framePaths.join('\n')" @input="setSelectedStateFrames"></textarea>
            </label>
            <label>
              状态帧时长（每行一个数）
              <textarea :value="selectedClip.frameDurations.join('\n')" @input="setSelectedStateDurations"></textarea>
            </label>
            <div class="toolbar-row compact">
              <button @click="appendSelectedImageToState">向该状态追加选中图片</button>
              <button class="danger" @click="removeSelectedState" :disabled="animation.stateMachine.clips.length <= 1">删除该状态</button>
            </div>
          </div>
        </template>

        <div class="transition-block">
          <div class="graph-board" v-if="animation.stateMachine.transitions.length">
            <div class="graph-title">转场预览</div>
            <div class="graph-list">
              <div v-for="(transition, index) in animation.stateMachine.transitions" :key="`graph_${index}`" class="graph-edge">
                <span class="graph-node">{{ transition.from || '*' }}</span>
                <span class="graph-arrow">→</span>
                <span class="graph-node">{{ transition.to }}</span>
                <span class="graph-cond">{{ transition.condition }}{{ transition.action ? `(${transition.action})` : '' }}</span>
                <span class="graph-meta">p={{ transition.priority ?? 0 }} · min={{ transition.minNormalizedTime ?? 0 }} · {{ transition.canInterrupt ?? true ? 'interrupt' : 'wait-end' }} · {{ transition.once ? 'once' : 'repeat' }}</span>
              </div>
            </div>
          </div>
          <div class="row-inline">
            <div class="group-title">状态转场</div>
            <button @click="addTransition">新增转场</button>
          </div>
          <div v-if="animation.stateMachine.transitions.length" class="transition-list">
            <div v-for="(transition, index) in animation.stateMachine.transitions" :key="index" class="transition-item">
              <label>
                From
                <select :value="transition.from" @change="setTransitionFrom(index, $event)">
                  <option value="*">*</option>
                  <option v-for="clip in animation.stateMachine.clips" :key="`from_${clip.name}_${index}`" :value="clip.name">{{ clip.name }}</option>
                </select>
              </label>
              <label>
                To
                <select :value="transition.to" @change="setTransitionTo(index, $event)">
                  <option v-for="clip in animation.stateMachine.clips" :key="`to_${clip.name}_${index}`" :value="clip.name">{{ clip.name }}</option>
                </select>
              </label>
              <label>
                Condition
                <select :value="transition.condition" @change="setTransitionCondition(index, $event)">
                  <option value="always">always</option>
                  <option value="ifMoving">ifMoving</option>
                  <option value="ifNotMoving">ifNotMoving</option>
                  <option value="ifActionDown">ifActionDown</option>
                  <option value="ifActionUp">ifActionUp</option>
                </select>
              </label>
              <label v-if="transition.condition === 'ifActionDown' || transition.condition === 'ifActionUp'">
                Action
                <input :value="transition.action || ''" @input="setTransitionAction(index, $event)" placeholder="fire" />
              </label>
              <label>
                Priority
                <input type="number" :value="transition.priority ?? 0" @input="setTransitionPriority(index, $event)" />
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="transition.canInterrupt ?? true" @change="setTransitionCanInterrupt(index, $event)" />
                Can Interrupt
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="transition.once ?? false" @change="setTransitionOnce(index, $event)" />
                Once
              </label>
              <label>
                Min Progress (0-1)
                <input type="number" step="0.01" min="0" max="1" :value="transition.minNormalizedTime ?? 0" @input="setTransitionMinNormalizedTime(index, $event)" />
              </label>
              <button class="danger" @click="removeTransition(index)">删除</button>
            </div>
          </div>
          <div v-else class="tips">暂无转场，点击“新增转场”开始配置。</div>
        </div>
      </div>

      <div class="event-track">
        <div class="group-title">事件轨道</div>
        <div class="toolbar-row compact">
          <button @click="addEventAtCurrentFrame">添加当前帧事件</button>
        </div>
        <div v-if="currentFrameEvents.length" class="event-list">
          <div v-for="(eventItem, idx) in currentFrameEvents" :key="idx" class="event-card">
            <label>
              事件名
              <input :value="eventItem.name" @input="updateEventName(eventIndexes[idx], $event)" />
            </label>
            <label>
              Payload
              <input :value="eventItem.payload || ''" @input="updateEventPayload(eventIndexes[idx], $event)" />
            </label>
            <button @click="removeEvent(eventIndexes[idx])">删除事件</button>
          </div>
        </div>
        <div v-else class="tips">当前帧还没有事件。</div>
      </div>

      <div class="tips">已支持图集子帧预览与状态机驱动。建议先绑定 `.atlas.json`，再按状态划分帧并配置转场条件。</div>
    </template>

    <template v-else-if="entity">
      <div class="tips">当前实体还没有 Animation 组件。</div>
      <button class="small" @click="addAnimationComponent">添加 Animation 组件</button>
    </template>

    <div v-else class="tips">请先在场景树或视口中选择一个实体。</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AnimationComponent, type AnimationStateClip, type AnimationStateTransition } from '../../engine/components/AnimationComponent'
import { getAnimationProgress, getAnimationTotalDuration } from '../../engine/animation/applyAnimation'
import { createAtlasFramePaths, deserializeAtlasAsset, serializeAtlasAsset } from '../../engine/animation/atlasAsset'
import { applyAnimationAssetToComponent, deserializeAnimationAsset, serializeAnimationAsset } from '../../engine/animation/animationAsset'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()

const entity = computed(() => sceneStore.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
const animation = computed(() => entity.value?.getComponent<AnimationComponent>('Animation') ?? null)
const currentIndex = computed(() => Math.max(0, Math.min(editor.timelineFrameIndex, Math.max(0, (animation.value?.framePaths.length ?? 1) - 1))))
const currentFramePath = computed(() => animation.value?.framePaths[currentIndex.value] ?? '')
const currentFrameDuration = computed(() => animation.value?.frameDurations[currentIndex.value] ?? 1)
const playheadProgress = computed(() => animation.value ? getAnimationProgress(animation.value) : 0)
const currentFrameEvents = computed(() => (animation.value?.frameEvents || []).filter((item) => item.frame === currentIndex.value))
const eventIndexes = computed(() => {
  if (!animation.value) return [] as number[]
  return animation.value.frameEvents
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.frame === currentIndex.value)
    .map(({ index }) => index)
})

const newStateName = ref('')
const selectedState = ref('')

const selectedClip = computed(() => {
  if (!animation.value || !selectedState.value) return null
  return animation.value.stateMachine.clips.find((clip) => clip.name === selectedState.value) || null
})

watch(
  () => animation.value?.stateMachine.clips,
  (clips) => {
    const safe = clips || []
    if (!safe.length) {
      selectedState.value = ''
      return
    }
    if (!selectedState.value || !safe.some((clip) => clip.name === selectedState.value)) {
      selectedState.value = safe[0].name
    }
  },
  { immediate: true, deep: true }
)

let previewTimer: number | null = null

function frameLabel(path: string) {
  if (path.startsWith('atlas://')) {
    const [base] = path.replace('atlas://', '').split('#')
    return `${base.split('/').pop() || base} · atlas`
  }
  return path.split('/').pop() || path
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
      { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6 }
    ]
  }
  if (!animation.value.stateMachine.initialState) {
    animation.value.stateMachine.initialState = animation.value.stateMachine.clips[0]?.name || 'Idle'
  }
}

function syncFrameDurations() {
  if (!animation.value) return
  const next = [...animation.value.frameDurations]
  while (next.length < animation.value.framePaths.length) next.push(1)
  animation.value.frameDurations = next.slice(0, animation.value.framePaths.length)
}

function normalizeClip(clip: AnimationStateClip) {
  const paths = clip.framePaths.map((path) => path.trim()).filter(Boolean)
  const durations = paths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1)))
  return { ...clip, framePaths: paths, frameDurations: durations }
}

function setStateMachineEnabled(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.enabled = (event.target as HTMLInputElement).checked
  if (animation.value.stateMachine.enabled) ensureAnimationStateMachineDefaults()
  sceneStore.markDirty()
}

function setInitialState(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.initialState = (event.target as HTMLSelectElement).value
  if (!animation.value.stateMachine.currentState) {
    animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  sceneStore.markDirty()
}

function addState() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const name = newStateName.value.trim()
  if (!name) return
  if (animation.value.stateMachine.clips.some((clip) => clip.name === name)) return
  animation.value.stateMachine.clips = [
    ...animation.value.stateMachine.clips,
    { name, framePaths: [], frameDurations: [], loop: true }
  ]
  selectedState.value = name
  newStateName.value = ''
  sceneStore.markDirty()
}

function selectState(name: string) {
  selectedState.value = name
}

function renameSelectedState(event: Event) {
  if (!animation.value || !selectedClip.value) return
  const nextName = (event.target as HTMLInputElement).value.trim()
  if (!nextName) return
  if (nextName !== selectedClip.value.name && animation.value.stateMachine.clips.some((clip) => clip.name === nextName)) return
  const oldName = selectedClip.value.name
  selectedClip.value.name = nextName
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((clip) => clip.name === oldName ? { ...selectedClip.value as AnimationStateClip } : clip)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((t) => ({
    ...t,
    from: t.from === oldName ? nextName : t.from,
    to: t.to === oldName ? nextName : t.to
  }))
  if (animation.value.stateMachine.initialState === oldName) animation.value.stateMachine.initialState = nextName
  if (animation.value.stateMachine.currentState === oldName) animation.value.stateMachine.currentState = nextName
  selectedState.value = nextName
  sceneStore.markDirty()
}

function setSelectedStateLoop(event: Event) {
  if (!animation.value || !selectedClip.value) return
  const next = { ...selectedClip.value, loop: (event.target as HTMLInputElement).checked }
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((clip) => clip.name === selectedClip.value?.name ? next : clip)
  sceneStore.markDirty()
}

function setSelectedStateFrames(event: Event) {
  if (!animation.value || !selectedClip.value) return
  const framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  const next = normalizeClip({ ...selectedClip.value, framePaths })
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((clip) => clip.name === selectedClip.value?.name ? next : clip)
  sceneStore.markDirty()
}

function setSelectedStateDurations(event: Event) {
  if (!animation.value || !selectedClip.value) return
  const values = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => Math.max(1, Number(line.trim() || 1)))
  const frameDurations = selectedClip.value.framePaths.map((_, index) => Math.max(1, Number(values[index] ?? 1)))
  const next = normalizeClip({ ...selectedClip.value, frameDurations })
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((clip) => clip.name === selectedClip.value?.name ? next : clip)
  sceneStore.markDirty()
}

function appendSelectedImageToState() {
  if (!animation.value || !selectedClip.value || assets.selectedAsset?.type !== 'image') return
  const next = normalizeClip({
    ...selectedClip.value,
    framePaths: [...selectedClip.value.framePaths, assets.selectedAsset.path],
    frameDurations: [...selectedClip.value.frameDurations, 1]
  })
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((clip) => clip.name === selectedClip.value?.name ? next : clip)
  sceneStore.markDirty()
}

function removeSelectedState() {
  if (!animation.value || !selectedClip.value) return
  if (animation.value.stateMachine.clips.length <= 1) return
  const name = selectedClip.value.name
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.filter((clip) => clip.name !== name)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((t) => t.from !== name && t.to !== name)
  if (animation.value.stateMachine.initialState === name) {
    animation.value.stateMachine.initialState = animation.value.stateMachine.clips[0]?.name || ''
  }
  if (animation.value.stateMachine.currentState === name) {
    animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  selectedState.value = animation.value.stateMachine.clips[0]?.name || ''
  sceneStore.markDirty()
}

function addTransition() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const fallback = animation.value.stateMachine.clips[0]?.name || 'Idle'
  animation.value.stateMachine.transitions = [
    ...animation.value.stateMachine.transitions,
    { from: fallback, to: fallback, condition: 'always' }
  ]
  sceneStore.markDirty()
}

function removeTransition(index: number) {
  if (!animation.value) return
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((_, i) => i !== index)
  sceneStore.markDirty()
}

function setTransitionFrom(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, from: value } : item)
  sceneStore.markDirty()
}

function setTransitionTo(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, to: value } : item)
  sceneStore.markDirty()
}

function setTransitionCondition(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value as AnimationStateTransition['condition']
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, condition: value } : item)
  sceneStore.markDirty()
}

function setTransitionAction(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).value.trim()
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, action: value || undefined } : item
  )
  sceneStore.markDirty()
}

function setTransitionPriority(index: number, event: Event) {
  if (!animation.value) return
  const value = Number((event.target as HTMLInputElement).value || 0)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, priority: Number.isFinite(value) ? value : 0 } : item
  )
  sceneStore.markDirty()
}

function setTransitionCanInterrupt(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, canInterrupt: value } : item
  )
  sceneStore.markDirty()
}

function setTransitionOnce(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, once: value } : item
  )
  sceneStore.markDirty()
}

function setTransitionMinNormalizedTime(index: number, event: Event) {
  if (!animation.value) return
  const raw = Number((event.target as HTMLInputElement).value || 0)
  const value = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0))
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, minNormalizedTime: value } : item
  )
  sceneStore.markDirty()
}

function addAnimationComponent() {
  if (!entity.value) return
  entity.value.addComponent(new AnimationComponent(true, true, 8, true, 0, 0, [], [], '', '', null, []))
  sceneStore.markDirty()
}

function appendSelectedImage() {
  if (!animation.value || assets.selectedAsset?.type !== 'image') return
  animation.value.framePaths = [...animation.value.framePaths, assets.selectedAsset.path]
  syncFrameDurations()
  editor.setTimelineFrameIndex(animation.value.framePaths.length - 1)
  sceneStore.markDirty()
}

async function bindSelectedAtlas() {
  if (!animation.value || assets.selectedAsset?.type !== 'atlas' || !window.unu?.readTextAsset) return
  const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath: assets.selectedAsset.path })
  if (!result) return
  const atlas = deserializeAtlasAsset(result.content)
  animation.value.sourceAtlasPath = assets.selectedAsset.path
  animation.value.atlasGrid = {
    columns: atlas.atlas.columns,
    rows: atlas.atlas.rows,
    cellWidth: atlas.atlas.cellWidth,
    cellHeight: atlas.atlas.cellHeight,
    frameCount: atlas.atlas.frameCount
  }
  animation.value.framePaths = createAtlasFramePaths(atlas.atlas)
  animation.value.frameDurations = animation.value.framePaths.map(() => 1)
  animation.value.currentFrame = 0
  animation.value.elapsed = 0
  editor.setTimelineFrameIndex(0)
  sceneStore.markDirty()
  project.setStatus(`已绑定图集动画：${assets.selectedAsset.name}`)
}

function removeCurrentFrame() {
  if (!animation.value || !animation.value.framePaths.length) return
  const index = currentIndex.value
  animation.value.framePaths = animation.value.framePaths.filter((_, i) => i !== index)
  animation.value.frameDurations = animation.value.frameDurations.filter((_, i) => i !== index)
  animation.value.frameEvents = animation.value.frameEvents
    .filter((item) => item.frame !== index)
    .map((item) => ({ ...item, frame: item.frame > index ? item.frame - 1 : item.frame }))
  animation.value.currentFrame = Math.min(animation.value.currentFrame, Math.max(0, animation.value.framePaths.length - 1))
  editor.setTimelineFrameIndex(Math.max(0, index - 1))
  sceneStore.markDirty()
}

function setFps(event: Event) {
  if (!animation.value) return
  animation.value.fps = Math.max(1, Number((event.target as HTMLInputElement).value || 1))
  sceneStore.markDirty()
}

function setLoop(event: Event) {
  if (!animation.value) return
  animation.value.loop = (event.target as HTMLInputElement).checked
  sceneStore.markDirty()
}

function setCurrentFramePath(event: Event) {
  if (!animation.value) return
  const next = [...animation.value.framePaths]
  next[currentIndex.value] = (event.target as HTMLInputElement).value
  animation.value.framePaths = next
  syncFrameDurations()
  sceneStore.markDirty()
}

function setCurrentFrameDuration(event: Event) {
  if (!animation.value) return
  const next = [...animation.value.frameDurations]
  next[currentIndex.value] = Math.max(1, Number((event.target as HTMLInputElement).value || 1))
  animation.value.frameDurations = next
  sceneStore.markDirty()
}

function addEventAtCurrentFrame() {
  if (!animation.value) return
  animation.value.frameEvents = [
    ...animation.value.frameEvents,
    { frame: currentIndex.value, name: `event_${currentIndex.value}`, payload: '' }
  ]
  sceneStore.markDirty()
}

function updateEventName(index: number, event: Event) {
  if (!animation.value) return
  const next = [...animation.value.frameEvents]
  next[index] = { ...next[index], name: (event.target as HTMLInputElement).value }
  animation.value.frameEvents = next
  sceneStore.markDirty()
}

function updateEventPayload(index: number, event: Event) {
  if (!animation.value) return
  const next = [...animation.value.frameEvents]
  next[index] = { ...next[index], payload: (event.target as HTMLInputElement).value }
  animation.value.frameEvents = next
  sceneStore.markDirty()
}

function removeEvent(index: number) {
  if (!animation.value) return
  animation.value.frameEvents = animation.value.frameEvents.filter((_, i) => i !== index)
  sceneStore.markDirty()
}

function scrubPlayhead(event: Event) {
  if (!animation.value) return
  const ratio = Number((event.target as HTMLInputElement).value || 0) / 1000
  const total = getAnimationTotalDuration(animation.value)
  const targetTime = total * ratio
  let acc = 0
  animation.value.currentFrame = 0
  animation.value.elapsed = 0
  for (let i = 0; i < animation.value.framePaths.length; i += 1) {
    const duration = (animation.value.frameDurations[i] ?? 1) / Math.max(1, animation.value.fps)
    if (acc + duration >= targetTime) {
      animation.value.currentFrame = i
      animation.value.elapsed = Math.max(0, targetTime - acc)
      editor.setTimelineFrameIndex(i)
      break
    }
    acc += duration
  }
  sceneStore.markDirty()
}

function stopPreviewLoop() {
  if (previewTimer) {
    window.clearInterval(previewTimer)
    previewTimer = null
  }
  editor.setTimelinePreviewPlaying(false)
}

function startPreviewLoop() {
  if (!animation.value) return
  stopPreviewLoop()
  editor.setTimelinePreviewPlaying(true)
  previewTimer = window.setInterval(() => {
    if (!animation.value || !animation.value.framePaths.length) return
    const duration = (animation.value.frameDurations[animation.value.currentFrame] ?? 1) / Math.max(1, animation.value.fps)
    animation.value.elapsed += 0.05
    if (animation.value.elapsed >= duration) {
      animation.value.elapsed = 0
      animation.value.currentFrame += 1
      if (animation.value.currentFrame >= animation.value.framePaths.length) {
        animation.value.currentFrame = animation.value.loop ? 0 : animation.value.framePaths.length - 1
        if (!animation.value.loop) stopPreviewLoop()
      }
      editor.setTimelineFrameIndex(animation.value.currentFrame)
    }
    editor.setTimelinePreviewClock(editor.timelinePreviewClock + 0.05)
    sceneStore.markDirty()
  }, 50)
}

function togglePreview() {
  if (editor.timelinePreviewPlaying) stopPreviewLoop()
  else startPreviewLoop()
}

async function saveAnimationAsset() {
  if (!animation.value || !entity.value) return
  if (!window.unu?.saveTextAsset || !project.rootPath || project.rootPath === 'sample-project') {
    project.setStatus('当前为示例工程，动画资源保存需在 Electron 本地工程模式下使用。')
    return
  }

  syncFrameDurations()
  const content = serializeAnimationAsset(entity.value.name, animation.value)
  const saved = await window.unu.saveTextAsset({
    content,
    projectRoot: project.rootPath,
    subdir: 'assets/animations',
    suggestedName: `${entity.value.name}.anim.json`,
    title: '保存动画资源',
    filterName: 'UNU Animation'
  })
  if (!saved) return
  animation.value.animationAssetPath = saved.relativePath || saved.name
  await assets.refreshProject()
  await assets.selectAsset(animation.value.animationAssetPath)
  editor.setRightTab('Timeline')
  project.setStatus(`动画资源已保存：${saved.name}`)
  sceneStore.markDirty()
}

async function openAnimationAsset() {
  if (!animation.value) return
  if (!window.unu?.openTextAsset || !project.rootPath || project.rootPath === 'sample-project') {
    project.setStatus('当前为示例工程，动画资源打开需在 Electron 本地工程模式下使用。')
    return
  }
  const result = await window.unu.openTextAsset({
    projectRoot: project.rootPath,
    defaultSubdir: 'assets/animations',
    title: '打开动画资源',
    extensions: ['json']
  })
  if (!result) return
  const data = deserializeAnimationAsset(result.content)
  applyAnimationAssetToComponent(animation.value, data, result.relativePath || result.name)
  editor.setTimelineFrameIndex(0)
  sceneStore.markDirty()
  await assets.refreshProject()
  if (result.relativePath) await assets.selectAsset(result.relativePath)
  project.setStatus(`已绑定动画资源：${result.name}`)
}

async function generateAtlasSliceAsset() {
  if (assets.selectedAsset?.type !== 'image') {
    project.setStatus('请先在素材箱中选择一张图集图片。')
    return
  }
  if (!window.unu?.saveTextAsset || !project.rootPath || project.rootPath === 'sample-project') {
    project.setStatus('当前为示例工程，图集切片资源保存需在 Electron 本地工程模式下使用。')
    return
  }

  const columns = Math.max(1, Number(window.prompt('图集列数 columns', '4') || 4))
  const rows = Math.max(1, Number(window.prompt('图集行数 rows', '4') || 4))
  const cellWidth = Math.max(1, Number(window.prompt('单帧宽度 cellWidth', '64') || 64))
  const cellHeight = Math.max(1, Number(window.prompt('单帧高度 cellHeight', '64') || 64))
  const frameCount = Math.max(1, Number(window.prompt('总帧数 frameCount', String(columns * rows)) || (columns * rows)))
  const content = serializeAtlasAsset({
    imagePath: assets.selectedAsset.path,
    columns,
    rows,
    cellWidth,
    cellHeight,
    frameCount
  })
  const baseName = frameLabel(assets.selectedAsset.name).replace(/\.[^.]+$/, '')
  const saved = await window.unu.saveTextAsset({
    content,
    projectRoot: project.rootPath,
    subdir: 'assets/animations',
    suggestedName: `${baseName}.atlas.json`,
    title: '保存图集切片描述',
    filterName: 'UNU Atlas'
  })
  if (!saved) return
  await assets.refreshProject()
  project.setStatus(`图集切片描述已生成：${saved.name}`)
}

watch(
  () => selection.selectedEntityId,
  () => stopPreviewLoop()
)

onBeforeUnmount(() => stopPreviewLoop())
</script>

<style scoped>
.timeline-panel { height: 100%; display: grid; grid-template-rows: auto auto auto auto auto auto auto 1fr auto; gap: 12px; }
.title-row { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.title { color: #dbe4ee; font-size: 14px; font-weight: 600; }
.subtitle { margin-top: 4px; color: #8ea0b8; font-size: 12px; }
.badge { font-size: 12px; color: #dbe4ee; background: #202838; padding: 4px 8px; border-radius: 999px; }
.toolbar-row { display: flex; gap: 8px; flex-wrap: wrap; }
.toolbar-row.compact { margin-top: 6px; }
button, .small { border: 1px solid #303848; background: #202632; color: #ecf0f7; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.danger { border-color: #5b2631; background: #3b1e27; }
.meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
label { display: grid; gap: 6px; font-size: 13px; color: #cfd8e3; }
input, select, textarea { background: #0f141d; color: #ecf0f7; border: 1px solid #313a4a; border-radius: 8px; padding: 8px; }
textarea { min-height: 90px; resize: vertical; }
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.playhead-block { display: grid; gap: 8px; }
.playhead-header { display: flex; justify-content: space-between; color: #aebbd0; font-size: 12px; }
.playhead-slider { padding: 0; }
.timeline-strip { display: flex; gap: 10px; overflow: auto; padding-bottom: 2px; }
.frame-card { min-width: 138px; text-align: left; display: grid; gap: 4px; background: #161c27; }
.frame-card.active { outline: 2px solid #56b6c2; }
.frame-card.playback { box-shadow: inset 0 0 0 1px #f2c94c; }
.frame-index { font-size: 12px; color: #8ea0b8; }
.frame-name { font-size: 13px; color: #ecf0f7; word-break: break-all; }
.frame-duration { font-size: 12px; color: #b0c0d4; }
.frame-editor, .event-track, .state-machine-block { display: grid; gap: 10px; background: #121824; border: 1px solid #253044; border-radius: 10px; padding: 10px; }
.group-title { color: #dbe4ee; font-weight: 600; font-size: 13px; }
.event-list, .transition-list { display: grid; gap: 10px; }
.event-card, .transition-item, .state-editor { display: grid; gap: 8px; background: #0f141d; border: 1px solid #2b3648; border-radius: 10px; padding: 10px; }
.tips { color: #8ea0b8; font-size: 12px; line-height: 1.6; }
.row-inline { display: flex; gap: 8px; align-items: center; }
.grow { flex: 1; min-width: 0; }
.state-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.state-chip-list { display: flex; gap: 8px; flex-wrap: wrap; }
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
.transition-block { display: grid; gap: 8px; }
.graph-board {
  border: 1px dashed #35506a;
  border-radius: 10px;
  padding: 10px;
  background: #111a25;
  display: grid;
  gap: 8px;
}
.graph-title { font-size: 12px; color: #8fb2d1; }
.graph-list { display: grid; gap: 6px; }
.graph-edge {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
}
.graph-node {
  border: 1px solid #3a536d;
  border-radius: 999px;
  padding: 2px 8px;
  color: #e6f1ff;
  background: #1b2a3c;
}
.graph-arrow { color: #83a8cb; }
.graph-cond { color: #a8bfd6; }
.graph-meta { color: #86a6c4; font-size: 11px; }
</style>
