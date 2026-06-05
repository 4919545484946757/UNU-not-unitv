export interface SampleProjectEntry {
  id: string
  title: string
  description: string
  available: boolean
  rootPath?: string
  manifestPath?: string
  projectFile?: string
  entryScene?: string
  tags?: string[]
}

export const fallbackSampleProjectCatalog: SampleProjectEntry[] = [
  {
    id: 'sample-2D-shooting',
    title: 'sample-2D-shooting',
    description: '2D shooting sample from Sample-project-list: movement, shooting, inventory, container UI, scene switching, and project-local scripts.',
    available: true,
    rootPath: 'Sample-project-list/sample-2D-shooting',
    manifestPath: 'Sample-project-list/sample-2D-shooting/manifest.json',
    projectFile: 'project.json',
    entryScene: 'MainScene.scene.json',
    tags: ['2d', 'action', 'shooting', 'animation', 'interaction']
  },
  {
    id: '2D-shooting-canvas',
    title: '2D Shooting Canvas',
    description: 'Canvas 2D port of sample-2D-shooting: movement, shooting, inventory, container UI, scene switching, and project-local scripts.',
    available: true,
    rootPath: 'Sample-project-list/2D-shooting-canvas',
    manifestPath: 'Sample-project-list/2D-shooting-canvas/manifest.json',
    projectFile: 'project.json',
    entryScene: 'MainScene.scene.json',
    tags: ['2d', 'action', 'shooting', 'animation', 'interaction', 'canvas2d']
  },
  {
    id: 'snake',
    title: 'Snake Demo',
    description: 'Playable Snake sample: grid movement, food, score, pause, restart, and editable project-local gameplay scripts.',
    available: true,
    rootPath: 'Sample-project-list/snake',
    manifestPath: 'Sample-project-list/snake/manifest.json',
    projectFile: 'project.json',
    entryScene: 'Snake.scene.json',
    tags: ['2d', 'arcade', 'snake', 'ui', 'input']
  }
]

export const sampleProjectCatalog = fallbackSampleProjectCatalog
