import { Component } from '../core/Component'

export class TilemapComponent extends Component {
  readonly type = 'Tilemap'

  constructor(
    public enabled = true,
    public columns = 12,
    public rows = 8,
    public tileWidth = 48,
    public tileHeight = 48,
    public tiles: number[] = [],
    public collision: number[] = [],
    public showCollision = true,
    public tileTextureMap: Record<number, string> = {}
  ) {
    super()
    const size = Math.max(1, this.columns * this.rows)
    if (!this.tiles.length) this.tiles = new Array(size).fill(0)
    if (!this.collision.length) this.collision = new Array(size).fill(0)
  }
}
