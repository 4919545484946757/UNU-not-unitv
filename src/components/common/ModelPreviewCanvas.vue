<template>
  <div ref="hostRef" class="model-preview-canvas">
    <div v-if="status" class="model-preview-status">{{ status }}</div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadGltfModel } from '../../engine/renderer/modelAssetLoader'

const props = defineProps<{
  modelPath: string
}>()

const hostRef = ref<HTMLDivElement | null>(null)
const status = ref('加载中')
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let model: THREE.Object3D | null = null
let frame = 0
let resizeObserver: ResizeObserver | null = null
let loadToken = 0

onMounted(() => {
  setupRenderer()
  void loadModel()
})

onBeforeUnmount(() => {
  loadToken += 1
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  clearModel()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  scene = null
  camera = null
})

watch(() => props.modelPath, () => void loadModel())

function setupRenderer() {
  const host = hostRef.value
  if (!host || renderer) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x232b3c)
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000)
  camera.position.set(0, -220, 140)
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2b3140, 1.1))
  const key = new THREE.DirectionalLight(0xffffff, 1.25)
  key.position.set(120, -180, 220)
  scene.add(key)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.domElement.className = 'model-preview-element'
  host.appendChild(renderer.domElement)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  resize()
  animate()
}

async function loadModel() {
  const token = ++loadToken
  setupRenderer()
  clearModel()
  status.value = '加载中'
  const loaded = await loadGltfModel(props.modelPath).catch((error) => {
    console.warn('[UNU][model-preview] failed to load model', props.modelPath, error)
    return null
  })
  if (token !== loadToken) return
  if (!loaded || !scene) {
    status.value = 'MODEL'
    return
  }
  model = loaded
  fitModel(model)
  scene.add(model)
  status.value = ''
}

function clearModel() {
  if (!model || !scene) return
  scene.remove(model)
  model.traverse((child) => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose?.()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material?.dispose?.()
  })
  model = null
}

function fitModel(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const largest = Math.max(size.x, size.y, size.z, 1)
  object.position.sub(center)
  object.scale.multiplyScalar(115 / largest)
  camera?.position.set(0, -240, 150)
  camera?.lookAt(0, 0, 0)
}

function resize() {
  if (!renderer || !camera || !hostRef.value) return
  const rect = hostRef.value.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function animate() {
  frame = requestAnimationFrame(animate)
  if (model) model.rotation.z += 0.008
  if (renderer && scene && camera) renderer.render(scene, camera)
}
</script>

<style scoped>
.model-preview-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

:deep(.model-preview-element) {
  display: block;
  width: 100%;
  height: 100%;
}

.model-preview-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #79c0ff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: #232b3c;
}
</style>
