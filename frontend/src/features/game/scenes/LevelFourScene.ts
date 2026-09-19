import Phaser from 'phaser'
import { SELECTED_OUTREACH_CLIENT_KEY } from '../dialogue/OutreachLaptopFlow'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 720
const WALKABLE_TOP = 365
const PLAYER_SPEED = 220

type MeetingClient = {
  name: string
  personaId: string
  company: string
  texture: string
  portrait: string
  opening: string
}

type MeetingMessage = {
  speaker: 'client' | 'player'
  text: string
}

const CLIENTS: Record<'david' | 'sarah', MeetingClient> = {
  david: {
    name: 'David Palte',
    personaId: 'test-level1-2',
    company: 'Meridian Retail Group',
    texture: 'level-four-david',
    portrait: 'character-02.png',
    opening:
      'Thanks for meeting with me. I am interested to hear how you would approach our fragmented customer data.',
  },
  sarah: {
    name: 'Sarah Chen',
    personaId: 'test-level1-1',
    company: 'ACMD Manufacturing',
    texture: 'level-four-sarah',
    portrait: 'character-01.png',
    opening:
      'Thanks for making the time. I would like to understand how your approach could improve our operational visibility.',
  },
}

const MEETING_CHOICES = [
  'Confirm the client’s most urgent priority',
  'Explore the impact on customers and teams',
  'Ask what a successful outcome looks like',
  'Discuss stakeholders and practical next steps',
]

