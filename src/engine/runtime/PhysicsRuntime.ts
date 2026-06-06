import { PhysicsBodyComponent } from '../components/PhysicsBodyComponent'
import { TransformComponent } from '../components/TransformComponent'
import type { Scene } from '../core/Scene'
import type { ProjectPhysicsBackend } from '../../stores/project'

export type PhysicsBackendStatus = {
  backend: ProjectPhysicsBackend
  enabled: boolean
  adapter: 'none' | 'builtin'
}

const GRAVITY_Z = -980

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export class PhysicsRuntime {
  private backend: ProjectPhysicsBackend = 'none'

  setBackend(backend: ProjectPhysicsBackend) {
    this.backend = backend
  }

  getStatus(): PhysicsBackendStatus {
    return {
      backend: this.backend,
      enabled: this.backend !== 'none',
      adapter: this.backend === 'none' ? 'none' : 'builtin'
    }
  }

  step(scene: Scene | null, delta: number) {
    if (!scene || this.backend === 'none' || delta <= 0) return
    for (const entity of scene.entities) {
      const body = entity.getComponent<PhysicsBodyComponent>('PhysicsBody')
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (!body?.enabled || !transform || body.bodyType !== 'dynamic') continue

      const damping = Math.max(0, Math.min(1, finite(body.damping, 0.08)))
      const dampingFactor = Math.max(0, 1 - damping * delta)
      if (body.useGravity) body.velocityZ += GRAVITY_Z * delta

      transform.x += finite(body.velocityX) * delta
      transform.y += finite(body.velocityY) * delta
      transform.z += finite(body.velocityZ) * delta

      if (!body.lockedRotation) {
        transform.rotationX += finite(body.angularVelocityX) * delta
        transform.rotationY += finite(body.angularVelocityY) * delta
        transform.rotationZ += finite(body.angularVelocityZ) * delta
        transform.rotation = transform.rotationZ
      }

      body.velocityX *= dampingFactor
      body.velocityY *= dampingFactor
      body.velocityZ *= dampingFactor
      body.angularVelocityX *= dampingFactor
      body.angularVelocityY *= dampingFactor
      body.angularVelocityZ *= dampingFactor
    }
  }
}
