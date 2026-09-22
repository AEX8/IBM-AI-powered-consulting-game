import Phaser from 'phaser'
import { openMeetingOverlay, type MeetingOverlayHandle } from '@/features/meeting/MeetingOverlay'
import type { MeetingPrepContext } from '@/features/meeting/prompts'
import { SELECTED_OUTREACH_CLIENT_KEY } from '../dialogue/OutreachLaptopFlow'
import { LevelOneEffects } from '../effects/LevelOneEffects'
import { ClickToMoveController } from '../movement/ClickToMoveController'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 720
const WALKABLE_TOP = 365
const PLAYER_SPEED = 220
const LEVEL_THREE_PREPARATION_KEY = 'ibm-level-three-preparation'
// Demo build: clicking the client, desk or chair always walks the player to this
// exact spot on open floor below the furniture, then beginMeetingSequence() takes
// over with its own short seat-approach animation from wherever they end up.
const MEETING_STAND_POINT = { x: 720, y: 660 }
// Generous on purpose: a player approaching from certain angles gets stopped by
// the desk or chair's collider a little short of the exact point above.
const MEETING_ARRIVAL_DISTANCE = 60

type MeetingClient = {
  name: string
  personaId: string
  company: string
  texture: string
  portrait: string
  opening: string
}

type SavedPrep = {
  personaId: string
  objectives: string[]
  questions: string[]
}

const CLIENTS: Record<'david' | 'sarah', MeetingClient> = {
  david: {
    name: 'David Palte',
    personaId: 'test-level-2',
    company: 'Meridian Retail Group',
    texture: 'level-four-david',
    portrait: 'character-02.png',
    opening:
      'Thanks for meeting with me. I am interested to hear how you would approach our fragmented customer data.',
  },
  sarah: {
    name: 'Sarah Chen',
    personaId: 'test-level-1',
    company: 'ACMD Manufacturing',
    texture: 'level-four-sarah',
    portrait: 'character-01.png',
    opening:
      'Thanks for making the time. I would like to understand how your approach could improve our operational visibility.',
  },
}

/**
 * Playable Level 4 client-meeting room. The scene owns the room and the walk to the
 * desk; the conversation itself lives in features/meeting/MeetingOverlay.
 */
