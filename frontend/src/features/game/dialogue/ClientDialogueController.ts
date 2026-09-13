import Phaser from 'phaser'
import { LevelOneEffects } from '../effects/LevelOneEffects'
import { requestPersonaReply, type PersonaConversationMessage } from './personaDialogue'
import {
  GUIDED_WRAP_TURN,
  MAXIMUM_CONVERSATION_TURNS,
  SUGGESTED_CLOSING_REPLY,
} from './conversationCompletion'

export type ClientDefinition = {
  name: string
  texture: string
  personaId?: string
  responseMode: 'llm' | 'hardcoded'
  hardcodedReply?: string
  hardcodedReplies?: readonly string[]
  sprite: Phaser.GameObjects.Image
}

type ClientDialogueControllerOptions = {
  scene: Phaser.Scene
  player: Phaser.Physics.Arcade.Image
  clients: ClientDefinition[]
  effects: LevelOneEffects
  mainCamera: Phaser.Cameras.Scene2D.Camera
  interfaceCamera: Phaser.Cameras.Scene2D.Camera
  worldWidth: number
  worldHeight: number
  onOpen: () => void
  onClose: () => void
  onClientCompleted: (client: ClientDefinition, coveredInfoPoints: string[]) => void
}

const INTERACTION_DISTANCE = 185

export class ClientDialogueController {
  private readonly scene: Phaser.Scene
  private readonly player: Phaser.Physics.Arcade.Image
  private readonly clients: ClientDefinition[]
  private readonly effects: LevelOneEffects

  private readonly mainCamera: Phaser.Cameras.Scene2D.Camera
  private readonly interfaceCamera: Phaser.Cameras.Scene2D.Camera

  private readonly worldWidth: number
  private readonly worldHeight: number

  private readonly onOpen: () => void
private readonly onClose: () => void
private readonly onClientCompleted: (
  client: ClientDefinition,
  coveredInfoPoints: string[]
) => void
  private readonly interactionKey: Phaser.Input.Keyboard.Key
  private readonly proximityPrompt: Phaser.GameObjects.Container

  private activeClient?: ClientDefinition
  private panel?: Phaser.GameObjects.Container
  private replyInput?: Phaser.GameObjects.DOMElement
  private dialogueLog?: Phaser.GameObjects.DOMElement
  private activeConversationCompleted = false

  constructor({
    scene,
    player,
    clients,
    effects,
    mainCamera,
    interfaceCamera,
    worldWidth,
    worldHeight,
    onOpen,
    onClose,
    onClientCompleted,
  }: ClientDialogueControllerOptions) {
    this.scene = scene
    this.player = player
    this.clients = clients
    this.effects = effects

    this.mainCamera = mainCamera
    this.interfaceCamera = interfaceCamera

    this.worldWidth = worldWidth
    this.worldHeight = worldHeight

    this.onOpen = onOpen
    this.onClose = onClose
    this.onClientCompleted = onClientCompleted

    const keyboard = this.scene.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable for client interaction.')
    }

    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.proximityPrompt = this.createProximityPrompt()

