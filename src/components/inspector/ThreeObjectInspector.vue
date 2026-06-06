<template>
  <div class="three-object-inspector">
    <label>
      Mesh Type
      <select :value="kind" @change="$emit('set-kind', $event)">
        <option value="box">Box</option>
        <option value="plane">Plane</option>
        <option value="model">Model</option>
        <option value="directionalLight">Directional Light</option>
        <option value="pointLight">Point Light</option>
        <option value="spotLight">Spot Light</option>
        <option value="ambientLight">Ambient Light</option>
        <option value="environmentLight">Environment Map Light</option>
        <option value="worldEnvironment">World Environment Sphere</option>
      </select>
    </label>

    <template v-if="!isLight && kind !== 'environmentLight' && kind !== 'worldEnvironment'">
      <div class="subgroup">
        <div class="group-title">3D Geometry</div>
        <label>Base Width <input type="number" min="1" step="1" :value="sizeNumber('width', 96)" @input="$emit('set-size', 'width', $event)" /></label>
        <label>Base Height <input type="number" min="1" step="1" :value="sizeNumber('height', 96)" @input="$emit('set-size', 'height', $event)" /></label>
        <label>Depth <input type="number" min="0.1" step="1" :value="numberValue('depth', 80)" @input="$emit('set-number', 'depth', $event)" /></label>
      </div>
    </template>

    <label>Material Metalness <input type="number" min="0" max="1" step="0.01" :value="numberValue('metalness', 0.02)" @input="$emit('set-number', 'metalness', $event, 0, 1)" /></label>
    <label>Material Roughness <input type="number" min="0" max="1" step="0.01" :value="numberValue('roughness', 0.65)" @input="$emit('set-number', 'roughness', $event, 0, 1)" /></label>
    <label>Material Opacity <input type="number" min="0" max="1" step="0.01" :value="numberValue('opacity', spriteAlpha)" @input="$emit('set-number', 'opacity', $event, 0, 1)" /></label>

    <div class="color-field">
      <label>
        Material Color
        <input type="color" :value="colorInput" @input="$emit('set-color', $event)" />
      </label>
      <input :value="colorValue" placeholder="#fff / rgba(255,255,255,.8) / hsl(0 0% 100%)" @input="$emit('set-color', $event)" />
    </div>

    <label v-if="isLight">Light Intensity <input type="number" min="0" step="0.1" :value="numberValue('intensity', 1.3)" @input="$emit('set-number', 'intensity', $event, 0)" /></label>
    <template v-if="kind === 'pointLight' || kind === 'spotLight'">
      <label>Light Distance <input type="number" min="0" step="10" :value="numberValue('distance', kind === 'spotLight' ? 1400 : 1200)" @input="$emit('set-number', 'distance', $event, 0)" /></label>
      <label>Light Decay <input type="number" min="0" step="0.1" :value="numberValue('decay', 2)" @input="$emit('set-number', 'decay', $event, 0)" /></label>
    </template>
    <template v-if="kind === 'directionalLight' || kind === 'spotLight'">
      <label>Target X <input type="number" step="1" :value="numberValue('targetX', 0)" @input="$emit('set-number', 'targetX', $event)" /></label>
      <label>Target Y <input type="number" step="1" :value="numberValue('targetY', 0)" @input="$emit('set-number', 'targetY', $event)" /></label>
      <label>Target Z <input type="number" step="1" :value="numberValue('targetZ', 0)" @input="$emit('set-number', 'targetZ', $event)" /></label>
    </template>
    <template v-if="kind === 'spotLight'">
      <label>Spot Angle (rad) <input type="number" min="0.01" max="1.5708" step="0.01" :value="numberValue('angle', 0.5236)" @input="$emit('set-number', 'angle', $event, 0.01, 1.5708)" /></label>
      <label>Spot Penumbra <input type="number" min="0" max="1" step="0.01" :value="numberValue('penumbra', 0.28)" @input="$emit('set-number', 'penumbra', $event, 0, 1)" /></label>
    </template>

    <template v-if="kind === 'environmentLight' || kind === 'worldEnvironment'">
      <label>Environment Map Path <input :value="textValue('environmentMapPath')" placeholder="assets/images/hdri/studio.exr" @input="$emit('set-text', 'environmentMapPath', $event)" /></label>
      <div class="asset-picker">
        <button class="small" :disabled="!selectedImageAssetPath || runtimePlaying" @click="$emit('bind-texture', 'environmentMapPath')">Bind Selected Env Map</button>
        <span>{{ selectedImageAssetPath || 'Select an equirectangular image or EXR in Assets' }}</span>
      </div>
      <label>Environment Intensity <input type="number" min="0" step="0.1" :value="numberValue('environmentIntensity', 1)" @input="$emit('set-number', 'environmentIntensity', $event, 0)" /></label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="boolValue('showAsBackground', false)" @change="$emit('set-bool', 'showAsBackground', $event)" />
        Use Environment Map As Scene Background
      </label>
    </template>

    <template v-if="kind === 'worldEnvironment'">
      <label>World Sphere Texture <input :value="textValue('worldTexturePath') || textValue('texturePath')" placeholder="assets/images/sky/panorama.jpg" @input="$emit('set-text', 'worldTexturePath', $event)" /></label>
      <div class="asset-picker">
        <button class="small" :disabled="!selectedImageAssetPath || runtimePlaying" @click="$emit('bind-texture', 'worldTexturePath')">Bind Selected Sky Texture</button>
        <span>{{ selectedImageAssetPath || 'Select panorama image or EXR in Assets' }}</span>
      </div>
      <label>Sky Radius <input type="number" min="10" step="100" :value="numberValue('skyRadius', 4000)" @input="$emit('set-number', 'skyRadius', $event, 10)" /></label>
      <div class="subgroup">
        <div class="group-title">Sky Transform</div>
        <label>Yaw (deg) <input type="number" step="1" :value="numberValue('skyYaw', 0)" @input="$emit('set-number', 'skyYaw', $event)" /></label>
        <label>Pitch (deg) <input type="number" step="1" :value="numberValue('skyPitch', 0)" @input="$emit('set-number', 'skyPitch', $event)" /></label>
        <label>Roll (deg) <input type="number" step="1" :value="numberValue('skyRoll', 0)" @input="$emit('set-number', 'skyRoll', $event)" /></label>
      </div>
      <div class="subgroup">
        <div class="group-title">Sky Material</div>
        <label>Brightness <input type="number" min="0" step="0.1" :value="numberValue('skyBrightness', 1)" @input="$emit('set-number', 'skyBrightness', $event, 0)" /></label>
        <label>Opacity <input type="number" min="0" max="1" step="0.01" :value="numberValue('skyOpacity', 1)" @input="$emit('set-number', 'skyOpacity', $event, 0, 1)" /></label>
        <label>Texture Offset X <input type="number" step="0.01" :value="numberValue('skyTextureOffsetX', 0)" @input="$emit('set-number', 'skyTextureOffsetX', $event)" /></label>
        <label>Texture Offset Y <input type="number" step="0.01" :value="numberValue('skyTextureOffsetY', 0)" @input="$emit('set-number', 'skyTextureOffsetY', $event)" /></label>
        <label>Texture Repeat X <input type="number" step="0.1" :value="numberValue('skyTextureRepeatX', 1)" @input="$emit('set-number', 'skyTextureRepeatX', $event)" /></label>
        <label>Texture Repeat Y <input type="number" step="0.1" :value="numberValue('skyTextureRepeatY', 1)" @input="$emit('set-number', 'skyTextureRepeatY', $event)" /></label>
      </div>
    </template>

    <label>
      Model Path
      <input :value="textValue('modelPath')" placeholder="assets/models/example.glb" @input="$emit('set-text', 'modelPath', $event)" />
    </label>
    <div class="asset-picker">
      <button class="small" :disabled="!selectedModelAssetPath || runtimePlaying" @click="$emit('bind-model')">Bind Selected Model</button>
      <span>{{ selectedModelAssetPath || 'Select .glb/.gltf/.obj in Assets' }}</span>
    </div>

    <div v-if="textValue('modelPath')" class="subgroup">
      <div class="group-title">Model Animation</div>
      <label class="checkbox-row">
        <input type="checkbox" :checked="boolValue('modelAnimationEnabled', true)" @change="$emit('set-bool', 'modelAnimationEnabled', $event)" />
        Enable glTF Animation
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="boolValue('modelAnimationLoop', true)" @change="$emit('set-bool', 'modelAnimationLoop', $event)" />
        Loop
      </label>
      <label>Speed <input type="number" min="0" step="0.1" :value="numberValue('modelAnimationSpeed', 1)" @input="$emit('set-number', 'modelAnimationSpeed', $event, 0)" /></label>
      <label>
        Current State
        <input :value="textValue('modelAnimationState') || textValue('modelAnimationInitialState')" placeholder="Idle / Run / ClipName" @input="$emit('set-text', 'modelAnimationState', $event)" />
      </label>
      <label>
        Initial State
        <input :value="textValue('modelAnimationInitialState')" placeholder="ClipName" @input="$emit('set-text', 'modelAnimationInitialState', $event)" />
      </label>
      <label>
        Bind State To Clip
        <select :value="boundClipForCurrentModelState" @change="$emit('set-animation-binding', $event)">
          <option value="">Auto / same as state</option>
          <option v-for="clip in modelAnimationClips" :key="clip" :value="clip">{{ clip }}</option>
        </select>
      </label>
      <div class="asset-picker">
        <button class="small" :disabled="runtimePlaying" @click="$emit('refresh-clips')">Refresh Clips</button>
        <span>{{ modelAnimationClips.length ? modelAnimationClips.join(', ') : 'No glTF clips detected' }}</span>
      </div>
    </div>

    <label>
      Texture Path
      <input :value="textValue('texturePath')" placeholder="assets/images/albedo.png" @input="$emit('set-text', 'texturePath', $event)" />
    </label>
    <div class="asset-picker">
      <button class="small" :disabled="!selectedImageAssetPath || runtimePlaying" @click="$emit('bind-texture', 'texturePath')">Bind Selected Texture</button>
      <span>{{ selectedImageAssetPath || 'Select image in Assets' }}</span>
    </div>
    <label>
      Normal Map Path
      <input :value="textValue('normalMapPath')" placeholder="assets/images/normal.png" @input="$emit('set-text', 'normalMapPath', $event)" />
    </label>
    <div class="asset-picker">
      <button class="small" :disabled="!selectedImageAssetPath || runtimePlaying" @click="$emit('bind-texture', 'normalMapPath')">Bind Selected Normal</button>
      <span>{{ selectedImageAssetPath || 'Select image in Assets' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: Record<string, unknown>
  kind: string
  isLight: boolean
  spriteAlpha: number
  spriteWidth: number
  spriteHeight: number
  selectedModelAssetPath: string
  selectedImageAssetPath: string
  runtimePlaying: boolean
  colorInput: string
  colorValue: string
  modelAnimationClips: string[]
  boundClipForCurrentModelState: string
}>()

defineEmits<{
  'set-kind': [event: Event]
  'set-text': [key: string, event: Event]
  'set-number': [key: string, event: Event, min?: number, max?: number]
  'set-size': [key: 'width' | 'height', event: Event]
  'set-bool': [key: string, event: Event]
  'set-color': [event: Event]
  'bind-model': []
  'refresh-clips': []
  'set-animation-binding': [event: Event]
  'bind-texture': [key: 'texturePath' | 'normalMapPath' | 'environmentMapPath' | 'worldTexturePath']
}>()

function textValue(key: string) {
  const value = props.data?.[key]
  return typeof value === 'string' ? value : ''
}

function numberValue(key: string, fallback: number) {
  const value = Number(props.data?.[key])
  return Number.isFinite(value) ? value : fallback
}

function sizeNumber(key: 'width' | 'height', fallback: number) {
  const spriteValue = key === 'width' ? props.spriteWidth : props.spriteHeight
  if (Number.isFinite(spriteValue) && spriteValue > 0) return spriteValue
  const dataValue = Number(props.data?.[key])
  return Number.isFinite(dataValue) && dataValue > 0 ? dataValue : fallback
}

function boolValue(key: string, fallback: boolean) {
  const value = props.data?.[key]
  return typeof value === 'boolean' ? value : fallback
}
</script>

<style scoped>
.three-object-inspector {
  display: grid;
  gap: 8px;
  min-width: 0;
  width: 100%;
}
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
input:not([type='checkbox']), select, textarea {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.subgroup { border: 1px solid #2b3344; border-radius: 8px; padding: 8px; display: grid; gap: 8px; background: #161d2a; min-width: 0; width: 100%; box-sizing: border-box; }
.asset-picker {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.asset-picker span {
  color: #8ea0b8;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.color-field {
  display: grid;
  grid-template-columns: minmax(120px, 0.7fr) minmax(0, 1fr);
  gap: 8px;
  align-items: end;
  min-width: 0;
}
button, .small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}
@media (max-width: 560px) {
  .asset-picker,
  .color-field {
    grid-template-columns: 1fr;
  }
}
</style>
