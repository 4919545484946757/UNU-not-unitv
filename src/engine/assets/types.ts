export type AssetType = 'folder' | 'image' | 'audio' | 'script' | 'scene' | 'prefab' | 'animation' | 'atlas'

export interface AssetNode {
  id: string
  name: string
  type: AssetType
  path: string
  parentId?: string
  absolutePath?: string
  children?: AssetNode[]
}
