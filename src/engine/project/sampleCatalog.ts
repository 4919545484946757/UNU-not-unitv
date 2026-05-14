export interface SampleProjectEntry {
  id: string
  title: string
  description: string
  available: boolean
  rootPath?: string
}

export const sampleProjectCatalog: SampleProjectEntry[] = [
  {
    id: 'action-2d',
    title: '2D Action Demo',
    description: 'Current demo: movement, shooting, enemy chase/respawn, scene switch, interaction, and animation state machine.',
    available: true,
    rootPath: 'Sample-project-list/sample-2D-shooting'
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'Classic grid snake with score, pause, restart, and project-local runtime scripts.',
    available: true,
    rootPath: 'Sample-project-list/Snake'
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
