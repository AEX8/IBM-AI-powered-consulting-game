import Phaser from 'phaser'
import { openMeetingOverlay, type MeetingOverlayHandle } from '@/features/meeting/MeetingOverlay'
import type { MeetingPrepContext } from '@/features/meeting/prompts'
import { SELECTED_OUTREACH_CLIENT_KEY } from '../dialogue/OutreachLaptopFlow'
import { readNotebook, saveNotebook } from '../notebookStorage'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 720
const WALKABLE_TOP = 365
const PLAYER_SPEED = 220
const LEVEL_THREE_PREPARATION_KEY = 'ibm-level-three-preparation'

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
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
  private interactionKey!: Phaser.Input.Keyboard.Key
  private interactionPrompt!: Phaser.GameObjects.Container
  private meetingOverlay?: MeetingOverlayHandle
  private notebookPanel?: Phaser.GameObjects.Container
  private notebookInput?: Phaser.GameObjects.DOMElement
  private menuPanel?: Phaser.GameObjects.Container
  private notes = ''
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
    this.notes = readNotebook(4, this.client.personaId)
    this.physics.world.setBounds(0, WALKABLE_TOP, WORLD_WIDTH, WORLD_HEIGHT - WALKABLE_TOP)
    this.createTilemapRoom()
    this.createFurniture()
    this.createPlayer()
    this.createCollisions()
    this.configureKeyboard()
    const worldObjects = [...this.children.list]
    this.interactionPrompt = this.createInteractionPrompt()
    this.createInterfaceCamera(worldObjects)
    this.cameras.main.fadeIn(500, 44, 44, 42)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.meetingOverlay?.destroy())
  }

  override update(): void {
    if (!this.player) return

    if (document.querySelector('[data-level-navigation-dialog]')) {
      this.player.setVelocity(0)
      this.interactionPrompt.setVisible(false)
      return
    }

    if (this.meetingOverlay || this.notebookPanel || this.menuPanel || this.meetingSequenceActive) {
      this.player.setVelocity(0)
      this.interactionPrompt.setVisible(false)
      return
    }

    this.updateMovement()
    this.updateMeetingInteraction()
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
    this.add.rectangle(720, 180, WORLD_WIDTH, 360, 0xf7fbff)
    const wallPattern = this.add.graphics()
    wallPattern.lineStyle(2, 0xd0e2ff, 0.45)
    for (let x = 0; x <= WORLD_WIDTH; x += 120) wallPattern.lineBetween(x, 0, x, 360)
    for (let y = 0; y <= 360; y += 90) wallPattern.lineBetween(0, y, WORLD_WIDTH, y)

    this.add.rectangle(720, 540, WORLD_WIDTH, 360, 0xffffff)
    const carpetPattern = this.add.graphics()
    carpetPattern.lineStyle(2, 0x78a9ff, 0.35)
    for (let x = -360; x < WORLD_WIDTH + 360; x += 90) {
      carpetPattern.lineBetween(x, 360, x + 360, WORLD_HEIGHT)
    }

    this.add.rectangle(720, 360, WORLD_WIDTH, 18, 0xa6c8ff).setDepth(3)
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
    this.add.image(720, 350, 'level-four-selected-client').setDisplaySize(175, 275).setDepth(7)
    this.add.ellipse(720, 560, 515, 42, 0x2c2c2a, 0.18).setDepth(8)
    this.add.image(720, 465, 'level-four-desk').setDisplaySize(480, 240).setDepth(10)
    this.chair = this.add.image(720, 550, 'level-four-chair').setDisplaySize(145, 180).setDepth(12)

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

  private configureKeyboard(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) throw new Error('Keyboard controls are unavailable.')

    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    keyboard.on('keydown-ESC', () => {
      if (this.meetingOverlay) this.closeMeeting()
      else if (this.notebookPanel) this.closeNotebook()
      else if (this.menuPanel) {
        this.menuPanel.destroy(true)
        this.menuPanel = undefined
      }
    })
  }

  private updateMovement(): void {
    const direction = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.wasd.right.isDown) -
        Number(this.cursors.left.isDown || this.wasd.left.isDown),
      Number(this.cursors.down.isDown || this.wasd.down.isDown) -
        Number(this.cursors.up.isDown || this.wasd.up.isDown)
    )

    if (direction.lengthSq() === 0) {
      this.player.setVelocity(0).setAngle(0)
      return
    }

    direction.normalize().scale(PLAYER_SPEED)
    this.player.setVelocity(direction.x, direction.y)
    this.player.setFlipX(direction.x < 0)
    this.player.setAngle(Math.sin(this.time.now / 95) * 1.8)

    if (this.time.now - this.lastFootstepAt > 240) {
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

  private updateMeetingInteraction(): void {
    const chairBounds = this.chair.getBounds()
    const nearestX = Phaser.Math.Clamp(this.player.x, chairBounds.left, chairBounds.right)
    const nearestY = Phaser.Math.Clamp(this.player.y, chairBounds.top, chairBounds.bottom)
    const closeEnough =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestX, nearestY) < 130
    this.interactionPrompt.setVisible(closeEnough)
    if (closeEnough && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.beginMeetingSequence()
    }
  }

  /** Mirrors Level 2's two-leg chair approach before the meeting panel opens. */
  private beginMeetingSequence(): void {
    if (this.meetingSequenceActive || this.meetingOverlay) return
    this.meetingSequenceActive = true
    this.player.setVelocity(0)
    this.interactionPrompt.setVisible(false)
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

  private createInteractionPrompt(): Phaser.GameObjects.Container {
    const container = this.add.container(720, 655).setDepth(100).setVisible(false)
    const shadow = this.add.rectangle(5, 5, 270, 54, 0x001d6c, 0.28)
    const panel = this.add.rectangle(0, 0, 270, 54, 0xd0e2ff).setStrokeStyle(4, 0x002d9c)
    const text = this.add
      .text(0, 0, 'E  Start client meeting', {
        fontFamily: 'Arial',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#001d6c',
      })
      .setOrigin(0.5)
    container.add([shadow, panel, text])
    this.tweens.add({ targets: container, y: 646, duration: 650, yoyo: true, repeat: -1 })
    return container
  }

  private createNavigationButtons(): void {
    this.createRoundButton(58, 662, '⌂', () => this.openHomeMenu())
    this.createRoundButton(126, 662, '▤', () => this.openNotebook())
  }

  private createRoundButton(x: number, y: number, label: string, action: () => void): void {
    const circle = this.add.circle(x, y, 28, label === '⌂' ? 0x002d9c : 0x2c2c2a).setDepth(120)
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

  private openHomeMenu(): void {
    if (this.menuPanel || this.notebookPanel || this.meetingOverlay) return
    const menu = this.add.container(0, 0).setScrollFactor(0).setDepth(7000)
    const dimmer = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0xedf5ff, 0.76)
      .setOrigin(0)
      .setInteractive()
    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 720, 220, 0xf3f6f8)
      .setStrokeStyle(4, 0x111111)
    const topStrip = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 98, 720, 18, 0xd0e2ff)
      .setStrokeStyle(3, 0x111111)
    const resume = this.createMenuButton(WORLD_WIDTH / 2 - 215, 'Resume', () => {
      menu.destroy(true)
      this.menuPanel = undefined
    })
    const restart = this.createMenuButton(WORLD_WIDTH / 2, 'Restart', () =>
      window.location.reload()
    )
    const home = this.createMenuButton(WORLD_WIDTH / 2 + 215, 'Home', () =>
      window.location.assign('/dashboard')
    )
    dimmer.on('pointerdown', () => {
      menu.destroy(true)
      this.menuPanel = undefined
    })
    menu.add([dimmer, panel, topStrip, resume, restart, home])
    this.cameras.main.ignore(menu)
    this.menuPanel = menu
  }

  private createMenuButton(
    x: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, WORLD_HEIGHT / 2 + 15)
    const background = this.add
      .rectangle(0, 0, 160, 50, 0x002d9c)
      .setStrokeStyle(3, 0x111111)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(0, 0, label, { color: '#ffffff', fontFamily: 'Arial', fontSize: '21px' })
      .setOrigin(0.5)
    background.on('pointerdown', onClick)
    button.add([background, text])
    return button
  }

  private openNotebook(): void {
    if (this.notebookPanel || this.menuPanel || this.meetingOverlay) return
    const notebookX = WORLD_WIDTH / 2
    const notebookY = WORLD_HEIGHT / 2
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(7200)
    const dimmer = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0xedf5ff, 0.82)
      .setOrigin(0)
      .setInteractive()
    const body = this.add
      .rectangle(notebookX, notebookY, 460, 625, 0xf4f7f9)
      .setStrokeStyle(5, 0x111111)
      .setInteractive()
    const header = this.add.rectangle(notebookX, 94, 460, 105, 0xd0e2ff).setStrokeStyle(5, 0x111111)
    const iconCircle = this.add.circle(notebookX, 94, 42, 0x2c2c2a).setStrokeStyle(4, 0x000000)
    const iconPaper = this.add
      .rectangle(notebookX, 94, 27, 38, 0xf4f7f9)
      .setStrokeStyle(2, 0x111111)
    const iconLines = this.add.graphics().lineStyle(1, 0x555555)
    for (let y = 82; y <= 106; y += 5) iconLines.lineBetween(notebookX - 9, y, notebookX + 9, y)

    const input = this.add
      .dom(notebookX, notebookY + 62)
      .createFromHTML(
        '<textarea name="levelFourNotes" maxlength="1000" aria-label="Level 4 consultant notes" style="width:365px;height:430px;resize:none;border:0;padding:4px 8px;background-color:#f4f7f9;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 34px,#222 35px,#222 37px);color:#2c2c2a;font-family:Arial,sans-serif;font-size:17px;line-height:37px;outline:none;overflow-y:auto;"></textarea>'
      )
      .setScrollFactor(0)
      .setDepth(7300)
    const textarea = input.getChildByName('levelFourNotes') as HTMLTextAreaElement | null
    if (textarea) {
      textarea.value = this.notes
      textarea.addEventListener('keydown', (event) => event.stopPropagation())
      textarea.addEventListener('keyup', (event) => event.stopPropagation())
    }
    const saveX = notebookX + 205
    const saveY = notebookY + 340
    const saveButton = this.add
      .circle(saveX, saveY, 25, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({ useHandCursor: true })
    const saveTriangle = this.add.graphics().fillStyle(0x2c2c2a)
    saveTriangle.fillTriangle(saveX - 7, saveY - 11, saveX - 7, saveY + 11, saveX + 11, saveY)
    dimmer.on('pointerdown', () => this.closeNotebook())
    saveButton.on('pointerdown', () => this.closeNotebook())
    panel.add([dimmer, body, header, iconCircle, iconPaper, iconLines, saveButton, saveTriangle])
    this.cameras.main.ignore([panel, input])
    this.notebookPanel = panel
    this.notebookInput = input
    this.tweens.add({ targets: panel, alpha: { from: 0, to: 1 }, duration: 180 })
  }

  private closeNotebook(): void {
    const textarea = this.notebookInput?.getChildByName(
      'levelFourNotes'
    ) as HTMLTextAreaElement | null
    if (textarea) {
      this.notes = textarea.value
      saveNotebook(4, this.notes, this.client.personaId)
    }
    this.notebookInput?.destroy()
    this.notebookPanel?.destroy(true)
    this.notebookInput = undefined
    this.notebookPanel = undefined
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
