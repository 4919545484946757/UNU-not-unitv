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
    id: 'action-2d',
    title: '2D Action Demo',
    description: 'Current demo: movement, shooting, enemy chase/respawn, scene switch, interaction, and animation state machine.',
    available: true,
    rootPath: 'Sample-project-list/sample-2D-shooting',
    manifestPath: 'Sample-project-list/sample-2D-shooting/manifest.json',
    projectFile: 'project.json',
    entryScene: 'MainScene.scene.json',
    tags: ['2d', 'action', 'shooting', 'animation', 'interaction']
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
  },
  {
    id: 'platformer-2d',
    title: '2D Platformer (Coming Soon)',
    description: 'Planned: jump feel, platform collision, traps, and collectible gameplay.',
    available: false
  },
  {
    id: 'rpg-topdown',
    title: 'Topdown RPG (Coming Soon)',
    description: 'Planned: quest flow, dialogue system, area transitions, and save/load.',
    available: false
  }
]

export const sampleProjectCatalog = fallbackSampleProjectCatalog