/**
 * Playable Level 4 client-meeting room.
 *
 * This branch owns the visual scene and interaction flow only. The Level 3 data
 * handoff, AI prompt injection and grading remain clean integration seams for the
 * separate backend card, avoiding duplicate or conflicting business logic here.
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
  private meetingOverlay?: HTMLDivElement
  private notebookOverlay?: Phaser.GameObjects.DOMElement
  private obstacles: Phaser.GameObjects.Zone[] = []
  private playerShadow!: Phaser.GameObjects.Ellipse
  private lastFootstepAt = 0
  private meetingSequenceActive = false
  private meetingPrep?: {
  sessionId: string
  personaId: string
  selectedObjectives: string[]
  selectedQuestions: string[]
  totalScore: number
  resultLabel: string
}
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
    void this.loadMeetingPrep()
    this.physics.world.setBounds(0, WALKABLE_TOP, WORLD_WIDTH, WORLD_HEIGHT - WALKABLE_TOP)
    this.createTilemapRoom()
    this.createFurniture()
    this.createPlayer()
    this.createCollisions()
    this.configureKeyboard()
    const worldObjects = [...this.children.list]
    this.createNavigationButtons()
    this.interactionPrompt = this.createInteractionPrompt()
    this.createInterfaceCamera(worldObjects)
    this.cameras.main.fadeIn(500, 44, 44, 42)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.meetingOverlay?.remove())
  }

  override update(): void {
    if (!this.player) return

    if (this.meetingOverlay || this.notebookOverlay || this.meetingSequenceActive) {
      this.player.setVelocity(0)
      this.interactionPrompt.setVisible(false)
      return
    }

    this.updateMovement()
    this.updateMeetingInteraction()
    // Keep the floor shadow under the enlarged playable character's feet.
    this.playerShadow.setPosition(this.player.x, this.player.y + 134)
  }

  /** Resolve the Level 2 selection, while retaining query-string previews for QA. */

  private async loadMeetingPrep(): Promise<void> {
  try {
    const saved = JSON.parse(
      localStorage.getItem('ibm-level-three-preparation') ?? 'null'
    )

    if (
      !saved ||
      typeof saved.personaId !== 'string' ||
      typeof saved.submissionId !== 'string'
    ) {
      return
    }

    const response = await fetch(
      `/api/meeting-prep/submissions?sessionId=${encodeURIComponent(
        saved.submissionId
      )}&personaId=${encodeURIComponent(saved.personaId)}`
    )

    if (!response.ok) {
      return
    }

    const data = await response.json()

    if (!data.prep) {
      return
    }

    this.meetingPrep = {
      sessionId: saved.submissionId,
      personaId: data.prep.personaId,
      selectedObjectives: data.prep.selectedObjectives ?? [],
      selectedQuestions: data.prep.selectedQuestions ?? [],
      totalScore: data.prep.totalScore ?? 0,
      resultLabel: data.prep.resultLabel ?? '',
    }
  } catch (error) {
    console.error('Failed to load meeting preparation for Level 4:', error)
  }
}





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
    this.add.image(720, 350, 'level-four-selected-client').setDisplaySize(175, 275).setDepth(7)
    this.add.ellipse(720, 560, 515, 42, 0x2c2c2a, 0.18).setDepth(8)
    this.add.image(720, 465, 'level-four-desk').setDisplaySize(480, 240).setDepth(10)
    this.chair = this.add.image(720, 550, 'level-four-chair').setDisplaySize(145, 180).setDepth(12)

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

  private configureKeyboard(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) throw new Error('Keyboard controls are unavailable.')

    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    keyboard.on('keydown-ESC', () => {
      if (this.meetingOverlay) this.closeMeeting()
      else if (this.notebookOverlay) this.closeNotebook()
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
    const closeEnough = Phaser.Math.Distance.Between(this.player.x, this.player.y, 720, 650) < 235
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
    const shadow = this.add.rectangle(5, 5, 270, 54, 0x2c2c2a, 0.55)
    const panel = this.add.rectangle(0, 0, 270, 54, 0xfff4d6).setStrokeStyle(4, 0x2c2c2a)
    const text = this.add
      .text(0, 0, 'E  Start client meeting', {
        fontFamily: 'Arial',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#1f4f78',
      })
      .setOrigin(0.5)
    container.add([shadow, panel, text])
    this.tweens.add({ targets: container, y: 646, duration: 650, yoyo: true, repeat: -1 })
    return container
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

    const messages: MeetingMessage[] = [{ speaker: 'client', text: this.client.opening }]
    let freeReplies = 0
    let mode: 'choice' | 'free' | 'feedback' = 'choice'
    // Phaser's DOM container inherits the canvas camera transform even when the
    // object is ignored by that camera. A native fixed overlay is therefore the
    // reliable equivalent of Level 1's camera-fixed canvas panel for this HTML UI.
    const root = document.createElement('div')
    root.dataset.levelFourMeeting = 'true'
    root.className = 'l4-viewport-overlay'
    document.body.appendChild(root)
    this.meetingOverlay = root

    const escapeHtml = (value: string) =>
      value.replace(/[&<>'"]/g, (character) => {
        const entities: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        }
        return entities[character] ?? character
      })

    const render = () => {
      const transcript = messages
        .map(
          (message) =>
            `<div class="l4-message ${message.speaker}"><img src="/assets/characters/npcs/${message.speaker === 'client' ? this.client.portrait : 'character-03.png'}" alt=""><p>${escapeHtml(message.text)}</p></div>`
        )
        .join('')
      const controls = this.meetingControls(mode, freeReplies, escapeHtml)

      root.innerHTML = `
        <style>${this.meetingStyles()}</style>
        <div class="l4-shell">
          <section class="l4-panel">
            <button class="l4-close" data-close aria-label="Close meeting">×</button>
            ${
              mode === 'feedback'
                ? controls
                : `<header class="l4-head">${escapeHtml(this.client.name)}</header><div class="l4-transcript" data-transcript>${transcript}</div><div class="l4-controls">${controls}</div>`
            }
          </section>
        </div>`

      root.querySelector('[data-close]')?.addEventListener('click', () => this.closeMeeting())
      root.querySelectorAll<HTMLElement>('[data-choice]').forEach((button) => {
        button.addEventListener('click', () => {
          const selectedChoice = Number(button.dataset.choice)
          messages.push({
            speaker: 'player',
            text: MEETING_CHOICES[selectedChoice] ?? MEETING_CHOICES[0]!,
          })
          messages.push({ speaker: 'client', text: this.choiceResponse(selectedChoice) })
          mode = 'free'
          render()
        })
      })

      const reply = root.querySelector<HTMLTextAreaElement>('[data-reply]')
      const count = root.querySelector<HTMLElement>('[data-count]')
      for (const eventName of ['keydown', 'keyup'] as const) {
        reply?.addEventListener(eventName, (event) => event.stopPropagation())
      }
      reply?.addEventListener('input', () => {
        if (count) count.textContent = `${120 - reply.value.length} characters remaining`
      })
      root.querySelector('[data-send]')?.addEventListener('click', () => {
        const response = reply?.value.trim()
        if (!response) return
        messages.push({ speaker: 'player', text: response })
        messages.push({
          speaker: 'client',
          text:
            freeReplies === 0
              ? 'That direction makes sense. I would want the first step to stay focused and show a practical benefit quickly.'
              : 'Good, that gives me a clearer picture of the approach and what you would need from our team.',
        })
        freeReplies += 1
        render()
      })
      root.querySelector('[data-end]')?.addEventListener('click', () => {
        mode = 'feedback'
        render()
      })
      root.querySelector('[data-back]')?.addEventListener('click', () => this.closeMeeting())

      const transcriptNode = root.querySelector<HTMLElement>('[data-transcript]')
      if (transcriptNode) transcriptNode.scrollTop = transcriptNode.scrollHeight
    }

    render()
  }

  private meetingControls(
    mode: 'choice' | 'free' | 'feedback',
    freeReplies: number,
    escapeHtml: (value: string) => string
  ): string {
    if (mode === 'choice') {
      return `<div class="l4-choices">${MEETING_CHOICES.map(
        (choice, index) =>
          `<button data-choice="${index}">${index + 1}. ${escapeHtml(choice)}</button>`
      ).join('')}</div>`
    }

    if (mode === 'free') {
      return `<div class="l4-compose"><textarea maxlength="120" data-reply placeholder="Type your response…"></textarea><span data-count>120 characters remaining</span><button data-send aria-label="Send response">➜</button>${freeReplies >= 2 ? '<button class="l4-end" data-end>End meeting</button>' : ''}</div>`
    }

    return `<div class="l4-feedback"><div class="l4-score">72</div><h2>Meeting Feedback</h2><h3>Relationship Health</h3><div class="l4-meter"><i style="width:72%"></i></div><h3>Deal Potential</h3><div class="l4-meter amber"><i style="width:68%"></i></div><h3>Meeting summary</h3><p>You established the client’s priority, explored business impact and moved the conversation toward a practical next step.</p><button data-back>Back to Office</button></div>`
  }

  private choiceResponse(choice: number): string {
    const response = (
      [
        'The immediate priority is a reliable shared view that helps the team act without waiting on manual reconciliation.',
        'The inconsistency slows decisions and makes it harder to deliver a dependable experience for customers.',
        'Success means clearer decisions, measurable improvement and an approach the team can actually maintain.',
        'I need the operational owners involved early, with a focused next step that proves value before a larger commitment.',
      ][choice] ?? 'That is a useful place to start. Please tell me how you would move it forward.'
      )
      if (!this.meetingPrep) {
  return response
}

const preparedObjective = this.meetingPrep.selectedObjectives[0]
const preparedQuestion = this.meetingPrep.selectedQuestions[choice]
  ?? this.meetingPrep.selectedQuestions[0]

if (preparedQuestion) {
  return `${response} Your preparation also highlighted "${preparedQuestion}", which is relevant to this discussion.`
}

if (preparedObjective) {
  return `${response} That also connects with the meeting objective you prepared: "${preparedObjective}".`
}

return response
    
  }

  private meetingStyles(): string {
    return `
      .l4-viewport-overlay{position:fixed;z-index:9999;top:18px;right:18px;width:min(650px,46vw);height:calc(100vh - 36px)}
      .l4-shell,.l4-shell *{box-sizing:border-box}.l4-shell{width:100%;height:100%;padding:10px;background:#b98900;border:7px solid #2c2c2a;border-radius:18px;font-family:Arial,sans-serif;color:#2c2c2a;box-shadow:0 20px 48px #0008;animation:l4-open .45s cubic-bezier(.2,.9,.3,1.2)}
      .l4-panel{position:relative;display:flex;height:100%;min-height:0;flex-direction:column;overflow:hidden;border:5px solid #2c2c2a;border-radius:14px;background:#f4f7f9}.l4-head{height:92px;flex:0 0 92px;display:grid;place-items:center;background:#b98900;border-bottom:5px solid #2c2c2a;font-size:27px;font-weight:800}.l4-close{position:absolute;right:15px;top:16px;z-index:4;width:48px;height:48px;border:4px solid #2c2c2a;border-radius:50%;background:#fff;font-size:28px;cursor:pointer;transition:.18s}.l4-close:hover{transform:rotate(90deg) scale(1.08)}
      .l4-transcript{min-height:0;flex:1;overflow-y:auto;padding:22px}.l4-message{display:flex;gap:12px;align-items:flex-start;margin:0 0 16px}.l4-message.player{flex-direction:row-reverse}.l4-message img{width:54px;height:54px;border:3px solid #2c2c2a;border-radius:50%;background:#fff;object-fit:contain}.l4-message p{max-width:380px;margin:0;border:2px solid #9ba4aa;border-radius:14px;background:#fff;padding:13px 15px;font-size:16px;line-height:1.38}.l4-message.player p{border-color:#6f925f;background:#edf5e9}
      .l4-controls{flex:0 0 auto;padding:14px 18px 18px}.l4-choices{display:grid;gap:8px;border:3px solid #8f5b28;border-radius:15px;background:#fff8e7;padding:10px}.l4-choices button{border:3px solid #2c2c2a;border-radius:11px;background:#5f914f;padding:12px 15px;color:#fff;text-align:left;font-size:14px;font-weight:700;cursor:pointer;transition:.16s}.l4-choices button:hover{transform:translateX(5px);filter:brightness(1.08)}
      .l4-compose{position:relative;display:grid;grid-template-columns:1fr 62px;gap:9px}.l4-compose textarea{height:82px;border:3px solid #c98a3e;border-radius:13px;padding:12px 14px;font:16px Arial;resize:none}.l4-compose [data-count]{position:absolute;left:6px;top:87px;color:#777;font-size:12px}.l4-compose [data-send]{border:4px solid #2c2c2a;border-radius:13px;background:#5f914f;color:#fff;font-size:28px;cursor:pointer}.l4-end{grid-column:1/-1;margin-top:15px;border:3px solid #2c2c2a;border-radius:10px;background:#1f4f78;padding:10px;color:#fff;font-weight:700;cursor:pointer}
      .l4-feedback{position:absolute;inset:0;padding:118px 38px 28px;background:#f4f7f9}.l4-feedback h2{position:absolute;left:0;right:0;top:0;height:90px;margin:0;display:grid;place-items:center;background:#b98900;border-bottom:5px solid #2c2c2a;color:#fff}.l4-score{position:absolute;left:18px;top:28px;z-index:2;display:grid;width:132px;height:132px;place-items:center;border:6px solid #2c2c2a;border-radius:50%;background:#fff;font-size:55px;font-weight:900;animation:l4-score .7s ease-out}.l4-feedback h3{margin:18px 0 7px}.l4-feedback p{font-size:16px;line-height:1.5}.l4-meter{height:22px;border-radius:14px;background:#d5d1c8;overflow:hidden}.l4-meter i{display:block;height:100%;background:#5f914f;animation:l4-meter 1s ease-out}.l4-meter.amber i{background:#c98a3e}.l4-feedback button{position:absolute;right:36px;bottom:32px;border:4px solid #2c2c2a;border-radius:11px;background:#5f914f;padding:14px 30px;color:#fff;font-size:18px;font-weight:800;box-shadow:5px 5px 0 #2c2c2a;cursor:pointer}
      @keyframes l4-open{from{opacity:0;transform:translateX(90px)}to{opacity:1;transform:none}}@keyframes l4-score{from{transform:scale(.2) rotate(-30deg)}}@keyframes l4-meter{from{width:0}}
      @media(prefers-reduced-motion:reduce){.l4-shell *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
    `
  }

  private closeMeeting(): void {
    this.meetingOverlay?.remove()
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
