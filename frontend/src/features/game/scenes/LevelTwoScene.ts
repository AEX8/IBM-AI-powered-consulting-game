import Phaser from 'phaser'
import { LevelOneEffects } from '../effects/LevelOneEffects'
import {
  createOutreachLaptopFlow,
  type OutreachEmailSubmission,
} from '../dialogue/OutreachLaptopFlow'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 720
const WALKABLE_TOP = 390
const WALKABLE_BOTTOM = 704
const PLAYER_SPEED = 220
const LEVEL_ONE_COMPLETION_KEY = 'ibm-level-one-completed'
const LEVEL_ONE_MET_CLIENTS_KEY = 'ibm-level-one-met-clients'

type MetClient = {
  name: string
  personaId?: string
  texture: string
}

const CURRENT_LEVEL_ONE_CLIENTS: MetClient[] = [
  { name: 'Jordan Lee', personaId: 'test-level-1', texture: 'good-client' },
  { name: 'Morgan Blake', texture: 'bad-client' },
]

/**
 * Level 2 starts with the office and laptop selection flow only.
 * The browser and email screens shown later in the wireframes belong to later cards,
 * so this scene deliberately stops after a client has been selected.
 */
export class LevelTwoScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private chair!: Phaser.GameObjects.Image
  private plant!: Phaser.GameObjects.Image
  private effects!: LevelOneEffects
  private interfaceCamera!: Phaser.Cameras.Scene2D.Camera
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
  private interactionKey!: Phaser.Input.Keyboard.Key
  private interactionPrompt!: Phaser.GameObjects.Container
  private obstacleZones: Phaser.GameObjects.Zone[] = []
  private laptopOverlay?: Phaser.GameObjects.Container
  private laptopFlow?: Phaser.GameObjects.DOMElement
  private menuPanel?: Phaser.GameObjects.Container
  private notebookPanel?: Phaser.GameObjects.Container
  private notebookInput?: Phaser.GameObjects.DOMElement
  private deskSequenceActive = false
  private lastFootstepAt = 0
  private notes = ''

  constructor() {
    super('LevelTwoScene')
  }

  preload(): void {
    this.load.image('level-two-player', '/assets/characters/npcs/character-03.png')
    this.load.image('level-two-player-back', '/assets/game/level-2/player-facing-desk.png')
    this.load.image('good-client', '/assets/characters/npcs/character-01.png')
    this.load.image('bad-client', '/assets/characters/npcs/character-02.png')
    this.load.image('client-three', '/assets/characters/npcs/character-04.png')
    this.load.image('level-two-desk', '/assets/game/level-2/furniture/level-two-desk.png')
    this.load.image('level-two-chair', '/assets/game/level-2/furniture/level-two-chair.png')
    this.load.image('level-two-couch', '/assets/game/level-2/furniture/level-two-couch.png')
    this.load.image('level-two-plant', '/assets/game/level-2/furniture/level-two-plant.png')
  }

  create(): void {
    this.physics.world.setBounds(0, WALKABLE_TOP, WORLD_WIDTH, WALKABLE_BOTTOM - WALKABLE_TOP)
    this.cameras.main.setBackgroundColor('#efe1c7')
    this.effects = new LevelOneEffects(this)

    this.createOffice()
    this.createPlayer()
    this.createCollisions()
    this.configureKeyboard()

    this.effects.addCharacterShadow(this.player, 86)
    this.effects.addPlantSway(this.plant)
    this.effects.addWindowAmbience(270, 1170, 170)
    this.createAmbientMotion()

    // Everything created so far belongs to the physical room. A second camera
    // renders interface objects so menus stay fixed while the room camera zooms.
    const worldObjects = [...this.children.list]
    this.createNavigationButtons()
    this.interactionPrompt = this.createInteractionPrompt()
    this.createInterfaceCamera(worldObjects)

    this.cameras.main.fadeIn(450, 44, 44, 42)
  }

  override update(): void {
    if (!this.player) return

    if (this.laptopOverlay || this.menuPanel || this.notebookPanel || this.deskSequenceActive) {
      this.player.setVelocity(0)
      this.interactionPrompt.setVisible(false)
      this.effects.updateWalking(this.player, false, this.time.now)
      return
    }

    this.updateMovement()
    this.updateDeskInteraction()
  }

  private configureKeyboard(): void {
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard controls are unavailable.')
    }

    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
    }) as typeof this.wasd
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    keyboard.on('keydown-ESC', () => {
      if (this.laptopOverlay) this.closeLaptopOverlay()
    })
  }

  private createOffice(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xefe1c7)

    this.createWindows()
    this.createElevator()
    this.createDesk()
    this.createChair()
    this.createCouch()
    this.createPlant()

    const walls = this.add.graphics().setDepth(20)
    walls.lineStyle(10, 0x2c2c2a)
    walls.strokeRect(5, 5, WORLD_WIDTH - 10, WORLD_HEIGHT - 10)

    // Collision zones follow the part of each object that touches the floor.
    // This allows the player sprite to overlap furniture visually without walking through it.
    this.addObstacle(290, 478, 290, 58)

    // The chair needs its own generous footprint. Its sprite is much taller than
    // the visible feet, so a tiny feet-only collider made it possible to cross the seat.
    this.addObstacle(290, 570, 178, 112)
    this.addObstacle(1135, 455, 345, 64)
    this.addObstacle(900, 465, 78, 62)
  }

  private createInterfaceCamera(worldObjects: Phaser.GameObjects.GameObject[]): void {
    this.interfaceCamera = this.cameras.add(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      false,
      'LevelTwoInterfaceCamera'
    )
    this.interfaceCamera.setBackgroundColor('rgba(0, 0, 0, 0)')
    this.interfaceCamera.ignore(worldObjects)

    // Objects made after the world snapshot are interface elements, so the
    // cinematic room camera must not render a second, zoomed copy of them.
    const interfaceObjects = this.children.list.filter((object) => !worldObjects.includes(object))
    this.cameras.main.ignore(interfaceObjects)
  }

  private createWindows(): void {
    const windows = this.add.graphics().setDepth(1)

    windows.fillStyle(0xc7e5f3)
    windows.fillRect(8, 8, WORLD_WIDTH - 16, 330)
    windows.lineStyle(6, 0x2c2c2a)
    windows.strokeRect(8, 8, WORLD_WIDTH - 16, 330)

    for (const x of [270, 540, 900, 1170]) {
      windows.lineBetween(x, 8, x, 338)
    }

    windows.lineBetween(8, 174, WORLD_WIDTH - 8, 174)

    // A restrained skyline gives the windows depth without competing with the playable floor.
    const skyline = this.add.graphics().setDepth(1.4)
    const buildings = [
      { x: 30, width: 95, height: 70 },
      { x: 145, width: 125, height: 105 },
      { x: 1240, width: 75, height: 88 },
      { x: 1325, width: 92, height: 125 },
    ]

    skyline.fillStyle(0x7da8bc, 0.42)
    for (const building of buildings) {
      skyline.fillRect(building.x, 338 - building.height, building.width, building.height)
    }

    // Clouds travel at different speeds to create inexpensive 2D parallax.
    // They remain behind the window bars and make the office feel connected to a living world.
    for (let index = 0; index < 4; index += 1) {
      const cloud = this.add.container(-180 - index * 280, 70 + (index % 2) * 92).setDepth(1.2)
      cloud.add([
        this.add.ellipse(-34, 8, 80, 34, 0xffffff, 0.42),
        this.add.ellipse(12, 0, 105, 48, 0xffffff, 0.48),
        this.add.ellipse(66, 10, 72, 31, 0xffffff, 0.4),
      ])

      this.tweens.add({
        targets: cloud,
        x: WORLD_WIDTH + 220,
        duration: 18_000 + index * 3300,
        delay: index * 2400,
        repeat: -1,
        ease: 'Linear',
      })
    }

    this.add.rectangle(WORLD_WIDTH / 2, 345, WORLD_WIDTH - 16, 16, 0x956127).setDepth(2)
  }

  private createElevator(): void {
    const centreX = WORLD_WIDTH / 2
    const elevator = this.add.graphics().setDepth(3)

    elevator.fillStyle(0x2c2c2a)
    elevator.fillRoundedRect(centreX - 146, 68, 292, 302, 8)
    elevator.fillStyle(0x969b9f)
    elevator.fillRect(centreX - 137, 77, 132, 284)
    elevator.fillRect(centreX + 5, 77, 132, 284)
    elevator.lineStyle(4, 0x2c2c2a)
    elevator.lineBetween(centreX, 77, centreX, 361)

    this.add.circle(centreX - 17, 225, 7, 0x2c2c2a).setDepth(4)
    this.add.circle(centreX + 17, 225, 7, 0x2c2c2a).setDepth(4)

    // These doors are an office storage cupboard, not an elevator. Level 2 therefore
    // deliberately has no floor number or elevator-style indicator above it.
  }

  private createDesk(): void {
    // The desk is kept compact and moved nearer to the chair so the workstation reads
    // as one usable setup rather than an oversized table floating behind the player.
    this.add.ellipse(290, 490, 292, 24, 0x2c2c2a, 0.14).setDepth(370)
    this.add.image(290, 400, 'level-two-desk').setDisplaySize(325, 217).setDepth(382)

    // The pulse sits behind the transparent desk sprite and reads as laptop-screen light.
    const laptopGlow = this.add.rectangle(290, 352, 94, 52, 0xbde9ff, 0.16).setDepth(381)
    this.tweens.add({
      targets: laptopGlow,
      alpha: { from: 0.12, to: 0.42 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.createDeskObjectiveBeacon()
  }

  private createDeskObjectiveBeacon(): void {
    const beacon = this.add.container(290, 278).setDepth(430)
    const ring = this.add.circle(0, 0, 27, 0xffd65a, 0.14).setStrokeStyle(4, 0xc98a3e, 0.9)
    const icon = this.add
      .text(0, -1, '!', {
        color: '#1f4f78',
        fontFamily: 'Arial',
        fontSize: '28px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const objective = this.add
      .text(0, -47, 'USE THE OUTREACH LAPTOP', {
        color: '#ffffff',
        backgroundColor: '#1f4f78',
        fontFamily: 'Arial',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5)

    beacon.add([ring, icon, objective])
    this.tweens.add({
      targets: beacon,
      y: 290,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.tweens.add({
      targets: ring,
      scale: { from: 0.82, to: 1.18 },
      alpha: { from: 0.95, to: 0.35 },
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createChair(): void {
    // The chair is separate from the desk so it can sit in front exactly as shown in the wireframe.
    this.add.ellipse(290, 636, 185, 28, 0x2c2c2a, 0.15).setDepth(520)
    this.chair = this.add.image(290, 555, 'level-two-chair').setDisplaySize(220, 264).setDepth(548)
  }

  private createCouch(): void {
    this.add.ellipse(1135, 480, 350, 30, 0x2c2c2a, 0.14).setDepth(380)
    this.add.image(1135, 390, 'level-two-couch').setDisplaySize(390, 195).setDepth(390)
  }

  private createPlant(): void {
    this.add.ellipse(900, 476, 78, 19, 0x2c2c2a, 0.13).setDepth(395)
    this.plant = this.add.image(900, 405, 'level-two-plant').setDisplaySize(120, 125).setDepth(405)
  }

  private createNavigationButtons(): void {
    const homeButton = this.add
      .container(44, WORLD_HEIGHT - 45)
      .setScrollFactor(0)
      .setDepth(5000)
    const homeHitArea = this.add
      .circle(0, 0, 31, 0x5b8c4a)
      .setStrokeStyle(3, 0x2c2c2a)
      .setInteractive({ useHandCursor: true })
    const house = this.add.graphics()

    house.lineStyle(4, 0x1d2b1a)
    house.strokeTriangle(-15, -3, 0, -17, 15, -3)
    house.strokeRect(-12, -3, 24, 21)
    house.strokeRect(-4, 7, 8, 11)
    homeButton.add([homeHitArea, house])

    const notebookButton = this.add
      .container(112, WORLD_HEIGHT - 45)
      .setScrollFactor(0)
      .setDepth(5000)
    const notebookHitArea = this.add
      .circle(0, 0, 31, 0x2c2c2a)
      .setStrokeStyle(3, 0x000000)
      .setInteractive({ useHandCursor: true })
    const paper = this.add.rectangle(0, 0, 24, 31, 0xf7fafc).setStrokeStyle(2, 0x2c2c2a)
    const lines = this.add.graphics()

    lines.lineStyle(1, 0x777777)
    for (let y = -10; y <= 10; y += 5) lines.lineBetween(-8, y, 8, y)
    notebookButton.add([notebookHitArea, paper, lines])

    this.effects.addButtonHover(homeHitArea)
    this.effects.addButtonHover(notebookHitArea)

    homeHitArea.on('pointerdown', () => {
      this.effects.pressButton(homeHitArea)
      this.openHomeMenu()
    })

    notebookHitArea.on('pointerdown', () => {
      this.effects.pressButton(notebookHitArea)
      this.openNotebook()
    })
  }

  private createPlayer(): void {
    this.player = this.physics.add
      .image(WORLD_WIDTH / 2, 610, 'level-two-player')
      .setDisplaySize(205, 295)
      .setCollideWorldBounds(true)
      .setDepth(610)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(this.player.width * 0.42, this.player.height * 0.2)
    body.setOffset(this.player.width * 0.29, this.player.height * 0.76)
  }

  private addObstacle(x: number, y: number, width: number, height: number): void {
    const obstacle = this.add.zone(x, y, width, height)
    this.physics.add.existing(obstacle, true)
    this.obstacleZones.push(obstacle)
  }

  private createCollisions(): void {
    for (const obstacle of this.obstacleZones) {
      this.physics.add.collider(this.player, obstacle)
    }
  }

  private createInteractionPrompt(): Phaser.GameObjects.Container {
    const prompt = this.add.container(290, 650).setDepth(4500).setVisible(false)
    const background = this.add.rectangle(0, 0, 238, 54, 0xf4f7f9, 0.96).setStrokeStyle(4, 0x2c2c2a)
    const label = this.add
      .text(0, 0, 'Press E to use laptop', {
        color: '#2c2c2a',
        fontFamily: 'Arial',
        fontSize: '19px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    prompt.add([background, label])

    this.tweens.add({
      targets: prompt,
      y: 640,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    return prompt
  }

  private updateMovement(): void {
    let velocityX = 0
    let velocityY = 0

    if (this.cursors.left.isDown || this.wasd.left.isDown) velocityX -= 1
    if (this.cursors.right.isDown || this.wasd.right.isDown) velocityX += 1
    if (this.cursors.up.isDown || this.wasd.up.isDown) velocityY -= 1
    if (this.cursors.down.isDown || this.wasd.down.isDown) velocityY += 1

    const direction = new Phaser.Math.Vector2(velocityX, velocityY)
    if (direction.lengthSq() > 0) direction.normalize().scale(PLAYER_SPEED)

    this.player.setVelocity(direction.x, direction.y)
    this.player.setFlipX(direction.x < 0)
    this.player.setDepth(this.player.y)
    this.effects.updateWalking(this.player, direction.lengthSq() > 0, this.time.now)

    if (direction.lengthSq() > 0 && this.time.now - this.lastFootstepAt >= 180) {
      this.createFootstepParticle()
      this.lastFootstepAt = this.time.now
    }
  }

  private createFootstepParticle(): void {
    const footstep = this.add
      .ellipse(
        this.player.x,
        this.player.y + this.player.displayHeight * 0.43,
        22,
        8,
        0x956127,
        0.22
      )
      .setDepth(this.player.y - 3)

    this.tweens.add({
      targets: footstep,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.35,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => footstep.destroy(),
    })
  }

  private createInteractionBurst(x: number, y: number): void {
    // A radial burst marks the moment control hands over from free movement to
    // the desk cutscene. Alternating blue and gold ties it into the game's palette.
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12
      const spark = this.add
        .circle(x, y, index % 2 === 0 ? 5 : 3, index % 2 === 0 ? 0xffd65a : 0x84b4cf, 0.9)
        .setDepth(6200)

      this.interfaceCamera.ignore(spark)
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 78,
        y: y + Math.sin(angle) * 38,
        scale: 0.25,
        alpha: 0,
        duration: 460,
        ease: 'Sine.easeOut',
        onComplete: () => spark.destroy(),
      })
    }
  }

  private updateDeskInteraction(): void {
    // This is intentionally a narrow rectangle directly below the chair. A circular
    // radius allowed E to activate from the desk sides and did not feel intentional.
    const canUseLaptop =
      this.player.x >= 190 && this.player.x <= 390 && this.player.y >= 520 && this.player.y <= 675

    this.interactionPrompt.setVisible(canUseLaptop)

    if (canUseLaptop && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.beginDeskSequence()
    }
  }

  private beginDeskSequence(): void {
    if (this.deskSequenceActive) return

    this.deskSequenceActive = true
    this.player.setVelocity(0)
    this.interactionPrompt.setVisible(false)

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.enable = false

    // Walk around the outside edge first. A direct tween to the seat visually passed
    // through the chair, so this waypoint makes the route clearly travel around it.
    const approachX = this.player.x <= this.chair.x ? this.chair.x - 145 : this.chair.x + 145
    this.tweens.add({
      targets: this.player,
      x: approachX,
      y: 570,
      duration: 360,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // The second leg crosses into the space between the chair and desk. Only once
        // she arrives do we use the rear-facing sprite, so she visibly faces the laptop.
        this.tweens.add({
          targets: this.player,
          x: this.chair.x,
          y: 485,
          duration: 380,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.player
              .setTexture('level-two-player-back')
              .setDisplaySize(185, 267)
              .setFlipX(false)
              .setDepth(535)
            this.createInteractionBurst(this.player.x, this.player.y + 90)

            // The chair slides under the seated character after she has walked around it.
            this.tweens.add({
              targets: this.chair,
              y: 525,
              duration: 320,
              ease: 'Back.easeOut',
            })
          },
        })
      },
    })

    // A short camera wind-up followed by the push-in makes the interaction feel
    // deliberate instead of opening a menu the instant a keyboard key is pressed.
    this.cameras.main.shake(90, 0.0025)
    this.time.delayedCall(180, () => {
      this.cameras.main.pan(320, 420, 720, 'Sine.easeInOut')
      this.cameras.main.zoomTo(1.62, 720, 'Sine.easeInOut')
    })

    const focusFlash = this.add
      .circle(290, 352, 34, 0xc7e5f3, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(390)
    this.interfaceCamera.ignore(focusFlash)

    this.tweens.add({
      targets: focusFlash,
      scale: 3.4,
      alpha: 0,
      duration: 620,
      ease: 'Sine.easeOut',
      onComplete: () => focusFlash.destroy(),
    })

    this.time.delayedCall(940, () => this.openLaptopOverlay())
  }

  private openLaptopOverlay(): void {
    if (this.laptopOverlay) return

    // Only the room dimmer remains a Phaser canvas object. The complete laptop and
    // task panel are rendered once by OutreachLaptopFlow, avoiding the duplicated
    // canvas-and-DOM interface that previously appeared behind the wireframe UI.
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(7000)
    const dimmer = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x17212a,
      0.72
    )
    overlay.add(dimmer)

    const clients = this.readMetClients()

    // The DOM layer recreates wireframe pages 2-10 while the Phaser objects above
    // retain the physical laptop frame and boot animation. It exposes one clean
    // submission boundary for Ibrahim's later grading and lunch-break card.
    const outreachFlow = createOutreachLaptopFlow(this, {
      clients,
      onClose: () => this.closeLaptopOverlay(),
      onEmailSent: (submission) => this.handleOutreachEmailSent(submission),
    })
    this.laptopFlow = outreachFlow
    this.cameras.main.ignore(outreachFlow)

    // Do not make the dimmer interactive. The laptop interface is a DOM element
    // layered above Phaser's canvas, and browser clicks can also reach the canvas
    // beneath it. Previously, selecting a client therefore triggered this dimmer
    // handler and immediately closed the workstation. The explicit × button is the
    // only exit control, so every laptop interaction remains inside the seated view.

    this.laptopOverlay = overlay
    this.cameras.main.ignore(overlay)
    overlay.setAlpha(0).setScale(0.96)
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
    })
  }

  
    private async handleOutreachEmailSent(
  submission: OutreachEmailSubmission
): Promise<void> {
  window.dispatchEvent(
    new CustomEvent<OutreachEmailSubmission>('level-two-email-submitted', {
      detail: submission,
    })
  )

  this.showToast(`Email sent to ${submission.client.name}`)

  this.closeLaptopOverlay()
  const lunchOverlay = this.showLunchBreakOverlay()

  try {
    const response = await fetch('/api/outreach/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${submission.subject}\n\n${submission.body}`,
        persona: {
          name: submission.client.name,
          personaId: submission.client.personaId ?? null,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Grading request failed')
    }

    const result = (await response.json()) as {
      success?: boolean
      score?: number
      feedback?: string
    }

    if (
      result.success !== true ||
      typeof result.score !== 'number' ||
      typeof result.feedback !== 'string'
    ) {
      throw new Error('Invalid grading response')
    }

    lunchOverlay.destroy(true)

    this.showOutreachResult(result.score, result.feedback)
  } catch (error) {
    console.error('Level 2 outreach grading failed:', error)

    lunchOverlay.destroy(true)
    this.showToast('Unable to grade the email. Please try again.')
    this.openLaptopOverlay()
  }
}
  private showLunchBreakOverlay(): Phaser.GameObjects.Container {
  const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(8000)

  const background = this.add.rectangle(
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    0xead4b2,
    1
  )

  const title = this.add
    .text(WORLD_WIDTH / 2, 150, 'Lunch Break', {
      fontFamily: 'Arial',
      fontSize: '42px',
      color: '#1f1f1f',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)

  const clock = this.add
    .circle(WORLD_WIDTH / 2, 350, 120, 0xf4f7f9)
    .setStrokeStyle(14, 0x2c2c2a)

  const hourHand = this.add
    .rectangle(WORLD_WIDTH / 2, 345, 8, 90, 0x1f1f1f)
    .setOrigin(0.5, 1)

  const minuteHand = this.add
    .rectangle(WORLD_WIDTH / 2, 350, 85, 8, 0x1f1f1f)
    .setOrigin(0, 0.5)

  const progressBg = this.add
    .rectangle(WORLD_WIDTH / 2, 570, 340, 34, 0xd9d9d9)
    .setStrokeStyle(3, 0x1f1f1f)

  const progress = this.add
    .rectangle(WORLD_WIDTH / 2 - 167, 570, 0, 30, 0x6f9e57)
    .setOrigin(0, 0.5)

  overlay.add([
    background,
    title,
    clock,
    hourHand,
    minuteHand,
    progressBg,
    progress,
  ])

 
  this.cameras.main.ignore(overlay)

  this.tweens.add({
    targets: progress,
    width: 334,
    duration: 1800,
    ease: 'Linear',
  })

  return overlay
}



private showOutreachResult(score: number, feedback: string): void {
  const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(8000)

  const background = this.add.rectangle(
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    0xcfe8f5,
    1
  )

  const panel = this.add
    .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 560, 430, 0xffffff)
    .setStrokeStyle(4, 0x1f1f1f)

  const scoreText = this.add
    .text(WORLD_WIDTH / 2, 190, `${score}/6`, {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#111111',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)

  const feedbackText = this.add
    .text(WORLD_WIDTH / 2, 330, feedback, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#222222',
      align: 'center',
      wordWrap: { width: 470 },
    })
    .setOrigin(0.5)

  const passed = score >= 5

  const resultText = this.add
    .text(
      WORLD_WIDTH / 2,
      465,
      passed
        ? 'Congratulations, you have completed Level 2 successfully!'
        : 'Your outreach email needs improvement.',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#1f1f1f',
        align: 'center',
        fontStyle: 'bold',
      }
    )
    .setOrigin(0.5)

  const button = this.add
    .text(
      WORLD_WIDTH / 2,
      570,
      passed ? 'Back to the lobby' : 'Try again',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#5b8c4a',
        padding: { x: 32, y: 14 },
      }
    )
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })

  button.on('pointerdown', () => {
    overlay.destroy(true)

    if (passed) {
      window.location.href = '/dashboard'
      return
    }

    this.openLaptopOverlay()
  })

  overlay.add([
    background,
    panel,
    scoreText,
    feedbackText,
    resultText,
    button,
  ])

  this.cameras.main.ignore(overlay)
}


  private readMetClients(): MetClient[] {
    const storedClients = window.localStorage.getItem(LEVEL_ONE_MET_CLIENTS_KEY)

    if (storedClients) {
      try {
        const parsed = JSON.parse(storedClients) as unknown

        if (Array.isArray(parsed)) {
          const validClients = parsed.filter(this.isMetClient)
          if (validClients.length > 0) return validClients
        }
      } catch {
        // A damaged browser value should not make the Level 2 laptop unusable.
      }
    }

    // Older saves only recorded that Level 1 was complete. In that case the player
    // necessarily met both current clients, so provide those two without forcing a replay.
    if (window.localStorage.getItem(LEVEL_ONE_COMPLETION_KEY) === 'true') {
      return CURRENT_LEVEL_ONE_CLIENTS
    }

    return []
  }

  private isMetClient(value: unknown): value is MetClient {
    if (!value || typeof value !== 'object') return false

    const candidate = value as Partial<MetClient>
    return typeof candidate.name === 'string' && typeof candidate.texture === 'string'
  }

  private closeLaptopOverlay(): void {
    const overlay = this.laptopOverlay
    if (!overlay) return

    this.laptopOverlay = undefined

    // Phaser DOM elements must stay on the scene display list instead of becoming
    // Container children. Destroy the separately owned element alongside its canvas
    // frame so no invisible HTML remains after closing the laptop.
    this.laptopFlow?.destroy()
    this.laptopFlow = undefined

    this.tweens.add({
      targets: overlay,
      alpha: 0,
      scale: 0.96,
      duration: 150,
      onComplete: () => overlay.destroy(true),
    })

    this.cameras.main.pan(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 480, 'Sine.easeInOut')
    this.cameras.main.zoomTo(1, 480, 'Sine.easeInOut')
    this.tweens.add({
      targets: this.chair,
      y: 555,
      duration: 420,
      ease: 'Sine.easeInOut',
    })

    this.time.delayedCall(500, () => {
      this.player
        .setTexture('level-two-player')
        .setDisplaySize(205, 295)
        .setPosition(290, 640)
        .setDepth(640)

      const playerBody = this.player.body as Phaser.Physics.Arcade.Body
      playerBody.enable = true
      playerBody.updateFromGameObject()
      this.deskSequenceActive = false
    })
  }

  private createAmbientMotion(): void {
    // Slow translucent particles keep the large floor from feeling static while
    // remaining subtle enough that the desk prompt is always the visual priority.
    for (let index = 0; index < 16; index += 1) {
      const mote = this.add
        .circle(
          Phaser.Math.Between(30, WORLD_WIDTH - 30),
          Phaser.Math.Between(WALKABLE_TOP, WALKABLE_BOTTOM),
          Phaser.Math.Between(1, 3),
          0xffffff,
          Phaser.Math.FloatBetween(0.12, 0.3)
        )
        .setDepth(25)

      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-35, 35),
        y: mote.y - Phaser.Math.Between(35, 85),
        alpha: 0,
        duration: Phaser.Math.Between(2600, 4600),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
        onRepeat: () => {
          mote.setPosition(
            Phaser.Math.Between(30, WORLD_WIDTH - 30),
            Phaser.Math.Between(WALKABLE_TOP + 30, WALKABLE_BOTTOM)
          )
          mote.setAlpha(Phaser.Math.FloatBetween(0.12, 0.3))
        },
      })
    }

    const officeLabel = this.add
      .text(WORLD_WIDTH - 28, 28, 'LEVEL 2  •  OUTREACH OFFICE', {
        color: '#1f4f78',
        backgroundColor: 'rgba(244, 247, 249, 0.82)',
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: 'bold',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(1, 0)
      .setDepth(30)

    this.tweens.add({
      targets: officeLabel,
      alpha: { from: 0.78, to: 1 },
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private openHomeMenu(): void {
    if (this.menuPanel || this.deskSequenceActive) return

    const menu = this.add.container(0, 0).setScrollFactor(0).setDepth(7000)
    const dimmer = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0xefe1c7, 0.76)
      .setOrigin(0)
      .setInteractive()
    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 720, 220, 0xf3f6f8)
      .setStrokeStyle(4, 0x111111)
    const topStrip = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 98, 720, 18, 0xb98900)
      .setStrokeStyle(3, 0x111111)
    const resume = this.createMenuButton(
      WORLD_WIDTH / 2 - 215,
      WORLD_HEIGHT / 2 + 15,
      'Resume',
      () => {
        menu.destroy(true)
        this.menuPanel = undefined
      }
    )
    const restart = this.createMenuButton(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 15, 'Restart', () => {
      window.location.reload()
    })
    const quit = this.createMenuButton(WORLD_WIDTH / 2 + 215, WORLD_HEIGHT / 2 + 15, 'Quit', () => {
      window.location.assign('/dashboard')
    })

    menu.add([dimmer, panel, topStrip, resume, restart, quit])
    this.cameras.main.ignore(menu)
    this.menuPanel = menu
  }

  private createMenuButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const background = this.add
      .rectangle(0, 0, 160, 50, 0x5b8c4a)
      .setStrokeStyle(3, 0x111111)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(0, 0, label, {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '21px',
      })
      .setOrigin(0.5)

    this.effects.addButtonHover(background)
    background.on('pointerdown', () => {
      this.effects.pressButton(background)
      onClick()
    })
    container.add([background, text])

    return container
  }

  private openNotebook(): void {
    if (this.notebookPanel || this.deskSequenceActive) return

    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(7200)
    const dimmer = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0xefe1c7, 0.82)
      .setOrigin(0)
      .setInteractive()
    const notebookWidth = 460
    const notebookHeight = 625
    const notebookX = WORLD_WIDTH / 2
    const notebookY = WORLD_HEIGHT / 2
    const notebookBody = this.add
      .rectangle(notebookX, notebookY, notebookWidth, notebookHeight, 0xf4f7f9)
      .setStrokeStyle(5, 0x111111)
    const header = this.add
      .rectangle(notebookX, 94, notebookWidth, 105, 0xb98900)
      .setStrokeStyle(5, 0x111111)
    const iconCircle = this.add.circle(notebookX, 94, 42, 0x2c2c2a).setStrokeStyle(4, 0x000000)
    const iconPaper = this.add
      .rectangle(notebookX, 94, 27, 38, 0xf4f7f9)
      .setStrokeStyle(2, 0x111111)
    const iconLines = this.add.graphics()

    iconLines.lineStyle(1, 0x555555)
    for (let y = 82; y <= 106; y += 5) {
      iconLines.lineBetween(notebookX - 9, y, notebookX + 9, y)
    }

    const input = this.add
      .dom(notebookX, notebookY + 62)
      .createFromHTML(
        `<textarea name="levelTwoNotes" maxlength="1000" aria-label="Level 2 consultant notes" style="width:365px;height:430px;resize:none;border:0;padding:4px 8px;background-color:#f4f7f9;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 34px,#222 35px,#222 37px);color:#2c2c2a;font-family:Arial,sans-serif;font-size:17px;line-height:37px;outline:none;overflow-y:auto;"></textarea>`
      )
      .setScrollFactor(0)
      .setDepth(7300)
    const textarea = input.getChildByName('levelTwoNotes') as HTMLTextAreaElement | null
    if (textarea) textarea.value = this.notes

    const saveX = notebookX + notebookWidth / 2 - 25
    const saveY = notebookY + notebookHeight / 2 + 28
    const saveButton = this.add
      .circle(saveX, saveY, 25, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({ useHandCursor: true })
    const saveTriangle = this.add.graphics()

    saveTriangle.fillStyle(0x2c2c2a)
    saveTriangle.fillTriangle(saveX - 7, saveY - 11, saveX - 7, saveY + 11, saveX + 11, saveY)

    const saveNotebook = () => {
      if (textarea) this.notes = textarea.value
      input.destroy()
      panel.destroy(true)
      this.notebookPanel = undefined
      this.notebookInput = undefined
    }

    this.effects.addButtonHover(saveButton)
    saveButton.on('pointerdown', () => {
      this.effects.pressButton(saveButton)
      this.effects.playSaveSparkles(saveX, saveY, saveNotebook)
    })

    panel.add([
      dimmer,
      notebookBody,
      header,
      iconCircle,
      iconPaper,
      iconLines,
      saveButton,
      saveTriangle,
    ])
    this.cameras.main.ignore([panel, input])
    this.notebookPanel = panel
    this.notebookInput = input
    this.effects.animateNotebook(panel)
  }

  private showToast(message: string): void {
    const toast = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 58, message, {
        color: '#ffffff',
        backgroundColor: '#1f4f78',
        fontFamily: 'Arial',
        fontSize: '18px',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6500)
    this.cameras.main.ignore(toast)

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 18,
      delay: 1500,
      duration: 350,
      onComplete: () => toast.destroy(),
    })
  }
}
