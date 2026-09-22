import type { LevelOneEffects } from '../effects/LevelOneEffects'

// How close counts as "arrived", in pixels.
const ARRIVAL_DISTANCE = 6

// Safety net: if something (an obstacle, a collider) stops the player from
// ever reaching the target, give up instead of leaving them stuck walking
// on the spot forever. No pathfinding here — straight-line movement only,
// which is enough for these simple room layouts.
const MAX_TRAVEL_MS = 8000

export type ClickToMoveOptions = {
  scene: Phaser.Scene
  player: Phaser.Physics.Arcade.Image
  effects: LevelOneEffects
  speed: number
  worldWidth: number
  worldHeight: number
}

/**
 * Replaces keyboard movement with click/tap-to-walk. One instance per scene.
 * Phaser treats a tap and a mouse click as the same "pointer" event, so this
 * works on an iPad with no extra code.
 */
export class ClickToMoveController {
  private readonly scene: Phaser.Scene
  private readonly player: Phaser.Physics.Arcade.Image
  private readonly effects: LevelOneEffects
  private readonly speed: number
  private readonly worldWidth: number
  private readonly worldHeight: number

  private target: Phaser.Math.Vector2 | null = null
  private onArrive: (() => void) | null = null
  private travelStartedAt = 0

  constructor(options: ClickToMoveOptions) {
    this.scene = options.scene
    this.player = options.player
    this.effects = options.effects
    this.speed = options.speed
    this.worldWidth = options.worldWidth
    this.worldHeight = options.worldHeight
  }

  /** Walks the player to a point in the world (a tap on open ground). */
  moveTo(x: number, y: number): void {
    this.setTarget(x, y, null)
  }

  /**
   * Walks the player to a point near a target object — offset by
   * `standOffset` so they stop beside it rather than on top of it — then
   * calls `onArrive` once, the moment they get there.
   */
  moveToObject(
    target: { x: number; y: number },
    standOffset: number,
    onArrive: () => void
  ): void {
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)

    this.setTarget(
      target.x - Math.cos(angle) * standOffset,
      target.y - Math.sin(angle) * standOffset,
      onArrive
    )
  }

  /** Stops the player where they are and cancels any pending arrival. */
  stop(): void {
    this.target = null
    this.onArrive = null
    this.player.setVelocity(0)
  }

  /** Call once per frame in place of the old key-based updateMovement(). */
  update(time: number): void {
    if (!this.target) {
      this.effects.updateWalking(this.player, false, time)
      return
    }

    if (time - this.travelStartedAt > MAX_TRAVEL_MS) {
      this.stop()
      this.effects.updateWalking(this.player, false, time)
      return
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.target.x,
      this.target.y
    )

    if (distance <= ARRIVAL_DISTANCE) {
      const callback = this.onArrive
      this.target = null
      this.onArrive = null

      this.player.setVelocity(0)
      this.effects.updateWalking(this.player, false, time)

      callback?.()
      return
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body
    this.scene.physics.velocityFromRotation(
      Phaser.Math.Angle.Between(this.player.x, this.player.y, this.target.x, this.target.y),
      this.speed,
      body.velocity
    )

    this.effects.updateWalking(this.player, true, time)
  }

  private setTarget(x: number, y: number, onArrive: (() => void) | null): void {
    this.target = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 0, this.worldWidth),
      Phaser.Math.Clamp(y, 0, this.worldHeight)
    )
    this.onArrive = onArrive
    this.travelStartedAt = this.scene.time.now
  }
}