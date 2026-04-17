import { sampleAssetRoots } from '../assets/sampleAssets'

export function createFallbackProject() {
  return {
    rootPath: 'sample-project',
    name: 'sample-project',
    tree: structuredClone(sampleAssetRoots)
  }
}