export class LevelFourScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private chair!: Phaser.GameObjects.Image
  private interfaceCamera!: Phaser.Cameras.Scene2D.Camera
  private client!: MeetingClient
  private effects!: LevelOneEffects
  private clickToMove!: ClickToMoveController
  private meetingOverlay?: MeetingOverlayHandle
  private notebookOverlay?: Phaser.GameObjects.DOMElement
  private obstacles: Phaser.GameObjects.Zone[] = []
  private playerShadow!: Phaser.GameObjects.Ellipse
  private lastFootstepAt = 0
  private meetingSequenceActive = false
  private savedPrep?: SavedPrep

  constructor() {
    super('LevelFourScene')
  }

  preload(): void {
    this.client = this.resolveClient()
    this.load.image('level-four-player', '/assets/characters/npcs/character-03.png')
    this.load.image('level-four-player-back', '/assets/game/level-2/player-facing-desk.png')
    this.load.image('level-four-selected-client', `/assets/characters/npcs/${this.client.portrait}`)
    this.load.image(
      'level-four-painting',
      '/assets/game/level-4/furniture/level-four-garden-painting.png'
    )
    this.load.image(
      'level-four-bookshelf',
      '/assets/game/level-4/furniture/level-four-bookshelf.png'
    )
    this.load.image('level-four-window', '/assets/game/level-4/furniture/level-four-window.png')
    this.load.image('level-four-desk', '/assets/game/level-4/furniture/level-four-meeting-desk.png')
    this.load.image(
      'level-four-chair',
      '/assets/game/level-4/furniture/level-four-meeting-chair.png'
    )
    this.load.image('level-four-plant', '/assets/game/level-4/furniture/level-four-floor-plant.png')
  }

  create(): void {
    this.savedPrep = this.readSavedPrep()
    this.effects = new LevelOneEffects(this)
    this.physics.world.setBounds(0, WALKABLE_TOP, WORLD_WIDTH, WORLD_HEIGHT - WALKABLE_TOP)
    this.createTilemapRoom()
    this.createFurniture()
    this.createPlayer()
    this.createCollisions()
    this.configureClickToMove()
    const worldObjects = [...this.children.list]
    this.createNavigationButtons()
    this.createInterfaceCamera(worldObjects)
    this.cameras.main.fadeIn(500, 44, 44, 42)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.meetingOverlay?.destroy())
  }

  override update(): void {
    if (!this.player) return

    if (this.meetingOverlay || this.notebookOverlay || this.meetingSequenceActive) {
      this.clickToMove.stop()
      return
    }

    this.updateMovement()
    // Keep the floor shadow under the enlarged playable character's feet.
    this.playerShadow.setPosition(this.player.x, this.player.y + 134)
  }

  /**
   * Level 3 stores the exact objectives and questions the player reviewed. They are
   * only used if they were prepared for the client being met now.
   */
  private readSavedPrep(): SavedPrep | undefined {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(LEVEL_THREE_PREPARATION_KEY) ?? 'null'
      ) as Partial<Record<'personaId' | 'objectives' | 'questions', unknown>> | null

      if (!saved || typeof saved.personaId !== 'string') return undefined

      const toList = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string').slice(0, 3)
          : []

      return {
        personaId: saved.personaId,
        objectives: toList(saved.objectives),
        questions: toList(saved.questions),
      }
    } catch {
      // Damaged browser data must never stop the room from loading.
      return undefined
    }
  }

  private currentPrep(): MeetingPrepContext | undefined {
    const prep = this.savedPrep

    if (!prep || prep.personaId !== this.client.personaId) return undefined

    return { objectives: prep.objectives, questions: prep.questions }
  }

  /** Resolve the Level 2 selection, while retaining query-string previews for QA. */
  private resolveClient(): MeetingClient {
    const requested = new URLSearchParams(window.location.search).get('client')?.toLowerCase()
    if (requested === 'sarah') return CLIENTS.sarah
    if (requested === 'david') return CLIENTS.david

    try {
      const stored = window.localStorage.getItem(SELECTED_OUTREACH_CLIENT_KEY)
      if (stored) {
        const selection = JSON.parse(stored) as Partial<{ name: string; portrait: string }>
        if (selection.name && selection.portrait) {
          const knownClient = Object.values(CLIENTS).find(
            (client) => client.name === selection.name
          )
          return (
            knownClient ?? {
              name: selection.name,
              personaId: '',
              company: 'Client organisation',
              texture: 'level-four-selected-client',
              portrait: selection.portrait,
              opening:
                'Thanks for meeting with me. I am interested to hear the approach you have prepared for our organisation.',
            }
          )
        }
      }
    } catch {
      // Damaged legacy browser data must never prevent the room from loading.
    }

    return CLIENTS.david
  }

  /**
   * The repeating wall and carpet grid form the tilemap. Every major furniture
   * object is a separate generated PNG, so room art is never approximated with
   * CSS shapes and each object's collision footprint can be tuned independently.
   */
  private createTilemapRoom(): void {
    this.add.rectangle(720, 180, WORLD_WIDTH, 360, 0xead8bd)
    const wallPattern = this.add.graphics()
    wallPattern.lineStyle(2, 0xe0cbaa, 0.38)
    for (let x = 0; x <= WORLD_WIDTH; x += 120) wallPattern.lineBetween(x, 0, x, 360)
    for (let y = 0; y <= 360; y += 90) wallPattern.lineBetween(0, y, WORLD_WIDTH, y)

    this.add.rectangle(720, 540, WORLD_WIDTH, 360, 0xb98900)
    const carpetPattern = this.add.graphics()
    carpetPattern.lineStyle(2, 0x9c7300, 0.22)
    for (let x = -360; x < WORLD_WIDTH + 360; x += 90) {
      carpetPattern.lineBetween(x, 360, x + 360, WORLD_HEIGHT)
    }

    this.add.rectangle(720, 360, WORLD_WIDTH, 18, 0x8f5b28).setDepth(3)
    this.add.rectangle(720, 6, WORLD_WIDTH, 12, 0x2c2c2a).setDepth(30)
    this.add.rectangle(720, 714, WORLD_WIDTH, 12, 0x2c2c2a).setDepth(30)
    this.add.rectangle(6, 360, 12, WORLD_HEIGHT, 0x2c2c2a).setDepth(30)
    this.add.rectangle(1434, 360, 12, WORLD_HEIGHT, 0x2c2c2a).setDepth(30)
  }

  private createFurniture(): void {
    this.add.image(180, 176, 'level-four-bookshelf').setDisplaySize(230, 235).setDepth(4)
    this.add.image(720, 168, 'level-four-painting').setDisplaySize(480, 320).setDepth(4)
    this.add.image(1220, 180, 'level-four-window').setDisplaySize(315, 270).setDepth(4)
    this.add.image(165, 555, 'level-four-plant').setDisplaySize(180, 220).setDepth(9)

    // Separate client, desk and chair layers reproduce the wireframe perspective
    // while allowing the player to pass visually in front of the furniture.
    const client = this.add
      .image(720, 350, 'level-four-selected-client')
      .setDisplaySize(175, 275)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
    this.add.ellipse(720, 560, 515, 42, 0x2c2c2a, 0.18).setDepth(8)
    const desk = this.add
      .image(720, 465, 'level-four-desk')
      .setDisplaySize(480, 240)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
    this.chair = this.add
      .image(720, 550, 'level-four-chair')
      .setDisplaySize(145, 180)
      .setDepth(12)
      .setInteractive({ useHandCursor: true })

    // Demo build: click the client, desk or chair to walk over and start the
    // meeting automatically on arrival — no proximity prompt, no E key.
    const startMeeting = () => {
      if (this.meetingSequenceActive || this.meetingOverlay) return
      this.clickToMove.moveToObject(
        MEETING_STAND_POINT,
        0,
        () => this.beginMeetingSequence(),
        MEETING_ARRIVAL_DISTANCE
      )
    }
    client.on('pointerdown', startMeeting)
    desk.on('pointerdown', startMeeting)
    this.chair.on('pointerdown', startMeeting)

    const paintingGlow = this.add.rectangle(720, 168, 500, 334, 0xffdda3, 0.05).setDepth(3)
    this.tweens.add({
      targets: paintingGlow,
      alpha: { from: 0.03, to: 0.13 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // The collision zones cover the visible silhouettes, not only their feet. This
    // prevents standing on the desk's rear edge or disappearing into plant leaves.
    this.addObstacle(720, 440, 480, 130)
    this.addObstacle(720, 570, 150, 90)
    this.addObstacle(165, 555, 190, 235)
  }

  private createPlayer(): void {
    this.playerShadow = this.add.ellipse(1120, 700, 125, 30, 0x2c2c2a, 0.16).setDepth(18)
    this.player = this.physics.add.image(1120, 545, 'level-four-player')
    this.player.setDisplaySize(180, 286).setDepth(20).setCollideWorldBounds(true)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.setSize(this.player.width * 0.45, this.player.height * 0.22)
    playerBody.setOffset(this.player.width * 0.275, this.player.height * 0.72)
  }

  private addObstacle(x: number, y: number, width: number, height: number): void {
    const zone = this.add.zone(x, y, width, height)
    this.physics.add.existing(zone, true)
    this.obstacles.push(zone)
  }

  private createCollisions(): void {
    for (const obstacle of this.obstacles) this.physics.add.collider(this.player, obstacle)
  }

  /**
   * The room camera is free to pan and zoom, while this transparent camera owns
   * prompts, navigation and DOM panels at a fixed 1440 × 720 screen position.
   * This is the same separation used by Level 1's dialogue interface.
   */
  private createInterfaceCamera(worldObjects: Phaser.GameObjects.GameObject[]): void {
    this.interfaceCamera = this.cameras.add(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      false,
      'LevelFourInterfaceCamera'
    )
    this.interfaceCamera.setBackgroundColor('rgba(0, 0, 0, 0)')
    this.interfaceCamera.ignore(worldObjects)
    const interfaceObjects = this.children.list.filter((object) => !worldObjects.includes(object))
    this.cameras.main.ignore(interfaceObjects)
  }

  private configureClickToMove(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.meetingOverlay) this.closeMeeting()
      else if (this.notebookOverlay) this.closeNotebook()
    })

    this.input.setTopOnly(true)

    this.clickToMove = new ClickToMoveController({
      scene: this,
      player: this.player,
      effects: this.effects,
      speed: PLAYER_SPEED,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    })

    // Demo build: tap/click open ground to walk there. Objects with their own
    // pointerdown handler (the client, the desk, a button) are skipped here —
    // this only fires when the click didn't land on anything interactive.
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (this.meetingOverlay || this.notebookOverlay || this.meetingSequenceActive) return
        if (currentlyOver.length > 0) return

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.clickToMove.moveTo(worldPoint.x, worldPoint.y)
      }
    )
  }

  private updateMovement(): void {
    this.clickToMove.update(this.time.now)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    const moving = body.velocity.lengthSq() > 0

    this.player.setFlipX(body.velocity.x < 0)

    if (moving && this.time.now - this.lastFootstepAt > 240) {
      this.lastFootstepAt = this.time.now
      const step = this.add
        .circle(this.player.x, this.player.y + 134, 6, 0x2c2c2a, 0.2)
        .setDepth(17)
      this.tweens.add({
        targets: step,
        alpha: 0,
        scale: 2.2,
        duration: 420,
        onComplete: () => step.destroy(),
      })
    }
  }

  /** Mirrors Level 2's two-leg chair approach before the meeting panel opens. */
  private beginMeetingSequence(): void {
    if (this.meetingSequenceActive || this.meetingOverlay) return
    this.meetingSequenceActive = true
    this.clickToMove.stop()
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.enable = false
    this.playerShadow.setVisible(false)

    const approachX = this.player.x <= this.chair.x ? this.chair.x - 140 : this.chair.x + 140
    this.tweens.add({
      targets: this.player,
      x: approachX,
      y: 625,
      duration: 360,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          x: this.chair.x,
          y: 500,
          duration: 380,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.player
              .setTexture('level-four-player-back')
              .setDisplaySize(185, 267)
              .setFlipX(false)
              .setDepth(13)
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

    this.cameras.main.shake(90, 0.0025)
    this.time.delayedCall(180, () => {
      // Pan past the client so their close-up occupies the left half of the screen,
      // leaving the right half available for the fixed conversation panel.
      // Frame the client's face and upper body on the left. At this zoom the
      // bottom of the view is above the seated player and chair, so both remain
      // present in the room without entering the conversation composition.
      this.cameras.main.pan(800, 250, 700, 'Sine.easeInOut')
      this.cameras.main.zoomTo(3.4, 700, 'Sine.easeInOut')
    })
    // Do not create the DOM panel until the cinematic camera movement has finished.
    this.time.delayedCall(1050, () => this.openMeeting())
  }

  private createNavigationButtons(): void {
    this.createRoundButton(58, 662, '⌂', () => window.location.assign('/dashboard'))
    this.createRoundButton(126, 662, '▤', () => this.openNotebook())
  }

  private createRoundButton(x: number, y: number, label: string, action: () => void): void {
    const circle = this.add.circle(x, y, 28, label === '⌂' ? 0x5b8c4a : 0x2c2c2a).setDepth(120)
    circle.setStrokeStyle(4, 0x161616).setInteractive({ useHandCursor: true })
    const icon = this.add
      .text(x, y - 2, label, { fontFamily: 'Arial', fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(121)
    circle.on('pointerdown', action)
    circle.on('pointerover', () =>
      this.tweens.add({ targets: [circle, icon], scale: 1.1, duration: 120 })
    )
    circle.on('pointerout', () =>
      this.tweens.add({ targets: [circle, icon], scale: 1, duration: 120 })
    )
  }

  private openNotebook(): void {
    if (this.notebookOverlay || this.meetingOverlay) return
    this.notebookOverlay = this.add
      .dom(720, 360)
      .createFromHTML(
        `
        <div style="width:560px;border:6px solid #2c2c2a;border-radius:18px;background:#f7f1e7;padding:24px;font:18px Arial;box-shadow:10px 10px 0 #2c2c2a88">
          <button data-close style="float:right;border:3px solid #2c2c2a;border-radius:50%;background:white;width:42px;height:42px;font-size:25px;cursor:pointer">×</button>
          <h2 style="color:#1f4f78;margin:0 0 16px">Meeting notebook</h2>
          <textarea aria-label="Meeting notes" placeholder="Record useful meeting notes…" style="width:100%;height:260px;box-sizing:border-box;border:3px solid #2c2c2a;border-radius:12px;padding:16px;font:17px/1.45 Arial;resize:none"></textarea>
        </div>`
      )
      .setDepth(5000)
    this.cameras.main.ignore(this.notebookOverlay)

    this.notebookOverlay.node
      .querySelector('[data-close]')
      ?.addEventListener('click', () => this.closeNotebook())
    this.notebookOverlay.node.querySelector('textarea')?.addEventListener('keydown', (event) => {
      event.stopPropagation()
    })
  }

  private closeNotebook(): void {
    this.notebookOverlay?.destroy()
    this.notebookOverlay = undefined
  }

  private openMeeting(): void {
    if (this.meetingOverlay) return
    this.player.setVelocity(0)
    // The camera crops the seated player out naturally; opening a conversation
    // must never change the player's visibility.

    this.meetingOverlay = openMeetingOverlay({
      client: {
        name: this.client.name,
        personaId: this.client.personaId,
        portrait: this.client.portrait,
        opening: this.client.opening,
      },
      getPrep: () => this.currentPrep(),
      onClose: () => this.closeMeeting(),
    })
  }

  private closeMeeting(): void {
    this.meetingOverlay?.destroy()
    this.meetingOverlay = undefined
    this.cameras.main.pan(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 450, 'Sine.easeInOut')
    this.cameras.main.zoomTo(1, 450, 'Sine.easeInOut')
    this.player
      .setTexture('level-four-player')
      .setDisplaySize(180, 286)
      .setPosition(this.chair.x + 175, 545)
      .setDepth(20)
      .setVisible(true)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.enable = true
    this.chair.setPosition(720, 550).setVisible(true)
    this.playerShadow.setVisible(true).setPosition(this.player.x, this.player.y + 134)
    this.meetingSequenceActive = false
  }
}