    this.interfaceCamera.ignore(this.proximityPrompt)
  }

  update(): void {
    if (this.panel || this.replyInput) {
      this.hidePrompt()
      return
    }

    const closestClient = this.findClosestClient()

    if (!closestClient) {
      this.activeClient = undefined
      this.hidePrompt()
      return
    }

    this.activeClient = closestClient

    this.proximityPrompt
      .setPosition(closestClient.sprite.x, closestClient.sprite.y - 125)
      .setVisible(true)

    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.openDialogue(closestClient)
    }
  }

  hidePrompt(): void {
    this.proximityPrompt.setVisible(false)
  }

  destroy(): void {
    this.replyInput?.destroy()
    this.dialogueLog?.destroy()
    this.panel?.destroy(true)
    this.proximityPrompt.destroy(true)

    this.replyInput = undefined
    this.dialogueLog = undefined
    this.panel = undefined
    this.activeClient = undefined
  }

  private findClosestClient(): ClientDefinition | undefined {
    let closestClient: ClientDefinition | undefined
    let closestDistance = INTERACTION_DISTANCE

    for (const client of this.clients) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        client.sprite.x,
        client.sprite.y
      )

      if (distance <= closestDistance) {
        closestClient = client
        closestDistance = distance
      }
    }

    return closestClient
  }

  private createProximityPrompt(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0).setDepth(5200).setVisible(false)

    const background = this.scene.add
      .rectangle(0, 0, 175, 45, 0x5b8c4a, 0.96)
      .setStrokeStyle(3, 0x111111)

    const keyboardKey = this.scene.add
      .rectangle(-62, 0, 29, 29, 0xf4f7f9)
      .setStrokeStyle(2, 0x111111)

    const keyText = this.scene.add
      .text(-62, 0, 'E', {
        color: '#111111',
        fontFamily: 'Arial',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const promptText = this.scene.add
      .text(18, 0, 'Talk', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    container.add([background, keyboardKey, keyText, promptText])

    return container
  }

  private openDialogue(client: ClientDefinition): void {
    if (this.panel) {
      return
    }

    this.hidePrompt()
    this.onOpen()
    this.activeConversationCompleted = false

    this.player.setVelocity(0)

    this.mainCamera.pan(client.sprite.x + 175, client.sprite.y, 600, 'Sine.easeInOut')

    this.mainCamera.zoomTo(2.05, 600, 'Sine.easeInOut')

    this.effects.showDialogueVignette(this.worldWidth, this.worldHeight, this.mainCamera)

    this.createDialoguePanel(client)
  }

  private createDialoguePanel(client: ClientDefinition): void {
    const panelWidth = 470
    const panelLeft = this.worldWidth - panelWidth - 12
    const panelX = panelLeft + panelWidth / 2

    const panel = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(6500)

    const panelBody = this.scene.add
      .rectangle(panelX, this.worldHeight / 2, panelWidth, this.worldHeight - 28, 0xf4f7f9)
      .setStrokeStyle(4, 0x111111)

    const header = this.scene.add
      .rectangle(panelX, 66, panelWidth, 90, 0xb98900)
      .setStrokeStyle(4, 0x111111)

    const title = this.scene.add
      .text(panelX, 66, client.name, {
        color: '#111111',
        fontFamily: 'Arial',
        fontSize: '27px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const dialogueLog = this.scene.add
      .dom(panelX, this.worldHeight / 2 + 8)
      .createFromHTML(
        `<div data-client-dialogue-log role="log" aria-live="polite" style="width: 430px; height: 470px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; overflow-x: hidden; padding: 10px 12px 18px; box-sizing: border-box;"></div>`
      )
      .setScrollFactor(0)
      .setDepth(6600)
    const logElement = dialogueLog.node.querySelector<HTMLDivElement>('[data-client-dialogue-log]')

    if (!logElement) {
      dialogueLog.destroy()
      panel.destroy(true)
      throw new Error('Client dialogue log could not be created.')
    }

    const addMessage = (speaker: 'client' | 'player', message: string): HTMLDivElement => {
      const row = document.createElement('div')
      row.style.cssText = `display:flex;align-items:flex-start;gap:10px;flex-shrink:0;${speaker === 'player' ? 'flex-direction:row-reverse;' : ''}`

      const avatarFrame = document.createElement('div')
      avatarFrame.style.cssText =
        'width:52px;height:52px;flex:0 0 52px;border:3px solid #2c2c2a;border-radius:50%;overflow:hidden;background:#fff;box-sizing:border-box;'

      const avatar = document.createElement('img')
      avatar.src =
        speaker === 'player'
          ? '/assets/characters/npcs/character-03.png'
          : client.texture === 'good-client'
            ? '/assets/characters/npcs/character-01.png'
            : '/assets/characters/npcs/character-02.png'
      avatar.alt = speaker === 'player' ? 'You' : client.name
      avatar.style.cssText = 'width:100%;height:100%;object-fit:cover;'
      avatarFrame.appendChild(avatar)

      const bubble = document.createElement('div')
      bubble.textContent = message
      bubble.style.cssText = `width:fit-content;max-width:320px;padding:12px 14px;border:2px solid ${speaker === 'player' ? '#7e9975' : '#a1a7ad'};border-radius:12px;background:${speaker === 'player' ? '#e8f0e5' : '#fff'};color:#2c2c2a;font:16px/1.4 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box;`

      row.append(avatarFrame, bubble)
      logElement.appendChild(row)
      logElement.scrollTop = logElement.scrollHeight

      return bubble
    }

    addMessage('client', 'Hi!')

    const replyInput = this.scene.add
      .dom(panelLeft + 205, this.worldHeight - 78)
      .createFromHTML(
        `
          <input
            name="clientReply"
            maxlength="220"
            aria-label="Reply to ${client.name}"
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
      .setDepth(6600)

    const inputElement = replyInput.getChildByName('clientReply') as HTMLInputElement | null

    const sendX = panelLeft + panelWidth - 47
    const sendY = this.worldHeight - 78

    const sendButton = this.scene.add
      .circle(sendX, sendY, 28, 0xe6e8e9)
      .setStrokeStyle(4, 0x111111)
      .setInteractive({
        useHandCursor: true,
      })

    const sendTriangle = this.scene.add.graphics()

    sendTriangle.fillStyle(0x2c2c2a)

    sendTriangle.fillTriangle(sendX - 7, sendY - 11, sendX - 7, sendY + 11, sendX + 11, sendY)

    let conversationComplete = false
    let requestInProgress = false
    let hardcodedReplyIndex = 0
    const conversationHistory: PersonaConversationMessage[] = []
    // Retain confirmed facts for this open conversation. Sending them on the next
    // request prevents a fluctuating coverage pass from erasing earned progress.
    const coveredInfoPoints = new Set<string>()

    const sendOrClose = async () => {
      this.effects.pressButton(sendButton)

      // Once either dialogue mode reports completion, the same control closes the
      // panel. Completion is recorded only on close so Level 1 progression remains
      // aligned with what the player has actually finished viewing.
      if (conversationComplete) {
        if (!requestInProgress) {
          this.closeDialogue([...coveredInfoPoints])
        }
        return
      }

      const reply = inputElement?.value.trim() ?? ''

      if (!reply || requestInProgress) {
        inputElement?.focus()
        return
      }

      requestInProgress = true
      addMessage('player', reply)

      // The API can return the local fallback before its server-side completion
      // check runs (for example when no API key is available). Preserve the agreed
      // explicit exit in the UI as well so "bye for now" always ends the client.
      const playerSaidByeForNow = /^bye for now[.!?]*$/i.test(reply)

      if (inputElement) {
        inputElement.value = ''
        inputElement.disabled = true
        inputElement.placeholder = 'Waiting for client response...'
      }

      const pendingClientBubble = addMessage('client', 'Thinking...')

      if (client.responseMode === 'hardcoded') {
        // Scripted clients retain every authored response instead of ending after
        // the first message. The conversation completes after the final response.
        const hardcodedReplies = client.hardcodedReplies ?? [
          client.hardcodedReply ?? 'Hi, nice to meet you!',
        ]
        const hardcodedResponse =
          hardcodedReplies[hardcodedReplyIndex] ??
          hardcodedReplies.at(-1) ??
          'Hi, nice to meet you!'

        pendingClientBubble.textContent = hardcodedResponse
        hardcodedReplyIndex += 1
        conversationComplete = hardcodedReplyIndex >= hardcodedReplies.length
      } else if (!client.personaId) {
        pendingClientBubble.textContent = 'Unable to load client response.'
      } else {
        // The complete history is sent on every turn. Ibrahim's API decides whether
        // all required information has been covered, while the local cap guarantees
        // the UI cannot remain open indefinitely if that completion check misses.
        const result = await requestPersonaReply({
          message: reply,
          personaId: client.personaId,
          history: conversationHistory,
          coveredInfoPoints: [...coveredInfoPoints],
        })

        pendingClientBubble.textContent = result.reply
        conversationHistory.push(
          { role: 'player', content: reply },
          { role: 'persona', content: result.reply }
        )
        result.coveredInfoPoints.forEach((point) => coveredInfoPoints.add(point))

        const turnCount = conversationHistory.filter((message) => message.role === 'player').length
        // The server normally owns readiness. Mirrored local turn guards ensure a
        // failed API cannot trap the player inside an infinite conversation.
        const readyToClose = result.readyToClose || turnCount >= GUIDED_WRAP_TURN
        conversationComplete =
          playerSaidByeForNow ||
          result.conversationComplete ||
          turnCount >= MAXIMUM_CONVERSATION_TURNS

        if (!conversationComplete && inputElement) {
          if (readyToClose) {
            // Prefill instead of auto-send so the player controls the final action
            // and can edit the neutral closing wording before submitting it.
            inputElement.value = result.suggestedClosingReply ?? SUGGESTED_CLOSING_REPLY
          }
          inputElement.placeholder = result.hint ?? 'Type your next reply...'
        }
      }

      logElement.scrollTop = logElement.scrollHeight
      this.activeConversationCompleted = conversationComplete
      requestInProgress = false

      if (inputElement) {
        inputElement.disabled = conversationComplete
        if (conversationComplete) {
          inputElement.placeholder = 'Click the triangle again to close'
        }

        if (!conversationComplete) {
          inputElement.focus()
        }
      }
    }

    sendButton.on('pointerdown', sendOrClose)

    inputElement?.addEventListener('keydown', (event) => {
      event.stopPropagation()

      if (event.key === 'Enter') {
        event.preventDefault()
        sendOrClose()
      }
    })

    panel.add([panelBody, header, title, sendButton, sendTriangle])

    /*
     * Dialogue stays fixed while the room camera zooms.
     */
    this.mainCamera.ignore([panel, replyInput, dialogueLog])

    this.panel = panel
    this.replyInput = replyInput
    this.dialogueLog = dialogueLog

    this.effects.animatePanel(panel)

    this.effects.addButtonHover(sendButton)
  }

  private closeDialogue(coveredInfoPoints: string[] = []): void {
    const completedClient = this.activeConversationCompleted ? this.activeClient : undefined

    this.replyInput?.destroy()
    this.replyInput = undefined

    this.dialogueLog?.destroy()
    this.dialogueLog = undefined

    this.panel?.destroy(true)
    this.panel = undefined

    this.activeClient = undefined
    this.activeConversationCompleted = false

    this.effects.hideDialogueVignette()

    this.mainCamera.pan(this.worldWidth / 2, this.worldHeight / 2, 500, 'Sine.easeInOut')

    this.mainCamera.zoomTo(1, 500, 'Sine.easeInOut')

    this.scene.time.delayedCall(520, () => {
      this.onClose()

      if (completedClient) {
  this.onClientCompleted(completedClient, coveredInfoPoints)
}
    })
  }
}
