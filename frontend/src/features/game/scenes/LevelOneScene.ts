import Phaser from 'phaser'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getClientAuth } from '@/lib/firebase/client'
import { getSessionsCollection } from '@/lib/firebase/firestore'
import { LevelOneEffects } from '../effects/LevelOneEffects'
import {
  ClientDialogueController,
  type ClientDefinition,
} from '../dialogue/ClientDialogueController'

const WORLD_WIDTH = 1440
const WORLD_HEIGHT = 720
const FLOOR_TOP = 315
const FLOOR_BOTTOM = 704
const PLAYER_SPEED = 220
const CHARACTER_WIDTH = 165
const CHARACTER_HEIGHT = 238
const TABLE_WIDTH = 175
const TABLE_HEIGHT = 154
const LEVEL_ONE_COMPLETION_KEY = 'ibm-level-one-completed'
const LEVEL_ONE_MET_CLIENTS_KEY = 'ibm-level-one-met-clients'

type ManagerConversationTurn = {
  managerMessage: string
  playerReply: string
}

type ManagerConversation = {
  turns: readonly ManagerConversationTurn[]
  onComplete: () => void
}

export class LevelOneScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private manager!: Phaser.Physics.Arcade.Image
  private effects!: LevelOneEffects
  private goodClient!: Phaser.GameObjects.Image
  private badClient!: Phaser.GameObjects.Image

  private clientDialogue?: ClientDialogueController

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private controlsEnabled = false
  private interfaceOpen = false

  private homeButton!: Phaser.GameObjects.Container
  private notebookButton!: Phaser.GameObjects.Container

  private managerPanel?: Phaser.GameObjects.Container
  private managerReplyInput?: Phaser.GameObjects.DOMElement
  private managerDialogueLog?: Phaser.GameObjects.DOMElement
  private menuPanel?: Phaser.GameObjects.Container
  private notebookPanel?: Phaser.GameObjects.Container
  private notebookInput?: Phaser.GameObjects.DOMElement

  private interfaceCamera!: Phaser.Cameras.Scene2D.Camera
  private obstacleZones: Phaser.GameObjects.Zone[] = []
  private completedClientNames = new Set<string>()
  private completedClients = new Map<
    string,
    { name: string; personaId?: string; texture: string }
  >()
  private requiredClientCount = 0
  private levelCompletionStarted = false
  private exitReady = false
  private exitArrow?: Phaser.GameObjects.Container
  private managerConversationHistory: Array<{
    speaker: 'manager' | 'player'
    message: string
  }> = []

  private notes = ''

  constructor() {
    super('LevelOneScene')
  }

  preload(): void {
    this.load.image('player', '/assets/characters/npcs/character-03.png')
    this.load.image('manager', '/assets/characters/npcs/character-04.png')
    this.load.image('good-client', '/assets/characters/npcs/character-01.png')
    this.load.image('bad-client', '/assets/characters/npcs/character-02.png')
    this.load.image('round-table', '/assets/game/level-1/furniture/level-one-round-table.png')
    this.load.image('couch', '/assets/game/level-1/furniture/level-one-couch.png')
    this.load.image('plant', '/assets/game/level-1/furniture/level-one-plant.png')
  }

  create(): void {
    this.physics.world.setBounds(0, FLOOR_TOP, WORLD_WIDTH, FLOOR_BOTTOM - FLOOR_TOP)

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBackgroundColor('#efe1c7')

    this.effects = new LevelOneEffects(this)

    this.createRoom()
    this.createFurniture()
    this.createPlayer()
    this.createCharacters()
    this.createCollisions()

    this.effects.addCharacterShadow(this.player, 76)
    this.effects.addCharacterShadow(this.manager, 72)
    this.effects.addIdleBreathing(this.manager, 200)

    this.effects.addWindowAmbience(295, 1145, 165)
    this.effects.playElevatorSweep(WORLD_WIDTH / 2, WORLD_HEIGHT)

    /*
     * These are the objects that belong to the room.
     * The separate interface camera ignores them.
     */
    const worldObjects = [...this.children.list]

    this.configureKeyboard()
    this.createInterface()
    this.createInterfaceCamera(worldObjects)

    const clients: ClientDefinition[] = [
      {
        name: 'Sarah Chen',
        texture: 'good-client',
        personaId: 'test-level-1',
        responseMode: 'llm',
        sprite: this.goodClient,
      },
      {
        name: 'David Palte',
        texture: 'bad-client',
        personaId: 'test-level-2',
        responseMode: 'llm',
        sprite: this.badClient,
      },
    ]

    this.requiredClientCount = clients.length

    this.clientDialogue = new ClientDialogueController({
      scene: this,
      player: this.player,
      clients,
      effects: this.effects,
      mainCamera: this.cameras.main,
      interfaceCamera: this.interfaceCamera,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,

      onOpen: () => {
        this.interfaceOpen = true
        this.controlsEnabled = false
      },

      onClose: () => {
        this.interfaceOpen = false
        this.controlsEnabled = true
      },

      onClientCompleted: (client, coveredInfoPoints) => {
  this.handleClientCompleted(client, coveredInfoPoints)
},
    })

    this.startArrivalSequence()
  }

  override update(): void {
    if (!this.player) return

    if (!this.controlsEnabled || this.interfaceOpen) {
      this.player.setVelocity(0)
      this.player.setAngle(0)
      this.effects.updateWalking(this.player, false, this.time.now)
      this.clientDialogue?.hidePrompt()
      return
    }

    this.updateMovement()
    this.updateCharacterDepths()
    this.clientDialogue?.update()
    this.checkForLevelExit()
  }

  private configureKeyboard(): void {
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard controls are unavailable.')
    }

    this.input.setTopOnly(true)
    this.cursors = keyboard.createCursorKeys()

    this.wasd = keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
    }) as typeof this.wasd
  }

  private createInterfaceCamera(worldObjects: Phaser.GameObjects.GameObject[]): void {
    this.interfaceCamera = this.cameras.add(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      false,
      'InterfaceCamera'
    )

    this.interfaceCamera.setBackgroundColor('rgba(0, 0, 0, 0)')
    this.interfaceCamera.ignore(worldObjects)
    this.cameras.main.ignore([this.homeButton, this.notebookButton])
  }

  private createRoom(): void {
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xefe1c7)
      .setDepth(0)

    const room = this.add.graphics().setDepth(1)

    room.fillStyle(0x2c2c2a)
    room.fillRect(0, 0, WORLD_WIDTH, 10)
    room.fillRect(0, 0, 10, WORLD_HEIGHT)
    room.fillRect(WORLD_WIDTH - 10, 0, 10, WORLD_HEIGHT)
    room.fillRect(0, WORLD_HEIGHT - 10, WORLD_WIDTH, 10)

    room.fillStyle(0x956127)
    room.fillRect(10, FLOOR_TOP - 6, WORLD_WIDTH - 20, 12)

    this.createWindow(295, 165)
    this.createWindow(1145, 165)
    this.createBanner()
    this.createElevatorThreshold()
  }

  private createWindow(x: number, y: number): void {
    const graphics = this.add.graphics().setDepth(2)

    graphics.fillStyle(0xc7e5f3)
    graphics.fillRect(x - 155, y - 78, 310, 156)

    graphics.lineStyle(5, 0x2c2c2a)
    graphics.strokeRect(x - 155, y - 78, 310, 156)
    graphics.lineBetween(x, y - 78, x, y + 78)
    graphics.lineBetween(x - 155, y, x + 155, y)
  }

  private createBanner(): void {
    this.add
      .rectangle(WORLD_WIDTH / 2, 105, 500, 90, 0x477493)
      .setStrokeStyle(5, 0x2c2c2a)
      .setDepth(3)

    this.add
      .text(WORLD_WIDTH / 2, 105, 'Find a Lead', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '38px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(4)
  }

  private createElevatorThreshold(): void {
    const graphics = this.add.graphics().setDepth(8)
    const centreX = WORLD_WIDTH / 2

    graphics.fillStyle(0x2c2c2a)
    graphics.fillRect(centreX - 185, WORLD_HEIGHT - 22, 370, 22)

    graphics.fillStyle(0xc99712)
    graphics.fillRoundedRect(centreX - 185, WORLD_HEIGHT - 25, 370, 16, 7)
  }

  private createFurniture(): void {
    this.add
      .image(WORLD_WIDTH / 2, 282, 'couch')
      .setDisplaySize(525, 155)
      .setDepth(282)

    this.addTable(155, 405)
    this.addTable(525, 405)
    this.addTable(340, 570)
    this.addTable(965, 585)

    const plant = this.add.image(1135, 285, 'plant').setDisplaySize(155, 180).setDepth(285)

    this.effects.addPlantSway(plant)

    // Keep collision footprints aligned with the furniture's floor contact area.
    // They are intentionally smaller than the full PNG bounds so the player
    // can walk behind furniture without walking through it.
    this.addObstacle(WORLD_WIDTH / 2, 320, 500, 60)
    this.addObstacle(155, 420, 145, 88)
    this.addObstacle(525, 420, 145, 88)
    this.addObstacle(340, 585, 145, 88)
    this.addObstacle(965, 585, 145, 88)
    this.addObstacle(1135, 300, 115, 95)
  }

  private addTable(x: number, y: number): void {
    this.add.image(x, y, 'round-table').setDisplaySize(TABLE_WIDTH, TABLE_HEIGHT).setDepth(y)
  }

  private addObstacle(x: number, y: number, width: number, height: number): void {
    const zone = this.add.zone(x, y, width, height)

    this.physics.add.existing(zone, true)
    this.obstacleZones.push(zone)
  }

  private createPlayer(): void {
    this.player = this.physics.add
      .image(WORLD_WIDTH / 2, FLOOR_BOTTOM - 65, 'player')
      .setDisplaySize(CHARACTER_WIDTH, CHARACTER_HEIGHT)
      .setCollideWorldBounds(true)
      .setVisible(false)

    const body = this.player.body as Phaser.Physics.Arcade.Body

    body.setSize(this.player.width * 0.42, this.player.height * 0.22)
    body.setOffset(this.player.width * 0.29, this.player.height * 0.74)

    this.player.setDepth(this.player.y)
  }

  private createCharacters(): void {
    this.manager = this.physics.add
      .image(760, 430, 'manager')
      .setDisplaySize(CHARACTER_WIDTH, CHARACTER_HEIGHT)
      .setImmovable(true)

    const managerBody = this.manager.body as Phaser.Physics.Arcade.Body

    managerBody.setSize(this.manager.width * 0.44, this.manager.height * 0.2)
    managerBody.setOffset(this.manager.width * 0.28, this.manager.height * 0.76)

    this.manager.setDepth(this.manager.y)

    this.goodClient = this.physics.add
      .staticImage(270, 470, 'good-client')
      .setDisplaySize(CHARACTER_WIDTH, CHARACTER_HEIGHT)
      .setDepth(470)
      .refreshBody()

    this.badClient = this.physics.add
      .staticImage(1050, 470, 'bad-client')
      .setDisplaySize(CHARACTER_WIDTH, CHARACTER_HEIGHT)
      .setDepth(470)
      .refreshBody()

    this.effects.addIdleBreathing(this.goodClient, 500)
    this.effects.addIdleBreathing(this.badClient, 900)

    /*
     * Clients are still visual placeholders only.
     * There is no client dialogue or E interaction here.
     */
    this.addObstacle(270, 545, 55, 35)
    this.addObstacle(1050, 545, 55, 35)
  }

  private createCollisions(): void {
    for (const obstacle of this.obstacleZones) {
      this.physics.add.collider(this.player, obstacle)
    }

    this.physics.add.collider(this.player, this.manager)
  }

  private createInterface(): void {
    this.homeButton = this.createHomeButton()
    this.notebookButton = this.createNotebookButton()

    this.homeButton.setVisible(false)
    this.notebookButton.setVisible(false)
  }

  private createHomeButton(): Phaser.GameObjects.Container {
    const container = this.add
      .container(44, WORLD_HEIGHT - 45)
      .setScrollFactor(0)
      .setDepth(5000)

    const hitArea = this.add.circle(0, 0, 31, 0x5b8c4a).setStrokeStyle(3, 0x2c2c2a).setInteractive({
      useHandCursor: true,
    })

    this.effects.addButtonHover(hitArea)

    const house = this.add.graphics()

    house.lineStyle(4, 0x1d2b1a)
    house.strokeTriangle(-15, -3, 0, -17, 15, -3)
    house.strokeRect(-12, -3, 24, 21)
    house.strokeRect(-4, 7, 8, 11)

    hitArea.on('pointerdown', () => {
      this.effects.pressButton(hitArea)
      this.openHomeMenu()
    })

    container.add([hitArea, house])

    return container
  }

  private createNotebookButton(): Phaser.GameObjects.Container {
    const container = this.add
      .container(112, WORLD_HEIGHT - 45)
      .setScrollFactor(0)
      .setDepth(5000)

    const hitArea = this.add.circle(0, 0, 31, 0x2c2c2a).setStrokeStyle(3, 0x000000).setInteractive({
      useHandCursor: true,
    })

    this.effects.addButtonHover(hitArea)

    const paper = this.add.rectangle(0, 0, 24, 31, 0xf7fafc).setStrokeStyle(2, 0x2c2c2a)

    const lines = this.add.graphics()

    lines.lineStyle(1, 0x777777)

    for (let y = -10; y <= 10; y += 5) {
      lines.lineBetween(-8, y, 8, y)
    }

    hitArea.on('pointerdown', () => {
      this.effects.pressButton(hitArea)
      this.openNotebook()
    })

    container.add([hitArea, paper, lines])

    return container
  }

  private startArrivalSequence(): void {
    this.controlsEnabled = false
    this.interfaceOpen = true

    this.time.delayedCall(4550, () => {
      this.player.setVisible(true)

      this.effects.playArrivalReveal(WORLD_WIDTH, WORLD_HEIGHT)

      this.tweens.add({
        targets: this.player,
        y: 590,
        duration: 1900,
        ease: 'Sine.easeInOut',

        onComplete: () => {
          this.managerApproachesPlayer()
        },
      })
    })
  }

  private managerApproachesPlayer(): void {
    this.tweens.add({
      targets: this.manager,
      x: this.player.x + 125,
      y: this.player.y - 85,
      duration: 1600,
      ease: 'Sine.easeInOut',

      onComplete: () => {
        this.homeButton.setVisible(true)
        this.notebookButton.setVisible(true)

        /*
         * TEST MANAGER DIALOGUE 1.
         */
        this.showManagerConversation({
          turns: [
            {
              managerMessage:
                "Welcome to IBM! We are excited to have you join us. Since you're new to consulting, we'll start with some training to help you get familiar with what the job is really like.",
              playerReply: "Thank you! I'm excited to get started.",
            },
            {
              managerMessage:
                "Think of this as a safe space to practise, make mistakes, and learn along the way. Your first task is finding a potential client to work with. Let's head into the room.",
              playerReply: "Sounds good. Let's head to the networking room.",
            },
          ],
          onComplete: () => {
            this.managerLeadsPlayer()
          },
        })
      },
    })
  }

  private managerLeadsPlayer(): void {
    this.interfaceOpen = true

    this.tweens.add({
      targets: this.manager,
      x: 760,
      y: 430,
      duration: 1900,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: this.player,
      x: 640,
      y: 515,
      duration: 1900,
      ease: 'Sine.easeInOut',

      onComplete: () => {
        /*
         * TEST MANAGER DIALOGUE 2.
         */
        this.showManagerConversation({
          turns: [
            {
              managerMessage:
                "One of the first things a consultant needs to learn is how to identify a good opportunity. That starts with talking to people and understanding what's happening in their business.",
              playerReply: 'What should I pay attention to when I speak with them?',
            },
            {
              managerMessage:
                "Pay attention to the challenges they're facing. What isn't working well? What are they trying to improve? Are there problems affecting their customers, employees, costs, or growth?",
              playerReply: 'So I should understand the problem before thinking about a solution?',
            },
            {
              managerMessage:
                "Exactly. You don't need to solve anything just yet. Listen and ask questions. A good consultant doesn't jump straight to a solution; they first try to understand the problem.",
              playerReply: "Got it. I'll focus on listening and asking useful questions.",
            },
            {
              managerMessage:
                "Use your notebook to keep track of anything useful. Move with the arrow keys or WASD and interact with people nearby. Once you've spoken to everyone, come back to me and we'll decide which opportunity is worth pursuing.",
              playerReply: "I'll speak with everyone and come back when I'm done.",
            },
          ],
          onComplete: () => {
            this.interfaceOpen = false
            this.controlsEnabled = true
          },
        })
      },
    })
  }

  private zoomToManager(): void {
    this.cameras.main.pan(this.manager.x + 155, this.manager.y, 650, 'Sine.easeInOut')

    this.cameras.main.zoomTo(1.75, 650, 'Sine.easeInOut')

    this.effects.showDialogueVignette(WORLD_WIDTH, WORLD_HEIGHT, this.cameras.main)
  }

  private restoreRoomCamera(onComplete: () => void): void {
    this.effects.hideDialogueVignette()

    this.cameras.main.pan(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 500, 'Sine.easeInOut')

    this.cameras.main.zoomTo(1, 500, 'Sine.easeInOut')

    this.time.delayedCall(520, onComplete)
  }

  private showManagerConversation({ turns, onComplete }: ManagerConversation): void {
    this.closeManagerPanel()

    if (turns.length === 0) {
      onComplete()
      return
    }

    this.interfaceOpen = true
    this.controlsEnabled = false
    this.zoomToManager()

    const panelWidth = 470
    const panelLeft = WORLD_WIDTH - panelWidth - 12
    const panelX = panelLeft + panelWidth / 2
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(6000)
    const panelBody = this.add
      .rectangle(panelX, WORLD_HEIGHT / 2, panelWidth, WORLD_HEIGHT - 28, 0xf4f7f9)
      .setStrokeStyle(4, 0x111111)
    const header = this.add
      .rectangle(panelX, 66, panelWidth, 90, 0xb98900)
      .setStrokeStyle(4, 0x111111)
    const title = this.add
      .text(panelX, 66, 'Your Manager', {
        color: '#111111',
        fontFamily: 'Arial',
        fontSize: '26px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // A DOM-based log gives the manager the same natural chat behaviour as the
    // client conversations: bubbles grow with their text and old turns remain
    // available through the scrollbar instead of being replaced on each step.
    const dialogueLog = this.add
      .dom(panelX, 344)
      .createFromHTML(
        `<div data-manager-dialogue-log role="log" aria-live="polite" style="width:430px;height:415px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;overflow-x:hidden;padding:10px 12px 18px;scroll-behavior:smooth;box-sizing:border-box;"></div>`
      )
      .setScrollFactor(0)
      .setDepth(6100)
    const logElement = dialogueLog.node.querySelector<HTMLDivElement>('[data-manager-dialogue-log]')

    if (!logElement) {
      dialogueLog.destroy()
      panel.destroy(true)
      throw new Error('Manager dialogue log could not be created.')
    }

    const appendMessage = (
      speaker: 'manager' | 'player',
      message: string,
      animate = true
    ): { row: HTMLDivElement; bubble: HTMLDivElement } => {
      const row = document.createElement('div')
      row.style.cssText = `display:flex;align-items:flex-start;gap:10px;flex-shrink:0;${speaker === 'player' ? 'flex-direction:row-reverse;' : ''}`

      const avatarFrame = document.createElement('div')
      avatarFrame.style.cssText =
        'width:52px;height:52px;flex:0 0 52px;border:3px solid #2c2c2a;border-radius:50%;overflow:hidden;background:#fff;box-sizing:border-box;'

      const avatar = document.createElement('img')
      avatar.src =
        speaker === 'manager'
          ? '/assets/characters/npcs/character-04.png'
          : '/assets/characters/npcs/character-03.png'
      avatar.alt = speaker === 'manager' ? 'Your Manager' : 'You'
      avatar.style.cssText = 'width:100%;height:100%;object-fit:cover;'
      avatarFrame.appendChild(avatar)

      const bubble = document.createElement('div')
      bubble.textContent = message
      bubble.style.cssText = `width:fit-content;max-width:320px;padding:12px 14px;border:2px solid ${speaker === 'player' ? '#7e9975' : '#a1a7ad'};border-radius:12px;background:${speaker === 'player' ? '#e8f0e5' : '#fff'};color:#2c2c2a;font:16px/1.4 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box;`

      row.append(avatarFrame, bubble)
      logElement.appendChild(row)

      // New turns slide into the conversation so pressing Send has an obvious
      // visual result. Replayed history skips the animation when the panel reopens.
      if (animate) {
        row.animate(
          [
            { opacity: 0, transform: `translateX(${speaker === 'player' ? '18px' : '-18px'})` },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        )
      }

      requestAnimationFrame(() => {
        logElement.scrollTop = logElement.scrollHeight
      })

      return { row, bubble }
    }

    // Re-render earlier manager turns when the manager walks to the networking
    // room and opens the panel again, keeping the full introduction reviewable.
    for (const entry of this.managerConversationHistory) {
      appendMessage(entry.speaker, entry.message, false)
    }

    let turnIndex = 0
    const showManagerTurn = (): void => {
      const turn = turns[turnIndex]!
      appendMessage('manager', turn.managerMessage)
      this.managerConversationHistory.push({
        speaker: 'manager',
        message: turn.managerMessage,
      })
    }

    showManagerTurn()

    const replyInput = this.add
      .dom(panelLeft + 205, WORLD_HEIGHT - 67)
      .createFromHTML(
        `<textarea name="managerScriptedReply" readonly rows="3" aria-label="Preloaded reply to manager" style="width:310px;height:76px;box-sizing:border-box;border:2px solid #d8c59e;border-radius:10px;padding:10px 14px;background:#ffffff;color:#2c2c2a;font:16px/1.3 Arial,sans-serif;outline:none;resize:none;overflow-y:auto;cursor:default;white-space:pre-wrap;"></textarea>`
      )
      .setScrollFactor(0)
      .setDepth(6100)
    const inputElement = replyInput.getChildByName(
      'managerScriptedReply'
    ) as HTMLTextAreaElement | null

    if (inputElement) {
      inputElement.value = turns[turnIndex]!.playerReply
    }

    const sendX = panelLeft + panelWidth - 47
    const sendY = WORLD_HEIGHT - 67
    const sendBackground = this.add
      .circle(sendX, sendY, 28, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({ useHandCursor: true })
    const sendTriangle = this.add.graphics()
    sendTriangle.fillStyle(0x2c2c2a)
    sendTriangle.fillTriangle(sendX - 7, sendY - 11, sendX - 7, sendY + 11, sendX + 11, sendY)

    let finishing = false
    let waitingForManager = false
    const sendPreloadedReply = (): void => {
      if (finishing || waitingForManager) return

      this.effects.pressButton(sendBackground)
      const reply = turns[turnIndex]!.playerReply
      appendMessage('player', reply)
      this.managerConversationHistory.push({ speaker: 'player', message: reply })
      turnIndex += 1

      if (turnIndex < turns.length) {
        waitingForManager = true
        sendBackground.disableInteractive()
        if (inputElement) {
          inputElement.value = ''
          inputElement.placeholder = 'Manager is replying...'
          inputElement.disabled = true
        }

        // A short animated typing beat makes the exchange readable and prevents
        // the next manager response from appearing in the same instant as Send.
        const typingMessage = appendMessage('manager', '•••')
        const typingAnimation = typingMessage.bubble.animate(
          [{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }],
          { duration: 700, iterations: Infinity, easing: 'ease-in-out' }
        )

        this.time.delayedCall(850, () => {
          typingAnimation.cancel()
          typingMessage.row.remove()
          showManagerTurn()
          waitingForManager = false
          sendBackground.setInteractive({ useHandCursor: true })

          if (inputElement) {
            inputElement.disabled = false
            inputElement.placeholder = ''
            inputElement.value = turns[turnIndex]!.playerReply
            inputElement.scrollTop = 0
          }
        })
        return
      }

      finishing = true
      if (inputElement) {
        inputElement.value = ''
        inputElement.placeholder = 'Conversation complete'
        inputElement.disabled = true
      }
      sendBackground.disableInteractive()

      // Leave the final player bubble on screen briefly before returning to the
      // room so the last Send still feels acknowledged rather than abrupt.
      this.time.delayedCall(750, () => {
        this.closeManagerPanel()
        this.restoreRoomCamera(onComplete)
      })
    }

    sendBackground.on('pointerdown', sendPreloadedReply)
    inputElement?.addEventListener('keydown', (event) => {
      event.stopPropagation()
      if (event.key === 'Enter') {
        event.preventDefault()
        sendPreloadedReply()
      }
    })

    panel.add([panelBody, header, title, sendBackground, sendTriangle])
    this.cameras.main.ignore([panel, replyInput, dialogueLog])
    this.managerPanel = panel
    this.managerReplyInput = replyInput
    this.managerDialogueLog = dialogueLog
    this.effects.animatePanel(panel)
    this.effects.addButtonHover(sendBackground)
  }

  private showManagerPanel({
    message,
    onContinue,
  }: {
    message: string
    onContinue: () => void
  }): void {
    this.closeManagerPanel()

    this.interfaceOpen = true
    this.controlsEnabled = false

    this.zoomToManager()

    const panelWidth = 470
    const panelLeft = WORLD_WIDTH - panelWidth - 12
    const panelX = panelLeft + panelWidth / 2

    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(6000)

    const panelBody = this.add
      .rectangle(panelX, WORLD_HEIGHT / 2, panelWidth, WORLD_HEIGHT - 28, 0xf4f7f9)
      .setStrokeStyle(4, 0x111111)

    const header = this.add
      .rectangle(panelX, 66, panelWidth, 90, 0xb98900)
      .setStrokeStyle(4, 0x111111)

    const title = this.add
      .text(panelX, 66, 'Your Manager', {
        color: '#111111',
        fontFamily: 'Arial',
        fontSize: '26px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const managerAvatarBorder = this.add.circle(panelLeft + 52, 160, 31, 0x2c2c2a)

    const managerAvatar = this.add.image(panelLeft + 52, 162, 'manager').setDisplaySize(47, 68)

    const managerBubble = this.add
      .rectangle(panelLeft + 270, 185, 330, 125, 0xf4f7f9)
      .setStrokeStyle(2, 0xa1a7ad)

    const managerText = this.add.text(managerBubble.x - 145, managerBubble.y - 48, message, {
      color: '#2c2c2a',
      fontFamily: 'Arial',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: {
        width: 290,
      },
    })

    const managerBubbleTop = 125
    const managerBubbleHeight = Math.max(85, Math.ceil(managerText.height) + 32)

    managerBubble.setSize(managerBubble.width, managerBubbleHeight)
    managerBubble.setY(managerBubbleTop + managerBubbleHeight / 2)
    managerAvatarBorder.setY(managerBubble.y)
    managerAvatar.setY(managerBubble.y + 2)
    managerText.setPosition(managerBubble.x - managerBubble.width / 2 + 20, managerBubbleTop + 16)

    const playerAvatarBorder = this.add
      .circle(panelLeft + panelWidth - 52, 385, 31, 0x2c2c2a)
      .setVisible(false)

    const playerAvatar = this.add
      .image(panelLeft + panelWidth - 52, 387, 'player')
      .setDisplaySize(47, 68)
      .setVisible(false)

    const playerBubble = this.add
      .rectangle(panelLeft + 190, 385, 260, 95, 0xe8f0e5)
      .setStrokeStyle(2, 0x7e9975)
      .setVisible(false)

    const playerReplyText = this.add
      .text(playerBubble.x - 110, playerBubble.y - 33, '', {
        color: '#2c2c2a',
        fontFamily: 'Arial',
        fontSize: '16px',
        wordWrap: {
          width: 220,
        },
      })
      .setVisible(false)

    const secondManagerAvatarBorder = this.add
      .circle(panelLeft + 52, 500, 31, 0x2c2c2a)
      .setVisible(false)

    const secondManagerAvatar = this.add
      .image(panelLeft + 52, 502, 'manager')
      .setDisplaySize(47, 68)
      .setVisible(false)

    const secondManagerBubble = this.add
      .rectangle(panelLeft + 270, 500, 330, 85, 0xf4f7f9)
      .setStrokeStyle(2, 0xa1a7ad)
      .setVisible(false)

    const secondManagerText = this.add
      .text(
        secondManagerBubble.x - 145,
        secondManagerBubble.y - 28,
        'Thanks! Your reply was received.',
        {
          color: '#2c2c2a',
          fontFamily: 'Arial',
          fontSize: '16px',
          wordWrap: {
            width: 290,
          },
        }
      )
      .setVisible(false)

    const replyInput = this.add
      .dom(panelLeft + 205, WORLD_HEIGHT - 78)
      .createFromHTML(
        `
          <input
            name="managerReply"
            maxlength="120"
            aria-label="Reply to manager"
            placeholder="Type your reply..."
            style="
              width: 310px;
              height: 54px;
              box-sizing: border-box;
              border: 2px solid #d8c59e;
              border-radius: 10px;
              padding: 0 14px;
              background: #ffffff;
              color: #2c2c2a;
              font-family: Arial, sans-serif;
              font-size: 16px;
              outline: none;
            "
          />
        `
      )
      .setScrollFactor(0)
      .setDepth(6100)

    const inputElement = replyInput.getChildByName('managerReply') as HTMLInputElement | null

    const sendX = panelLeft + panelWidth - 47
    const sendY = WORLD_HEIGHT - 78

    const sendBackground = this.add
      .circle(sendX, sendY, 28, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({
        useHandCursor: true,
      })

    const sendTriangle = this.add.graphics()

    sendTriangle.fillStyle(0x2c2c2a)

    sendTriangle.fillTriangle(sendX - 7, sendY - 11, sendX - 7, sendY + 11, sendX + 11, sendY)

    let replyHasBeenSent = false

    const sendOrContinue = () => {
      this.effects.pressButton(sendBackground)

      const reply = inputElement?.value.trim() ?? ''

      if (!replyHasBeenSent) {
        if (!reply) {
          replyInput.destroy()
          panel.destroy(true)

          this.managerPanel = undefined
          this.managerReplyInput = undefined

          this.restoreRoomCamera(onContinue)
          return
        }

        replyHasBeenSent = true

        playerReplyText.setText(reply).setVisible(true)

        const playerBubbleHeight = Math.max(70, Math.ceil(playerReplyText.height) + 32)
        const playerBubbleY = managerBubbleTop + managerBubbleHeight + 24 + playerBubbleHeight / 2

        playerBubble.setSize(playerBubble.width, playerBubbleHeight)
        playerBubble.setY(playerBubbleY)
        playerAvatarBorder.setY(playerBubbleY)
        playerAvatar.setY(playerBubbleY + 2)
        playerReplyText.setPosition(
          playerBubble.x - playerBubble.width / 2 + 20,
          playerBubbleY - playerBubbleHeight / 2 + 16
        )

        const secondManagerBubbleHeight = Math.max(70, Math.ceil(secondManagerText.height) + 32)
        const secondManagerBubbleY =
          playerBubbleY + playerBubbleHeight / 2 + 24 + secondManagerBubbleHeight / 2

        secondManagerBubble.setSize(secondManagerBubble.width, secondManagerBubbleHeight)
        secondManagerBubble.setY(secondManagerBubbleY)
        secondManagerAvatarBorder.setY(secondManagerBubbleY)
        secondManagerAvatar.setY(secondManagerBubbleY + 2)
        secondManagerText.setPosition(
          secondManagerBubble.x - secondManagerBubble.width / 2 + 20,
          secondManagerBubbleY - secondManagerBubbleHeight / 2 + 16
        )

        playerAvatarBorder.setVisible(true)
        playerAvatar.setVisible(true)
        playerBubble.setVisible(true)

        secondManagerAvatarBorder.setVisible(true)
        secondManagerAvatar.setVisible(true)
        secondManagerBubble.setVisible(true)
        secondManagerText.setVisible(true)

        this.effects.animateBubble([
          playerAvatarBorder,
          playerAvatar,
          playerBubble,
          playerReplyText,
        ])

        this.effects.animateBubble(
          [secondManagerAvatarBorder, secondManagerAvatar, secondManagerBubble, secondManagerText],
          300
        )

        if (inputElement) {
          inputElement.value = ''
          inputElement.placeholder = 'Click the triangle again to continue'
          inputElement.disabled = true
        }

        return
      }

      replyInput.destroy()
      panel.destroy(true)

      this.managerPanel = undefined
      this.managerReplyInput = undefined

      this.restoreRoomCamera(onContinue)
    }

    sendBackground.on('pointerdown', sendOrContinue)

    inputElement?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        sendOrContinue()
      }
    })

    panel.add([
      panelBody,
      header,
      title,
      managerAvatarBorder,
      managerAvatar,
      managerBubble,
      managerText,
      playerAvatarBorder,
      playerAvatar,
      playerBubble,
      playerReplyText,
      secondManagerAvatarBorder,
      secondManagerAvatar,
      secondManagerBubble,
      secondManagerText,
      sendBackground,
      sendTriangle,
    ])

    this.cameras.main.ignore([panel, replyInput])

    this.managerPanel = panel
    this.managerReplyInput = replyInput

    this.effects.animatePanel(panel)

    this.effects.animateBubble(
      [managerAvatarBorder, managerAvatar, managerBubble, managerText],
      250
    )

    this.effects.typeMessage(managerText, message, 450)

    this.effects.addButtonHover(sendBackground)
  }

  private closeManagerPanel(): void {
    this.managerReplyInput?.destroy()
    this.managerReplyInput = undefined

    this.managerDialogueLog?.destroy()
    this.managerDialogueLog = undefined

    this.managerPanel?.destroy(true)
    this.managerPanel = undefined
  }

  private handleClientCompleted(
  client: ClientDefinition,
  coveredInfoPoints: string[]
): void {
    const leadScore = Math.min(100, coveredInfoPoints.length * 15)

const relationshipState: 'cold' | 'warm' | 'qualified' =
  leadScore >= 75 ? 'qualified' : leadScore >= 45 ? 'warm' : 'cold'
    this.completedClientNames.add(client.name)
    const user = getClientAuth().currentUser
    if (user && client.personaId) {
  const sessionRef = doc(
    getSessionsCollection(),
    `${user.uid}_${client.personaId}_level1`
  )

  void setDoc(
    sessionRef,
    {
      id: sessionRef.id,
      uid: user.uid,
      personaId: client.personaId,
      level: 1,
      status: 'completed',
      leadScore,
      relationshipState,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      _schemaVersion: 1,
    },
    { merge: true }
  )
}
    this.completedClients.set(client.name, {
      name: client.name,
      personaId: client.personaId,
      texture: client.texture,
    })

    // Level 2 builds its laptop client list from the people the player actually met.
    // Saving only stable client details keeps this handoff independent from Phaser sprites.
    window.localStorage.setItem(
      LEVEL_ONE_MET_CLIENTS_KEY,
      JSON.stringify([...this.completedClients.values()])
    )

    if (this.levelCompletionStarted || this.completedClientNames.size < this.requiredClientCount) {
      return
    }

    this.levelCompletionStarted = true
    this.interfaceOpen = true
    this.controlsEnabled = false
    this.player.setVelocity(0)

    this.time.delayedCall(300, () => {
      this.showLevelCompleteManagerMessage()
    })
  }

  private showLevelCompleteManagerMessage(): void {
    this.zoomToManager()

    const panelWidth = 470
    const panelLeft = WORLD_WIDTH - panelWidth - 12
    const panelX = panelLeft + panelWidth / 2
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(6500)

    const panelBody = this.add
      .rectangle(panelX, WORLD_HEIGHT / 2, panelWidth, WORLD_HEIGHT - 28, 0xf4f7f9)
      .setStrokeStyle(4, 0x111111)
    const header = this.add
      .rectangle(panelX, 66, panelWidth, 90, 0xb98900)
      .setStrokeStyle(4, 0x111111)
    const title = this.add
      .text(panelX, 66, 'Your Manager', {
        color: '#111111',
        fontFamily: 'Arial',
        fontSize: '26px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const avatarBorder = this.add.circle(panelLeft + 52, 190, 31, 0x2c2c2a)
    const avatar = this.add.image(panelLeft + 52, 192, 'manager').setDisplaySize(47, 68)
    const bubbleWidth = 330
    const bubbleTop = 125
    const bubblePadding = 20
    const message = this.add.text(
      panelLeft + 105 + bubblePadding,
      bubbleTop + bubblePadding,
      "Great job! You've spoken with every available client and completed Find a Lead. Head to your office, review the people you met, and select the strongest opportunity. In Level 2, you'll begin planning your outreach to that client.",
      {
        color: '#2c2c2a',
        fontFamily: 'Arial',
        fontSize: '18px',
        lineSpacing: 7,
        wordWrap: { width: bubbleWidth - bubblePadding * 2 },
      }
    )
    // This final message is longer than the introductory manager prompts. Measure
    // the wrapped Phaser text before drawing its background so future copy changes
    // cannot spill below a fixed-height bubble again.
    const bubbleHeight = message.height + bubblePadding * 2
    const bubble = this.add
      .rectangle(
        panelLeft + 105 + bubbleWidth / 2,
        bubbleTop + bubbleHeight / 2,
        bubbleWidth,
        bubbleHeight,
        0xffffff
      )
      .setStrokeStyle(2, 0xa1a7ad)

    const continueButton = this.add
      .rectangle(panelX, WORLD_HEIGHT - 105, 220, 58, 0x5b8c4a)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({ useHandCursor: true })
    const continueText = this.add
      .text(panelX, WORLD_HEIGHT - 105, 'WALK TO THE DOOR', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    continueButton.on('pointerdown', () => {
      this.effects.pressButton(continueButton)
      panel.destroy(true)
      this.restoreRoomCamera(() => {
        this.interfaceOpen = false
        this.controlsEnabled = true
        this.showExitArrow()
      })
    })

    panel.add([
      panelBody,
      header,
      title,
      avatarBorder,
      avatar,
      bubble,
      message,
      continueButton,
      continueText,
    ])

    this.cameras.main.ignore(panel)
    this.effects.animatePanel(panel)
    this.effects.animateBubble([avatarBorder, avatar, bubble, message], 250)
    this.effects.addButtonHover(continueButton)
  }

  private showExitArrow(): void {
    if (this.exitArrow) return

    const arrow = this.add.container(WORLD_WIDTH / 2, FLOOR_BOTTOM - 82).setDepth(5300)
    const label = this.add
      .text(0, -35, 'EXIT TO YOUR OFFICE', {
        color: '#ffffff',
        backgroundColor: '#1f4f78',
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: 'bold',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
    const arrowGraphic = this.add.graphics()

    arrowGraphic.fillStyle(0xc98a3e)
    arrowGraphic.lineStyle(4, 0x2c2c2a)
    arrowGraphic.fillTriangle(-24, 0, 24, 0, 0, 34)
    arrowGraphic.strokeTriangle(-24, 0, 24, 0, 0, 34)
    arrow.add([label, arrowGraphic])

    this.tweens.add({
      targets: arrow,
      y: FLOOR_BOTTOM - 67,
      duration: 650,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    this.interfaceCamera.ignore(arrow)
    this.exitArrow = arrow
    this.exitReady = true
  }

  private checkForLevelExit(): void {
    if (!this.exitReady) return

    const body = this.player.body as Phaser.Physics.Arcade.Body
    const withinElevator =
      this.player.x >= WORLD_WIDTH / 2 - 185 && this.player.x <= WORLD_WIDTH / 2 + 185

    if (!withinElevator || body.bottom < FLOOR_BOTTOM - 4) return

    this.exitReady = false
    this.controlsEnabled = false
    this.player.setVelocity(0)

    window.localStorage.setItem(LEVEL_ONE_COMPLETION_KEY, 'true')
    window.localStorage.setItem('ibm-level-one-unlocked', 'true')
    window.location.assign('/dashboard?completed=level-1')
  }

  private updateMovement(): void {
    let velocityX = 0
    let velocityY = 0

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -PLAYER_SPEED
    }

    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = PLAYER_SPEED
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -PLAYER_SPEED
    }

    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = PLAYER_SPEED
    }

    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.7071
      velocityY *= 0.7071
    }

    this.player.setVelocity(velocityX, velocityY)

    this.effects.updateWalking(this.player, velocityX !== 0 || velocityY !== 0, this.time.now)
  }

  private updateCharacterDepths(): void {
    this.player.setDepth(this.player.y)
    this.manager.setDepth(this.manager.y)
  }

  private openHomeMenu(): void {
    if (this.menuPanel) {
      return
    }

    const previousInterfaceState = this.interfaceOpen
    const previousControlState = this.controlsEnabled

    this.interfaceOpen = true
    this.controlsEnabled = false

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
        this.interfaceOpen = previousInterfaceState
        this.controlsEnabled = previousControlState
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
      .setInteractive({
        useHandCursor: true,
      })

    this.effects.addButtonHover(background)

    const text = this.add
      .text(0, 0, label, {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '21px',
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.effects.pressButton(background)
      onClick()
    })

    container.add([background, text])

    return container
  }

  private openNotebook(): void {
    if (this.notebookPanel) {
      return
    }

    const previousInterfaceState = this.interfaceOpen
    const previousControlState = this.controlsEnabled

    this.interfaceOpen = true
    this.controlsEnabled = false

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
        `
          <textarea
            name="levelOneNotes"
            maxlength="1000"
            aria-label="Level 1 consultant notes"
            style="
              width: 365px;
              height: 430px;
              resize: none;
              border: 0;
              padding: 4px 8px;
              background-color: #f4f7f9;
              background-image:
                repeating-linear-gradient(
                  to bottom,
                  transparent 0,
                  transparent 34px,
                  #222222 35px,
                  #222222 37px
                );
              color: #2c2c2a;
              font-family: Arial, sans-serif;
              font-size: 17px;
              line-height: 37px;
              outline: none;
              overflow-y: auto;
            "
          ></textarea>
        `
      )
      .setScrollFactor(0)
      .setDepth(7300)

    const textarea = input.getChildByName('levelOneNotes') as HTMLTextAreaElement | null

    if (textarea) {
      textarea.value = this.notes
    }

    const saveX = notebookX + notebookWidth / 2 - 25
    const saveY = notebookY + notebookHeight / 2 + 28

    const saveButton = this.add
      .circle(saveX, saveY, 25, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({
        useHandCursor: true,
      })

    this.effects.addButtonHover(saveButton)

    const saveTriangle = this.add.graphics()

    saveTriangle.fillStyle(0x2c2c2a)

    saveTriangle.fillTriangle(saveX - 7, saveY - 11, saveX - 7, saveY + 11, saveX + 11, saveY)

    const saveNotebook = () => {
      if (textarea) {
        this.notes = textarea.value
      }

      input.destroy()
      panel.destroy(true)

      this.notebookPanel = undefined
      this.notebookInput = undefined

      this.interfaceOpen = previousInterfaceState
      this.controlsEnabled = previousControlState
    }

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
}

export default LevelOneScene
