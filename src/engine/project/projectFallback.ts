import { sampleAssetRoots } from '../assets/sampleAssets'

export function createFallbackProject(sampleProjectId = 'action-2d', sampleName = 'sample-project') {
  return {
    rootPath: 'sample-project',
    name: sampleName,
    sampleProjectId,
    tree: structuredClone(sampleAssetRoots)
  }
}
