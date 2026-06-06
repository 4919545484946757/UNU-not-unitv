import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'

type PreparedModelAsset = {
  modelData: string | ArrayBuffer
  resourcePath: string
  manager: THREE.LoadingManager
  dispose: () => void
}

export type ModelHierarchyNode = {
  name: string
  path: string
  type: 'group' | 'mesh'
  children: ModelHierarchyNode[]
}

export type LoadedGltfModel = {
  scene: THREE.Object3D
  animations: THREE.AnimationClip[]
  animationClips: string[]
  hierarchy: ModelHierarchyNode[]
}

function normalizeAssetPath(path: string) {
  return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '').trim()
}

function dirname(path: string) {
  const normalized = normalizeAssetPath(path)
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(0, index) : ''
}

function basename(path: string) {
  return normalizeAssetPath(path).split('/').pop() || ''
}

function withoutQuery(path: string) {
  return String(path || '').split(/[?#]/)[0] || ''
}

function decodeUriValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isExternalUri(uri: string) {
  return /^(data:|blob:|https?:\/\/|file:\/\/)/i.test(uri)
}

function resolveRelativeAssetPath(baseDir: string, uri: string) {
  const cleanUri = decodeUriValue(withoutQuery(uri)).replace(/\\/g, '/')
  if (!cleanUri || isExternalUri(cleanUri)) return ''
  const parts = `${baseDir}/${cleanUri}`.split('/')
  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}

function assetPathCandidates(baseDir: string, uri: string) {
  const assets = useAssetStore()
  const rawClean = withoutQuery(uri).replace(/\\/g, '/')
  const decodedClean = decodeUriValue(rawClean).replace(/\\/g, '/')
  const rawName = basename(rawClean)
  const decodedName = basename(decodedClean)
  const candidates = [
    rawClean.startsWith('assets/') ? rawClean : '',
    decodedClean.startsWith('assets/') ? decodedClean : '',
    resolveRelativeAssetPath(baseDir, rawClean),
    resolveRelativeAssetPath(baseDir, decodedClean),
    rawName ? `assets/models/${rawName}` : '',
    decodedName ? `assets/models/${decodedName}` : ''
  ]
  const names = new Set([rawName.toLowerCase(), decodedName.toLowerCase()].filter(Boolean))
  for (const node of assets.flat || []) {
    if (node.type === 'folder') continue
    if (names.has(basename(node.path).toLowerCase())) candidates.push(node.path)
  }
  return [...new Set(candidates.map(normalizeAssetPath).filter(Boolean))]
}

function urlLookupVariants(url: string) {
  const raw = String(url || '')
  const decoded = decodeUriValue(raw)
  const pathname = (() => {
    try {
      return decodeUriValue(new URL(raw, window.location.href).pathname).replace(/^\/+/, '')
    } catch {
      return ''
    }
  })()
  const values = [raw, decoded, withoutQuery(raw), withoutQuery(decoded), normalizeAssetPath(raw), normalizeAssetPath(decoded), pathname, basename(raw), basename(decoded), basename(pathname)]
  return [...new Set(values.filter(Boolean))]
}

function dataUrlToText(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return ''
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  if (/;base64/i.test(header)) {
    return decodeURIComponent(Array.from(atob(body)).map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
  }
  return decodeURIComponent(body)
}

async function dataUrlToObjectUrl(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl)
  return URL.createObjectURL(blob)
}

function dataUrlToBlob(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return new Blob()
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  const mime = header.match(/^data:([^;,]+)/i)?.[1] || 'application/octet-stream'
  if (!/;base64/i.test(header)) return new Blob([decodeURIComponent(body)], { type: mime })
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

function dataUrlToArrayBuffer(dataUrl: string) {
  return dataUrlToBlob(dataUrl).arrayBuffer()
}

export async function readProjectAssetDataUrl(relativePath: string) {
  const project = useProjectStore()
  const normalized = normalizeAssetPath(relativePath)
  if (!normalized) return ''
  if (window.unu?.readAssetDataUrl && project.rootPath && !project.isMemoryProject) {
    const result = await window.unu.readAssetDataUrl({ projectRoot: project.rootPath, relativePath: normalized })
    return result?.dataUrl || ''
  }
  return ''
}

export async function prepareModelAsset(modelPath: string): Promise<PreparedModelAsset | null> {
  const normalizedModelPath = normalizeAssetPath(modelPath)
  if (!normalizedModelPath) return null
  const modelDataUrl = await readProjectAssetDataUrl(normalizedModelPath)
  if (!modelDataUrl) return null

  const manager = new THREE.LoadingManager()
  const objectUrls: string[] = []
  const urlMap = new Map<string, string>()
  const baseDir = dirname(normalizedModelPath)
  let modelData: string | ArrayBuffer = /\.glb$/i.test(normalizedModelPath) ? await dataUrlToArrayBuffer(modelDataUrl) : dataUrlToText(modelDataUrl)

  if (/\.gltf$/i.test(normalizedModelPath)) {
    try {
      const json = JSON.parse(String(modelData)) as {
        buffers?: Array<{ uri?: string }>
        images?: Array<{ uri?: string }>
      }
      const uris = new Set<string>()
      for (const buffer of json.buffers || []) if (buffer.uri && !isExternalUri(buffer.uri)) uris.add(buffer.uri)
      for (const image of json.images || []) if (image.uri && !isExternalUri(image.uri)) uris.add(image.uri)

      const resolvedUris = new Map<string, string>()
      const missingUris: string[] = []
      for (const uri of uris) {
        const candidates = assetPathCandidates(baseDir, uri)
        let assetPath = ''
        let dependencyDataUrl = ''
        for (const candidate of candidates) {
          dependencyDataUrl = await readProjectAssetDataUrl(candidate)
          if (dependencyDataUrl) {
            assetPath = candidate
            break
          }
        }
        if (!dependencyDataUrl) {
          missingUris.push(uri)
          continue
        }
        const objectUrl = await dataUrlToObjectUrl(dependencyDataUrl)
        objectUrls.push(objectUrl)
        resolvedUris.set(uri, dependencyDataUrl)
        const keys = [
          uri,
          decodeUriValue(uri),
          withoutQuery(uri),
          withoutQuery(decodeUriValue(uri)),
          assetPath,
          `/${assetPath}`,
          basename(assetPath),
          ...candidates
        ]
        for (const key of keys) {
          if (key) urlMap.set(key, objectUrl)
        }
      }
      for (const buffer of json.buffers || []) {
        if (buffer.uri && resolvedUris.has(buffer.uri)) buffer.uri = resolvedUris.get(buffer.uri)
      }
      for (const image of json.images || []) {
        if (image.uri && resolvedUris.has(image.uri)) image.uri = resolvedUris.get(image.uri)
      }
      if (missingUris.length) {
        console.warn('[UNU][model] missing glTF dependencies', normalizedModelPath, missingUris)
      }
      modelData = JSON.stringify(json)
    } catch (error) {
      console.warn('[UNU][model] failed to prepare glTF dependencies', normalizedModelPath, error)
    }
  }

  manager.setURLModifier((url) => {
    for (const key of urlLookupVariants(url)) {
      const mapped = urlMap.get(key) || urlMap.get(normalizeAssetPath(key))
      if (mapped) return mapped
    }
    return url
  })

  return {
    modelData,
    resourcePath: '',
    manager,
    dispose: () => {
      for (const url of objectUrls) URL.revokeObjectURL(url)
    }
  }
}

export async function loadGltfModel(modelPath: string) {
  const result = await loadGltfModelWithHierarchy(modelPath)
  return result?.scene || null
}

export async function loadGltfModelWithHierarchy(modelPath: string) {
  const prepared = await prepareModelAsset(modelPath)
  if (!prepared) return null
  try {
    const loader = new GLTFLoader(prepared.manager)
    const gltf = await loader.parseAsync(prepared.modelData, prepared.resourcePath)
    const scene = gltf.scene || null
    return scene ? {
      scene,
      animations: gltf.animations || [],
      animationClips: (gltf.animations || []).map((clip) => clip.name).filter(Boolean),
      hierarchy: buildModelHierarchy(scene)
    } satisfies LoadedGltfModel : null
  } finally {
    prepared.dispose()
  }
}

function buildModelHierarchy(root: THREE.Object3D): ModelHierarchyNode[] {
  const visit = (object: THREE.Object3D, parentPath: string, index: number): ModelHierarchyNode => {
    const name = object.name || `${(object as THREE.Mesh).isMesh ? 'Mesh' : 'Node'}_${index + 1}`
    const path = parentPath ? `${parentPath}/${index}:${name}` : `${index}:${name}`
    object.userData.modelNodePath = path
    return {
      name,
      path,
      type: (object as THREE.Mesh).isMesh ? 'mesh' : 'group',
      children: object.children.map((child, childIndex) => visit(child, path, childIndex))
    }
  }
  return root.children.map((child, index) => visit(child, '', index))
}

export async function loadThreeTexture(texturePath: string, options: { normalMap?: boolean } = {}) {
  const dataUrl = await readProjectAssetDataUrl(texturePath)
  if (!dataUrl) return null
  const loader = new THREE.TextureLoader()
  const texture = await loader.loadAsync(dataUrl)
  texture.colorSpace = options.normalMap ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}
