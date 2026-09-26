import Phaser from 'phaser'

export type OutreachClient = {
  name: string
  personaId?: string
  texture: string
  portrait?: string
}

// Level 4 reads this compact handoff rather than guessing which client the player
// chose. Keeping the portrait path also lets future clients flow through cleanly.
export const SELECTED_OUTREACH_CLIENT_KEY = 'ibm-selected-outreach-client'

export type OutreachEmailSubmission = {
  client: OutreachClient
  to: string
  subject: string
  cc: string
  bcc: string
  body: string
}

type LaptopStep = 'clients' | 'google' | 'results' | 'linkedin' | 'contact' | 'composer' | 'sent'

type LaptopFlowOptions = {
  clients: OutreachClient[]
  onClose: () => void
  onEmailSent: (submission: OutreachEmailSubmission) => void
}

const CLIENT_DETAILS: Record<
  string,
  { role: string; company: string; location: string; email: string; phone: string }
> = {
  'Sarah Chen': {
    role: 'Chief Operating Officer',
    company: 'ACMD Manufacturing',
    location: 'Greater Melbourne Area',
    email: 'sarah.chen@acmd.example',
    phone: '+61 3 9000 0142',
  },
  'David Palte': {
    role: 'Chief Technology Officer',
    company: 'Meridian Retail Group',
    location: 'Greater Melbourne Area',
    email: 'david.palte@meridian.example',
    phone: '+61 3 9000 0186',
  },
}

const PROGRESS_INDEX: Record<LaptopStep, number> = {
  clients: 0,
  google: 1,
  results: 1,
  linkedin: 2,
  contact: 3,
  composer: 4,
  sent: 5,
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character
  )
}

function detailsFor(client: OutreachClient) {
  return (
    CLIENT_DETAILS[client.name] ?? {
      role: 'Business leader',
      company: 'Client organisation',
      location: 'Greater Melbourne Area',
      email: `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@client.example`,
      phone: '+61 3 9000 0100',
    }
  )
}

function portraitFor(client: OutreachClient): string {
  if (client.portrait) return client.portrait
  if (client.texture === 'good-client') return 'character-01.png'
  if (client.texture === 'bad-client') return 'character-02.png'
  return 'character-04.png'
}

const CLIENT_BRIEFS: Record<
  string,
  { businessNeed: string; impact: string; desiredOutcome: string }
> = {
  'test-level-1': {
    businessNeed:
      'ACMD Manufacturing is experiencing supply-chain delays caused by disconnected systems and limited operational visibility.',
    impact:
      'The delays are causing missed delivery targets and customer compensation while the business continues to grow.',
    desiredOutcome:
      'Sarah wants better operational visibility without a disruptive, long-term replacement of every existing system.',
  },
  'test-level-2': {
    businessNeed:
      'Customer information is split across store, online, mobile and loyalty systems, so teams do not share one reliable customer view.',
    impact:
      'The fragmented data prevents dependable churn, customer and promotion analysis as the company prepares to expand.',
    desiredOutcome:
      'David wants a practical solution that unifies the customer view and demonstrates value quickly.',
  },
}

/**
 * Checks for common outreach building blocks while the player types. This is
 * intentionally only writing guidance: Groq still assesses whether the final
 * email uses these elements meaningfully and awards the actual score.
 */
function emailChecklist(body: string, subject: string, client: OutreachClient) {
  const content = `${subject} ${body}`.toLowerCase()
  const clientDetails = detailsFor(client)
  const firstName = client.name.split(' ')[0]?.toLowerCase() ?? ''

  return [
    {
      label: 'Add a greeting',
      complete: /\b(hi|hello|dear|good morning|good afternoon)\b/i.test(body),
    },
    {
      label: 'Mention the client or company',
      complete:
        (firstName.length > 0 && content.includes(firstName)) ||
        content.includes(clientDetails.company.toLowerCase()),
    },
    {
      label: 'Reference their business need',
      complete:
        /\b(problem|challenge|priority|operation|customer|data|system|inventory|delay|visibility)\w*\b/i.test(
          content
        ),
    },
    {
      label: 'Explain the proposed value',
      complete:
        /\b(help|improve|connect|integrat|solution|enable|reduce|streamline|support|value)\w*\b/i.test(
          content
        ),
    },
    {
      label: 'Include a clear next step',
      complete: /\b(meeting|call|discuss|available|availability|next week|follow up)\b/i.test(
        content
      ),
    },
    {
      label: 'Add a professional sign-off',
      complete: /\b(kind regards|regards|sincerely|best|thank you|thanks)\b/i.test(body),
    },
  ]
}

/**
 * Builds the interactive content displayed inside the Level 2 laptop frame.
 *
 * This flow owns the UX card only: selecting a lead, researching them, copying
 * contact details and composing an email. The grading request, lunch transition
 * and results screens intentionally remain outside this module for the next card.
 */
export function createOutreachLaptopFlow(
  scene: Phaser.Scene,
  options: LaptopFlowOptions
): Phaser.GameObjects.DOMElement {
  let step: LaptopStep = 'clients'
  let selectedClient: OutreachClient | undefined
  let emailCopied = false
  let furthestProgressIndex = 0
  let pendingSubmission: OutreachEmailSubmission | undefined
  let submissionStarted = false

  const gameObject = scene.add
    .dom(720, 360)
    .createFromHTML('<div data-outreach-laptop></div>')
    .setScrollFactor(0)
    .setDepth(7050)
  const root = gameObject.node.querySelector<HTMLDivElement>('[data-outreach-laptop]')

  if (!root) throw new Error('The Level 2 laptop interface could not be created.')

  const renderProgress = (): string => {
    const labels = [
      'Select client',
      'Search Google',
      'Open LinkedIn',
      'Copy email',
      'Write outreach',
    ]
    // Google home/results are one research task, while opening the profile and
    // copying contact details advance independently. The explicit mapping keeps
    // screen count separate from the five checklist items in the wireframe.
    const activeIndex = PROGRESS_INDEX[step]
    furthestProgressIndex = Math.max(furthestProgressIndex, activeIndex)
    const progressSteps: LaptopStep[] = ['clients', 'google', 'linkedin', 'contact', 'composer']

    return labels
      .map((label, index) => {
        const complete = index < activeIndex
        const active = index === activeIndex
        const available = index <= furthestProgressIndex && (index === 0 || selectedClient)
        return `<li class="l2-task ${complete ? 'done' : ''} ${active ? 'active' : ''}"><button type="button" data-progress-step="${progressSteps[index]}" ${available ? '' : 'disabled'}><span>${complete ? '✓' : index + 1}</span>${label}</button></li>`
      })
      .join('')
  }

  const shell = (content: string, action = '', laptopAction = '', screenAction = ''): string => `
    <style>
      .l2-shell{width:1320px;height:620px;display:grid;grid-template-columns:830px 450px;align-items:start;gap:40px;background:transparent;font-family:Arial,sans-serif;color:#2c2c2a;box-sizing:border-box}
      .l2-shell,.l2-shell *{cursor:default}.l2-shell input,.l2-shell textarea{cursor:text;caret-color:#111}.l2-shell button:not(:disabled),.l2-shell [data-client]{cursor:pointer}
      .l2-laptop{position:relative;height:610px;filter:drop-shadow(0 22px 24px #0007)}
      .l2-screen{position:relative;height:535px;border:18px solid #18191a;border-bottom-width:25px;border-radius:18px 18px 7px 7px;background:#18191a;box-sizing:border-box}
      .l2-screen::before{content:"";position:absolute;z-index:8;top:-12px;left:50%;width:8px;height:8px;transform:translateX(-50%);border-radius:50%;background:#62676b;box-shadow:0 0 0 2px #080808}
      .l2-display{position:relative;width:100%;height:100%;overflow:hidden;background:#f4f7f9}
      .l2-base{position:absolute;left:-18px;right:-18px;top:530px;height:25px;border:6px solid #18191a;border-top-width:8px;border-radius:2px 2px 13px 13px;background:#35383a;clip-path:polygon(2% 0,98% 0,100% 76%,98% 100%,2% 100%,0 76%)}
      .l2-content{height:100%;padding:28px;box-sizing:border-box;overflow:auto}
      .l2-side{display:flex;height:590px;flex-direction:column;border:7px solid #1f1f1f;border-radius:14px;background:#f4f7f9;overflow:hidden;box-shadow:inset 0 0 0 10px #d0e2ff,0 18px 40px #0005}
      .l2-side-head{height:88px;flex:0 0 88px;background:#d0e2ff;border-bottom:5px solid #1f1f1f}
      .l2-side-body{display:flex;min-height:0;flex:1;flex-direction:column;margin:0 10px 10px;padding:28px 26px 22px;background:#f4f7f9}
      .l2-tasks{display:flex;flex-direction:column;gap:17px;margin:0;padding:0;list-style:none}
      .l2-task{display:flex;color:#81868a}.l2-task button{display:flex;width:100%;align-items:center;gap:11px;border:0;background:transparent;padding:0;color:inherit;font:700 15px Arial,sans-serif;text-align:left}.l2-task button:not(:disabled){cursor:pointer}.l2-task button:disabled{cursor:default}
      .l2-task span{display:grid;width:32px;height:32px;place-items:center;border:3px solid #8d9296;border-radius:50%;background:#fff}
      .l2-task.active{color:#1f4f78}.l2-task.active span{border-color:#1f4f78;background:#d9effa}.l2-task.done{color:#002d9c}.l2-task.done span{border-color:#002d9c;background:#d0e2ff}
      .l2-action{margin-top:auto;min-height:70px}.l2-button{border:3px solid #2c2c2a;border-radius:10px;background:#002d9c;color:#fff;padding:13px 20px;font-size:17px;font-weight:700;box-shadow:5px 6px 0 #2c2c2a;cursor:pointer}.l2-button:hover{transform:translateY(-2px)}.l2-button:disabled{border-color:#c8b998;background:#edf5ff;color:#96999c;box-shadow:none;cursor:not-allowed}
      .l2-close{position:absolute;right:14px;top:12px;z-index:5;width:42px;height:42px;border:3px solid #2c2c2a;border-radius:50%;background:#fff;font-size:27px;cursor:pointer}
      .l2-title{margin:0 0 8px;color:#1f4f78;font-size:28px}.l2-subtitle{margin:0 0 24px;color:#676c70;font-size:16px}
      .l2-cards{display:grid;height:100%;grid-template-columns:repeat(2,1fr);align-items:center;gap:55px;padding:20px 62px;box-sizing:border-box}.l2-card{display:flex;height:450px;flex-direction:column;align-items:center;justify-content:center;border:0;background:transparent;padding:0;cursor:pointer}.l2-card.selected .l2-portrait{border-width:8px;border-color:#1f4f78;background:#e7f2f8}.l2-portrait{display:grid;width:205px;height:300px;place-items:center;border:5px solid #1f1f1f;background:#f4f7f9;box-sizing:border-box}.l2-card img{height:255px;max-width:190px;object-fit:contain}.l2-card-copy{width:205px;margin-top:14px;border:4px solid #1f1f1f;border-radius:14px;background:#cbd0d4;padding:9px 8px;box-sizing:border-box}.l2-card h3{margin:0 0 4px;font-size:19px}.l2-card p{margin:2px;text-align:center;color:#505458;font-size:13px}
      .l2-browser{height:100%;background:#fff}.l2-browser-top{height:51px;border-bottom:1px solid #aeb4b8;background:#eef1f3}.l2-browserbar{display:flex;align-items:center;gap:12px;border-bottom:1px solid #aeb4b8;background:#eef1f3;padding:9px 18px;color:#6f7579;font-size:20px}.l2-url,.l2-input{width:100%;border:1px solid #9da4aa;border-radius:22px;background:#fff;padding:10px 16px;font-size:15px;box-sizing:border-box}.l2-tabs{height:30px;border-bottom:1px solid #c2c7ca;background:#eef1f3;background-image:repeating-linear-gradient(90deg,transparent 0 90px,#899095 90px 92px)}
      .l2-google{display:flex;height:360px;flex-direction:column;align-items:center;justify-content:center}.l2-google-logo{margin-bottom:28px;font-size:70px;font-weight:600;letter-spacing:-6px}.g-blue{color:#4285f4}.g-red{color:#ea4335}.g-yellow{color:#fbbc05}.g-green{color:#002d9c}.l2-searchbox{display:flex;width:545px;align-items:center;gap:13px;border:1px solid #d7dadd;border-radius:28px;background:#fff;padding:5px 9px 5px 17px;box-shadow:0 2px 7px #0002}.l2-searchbox .l2-input{border:0;padding:9px 0;outline:0}.l2-search-icon{border:0;background:none;font-size:19px;cursor:pointer}.l2-search-tools{display:flex;gap:8px;color:#4e5357;font-size:18px}.l2-shortcuts{display:flex;max-width:570px;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:25px}.l2-chip{border:1px solid #d5d9dc;border-radius:20px;background:#f7f8f9;padding:8px 14px;color:#62676b;font-size:13px}.l2-chip:disabled{cursor:default;opacity:.78}
      .l2-results{height:100%;background:#fff}.l2-results-head{padding:15px 28px 8px;border-bottom:1px solid #e0e3e5}.l2-results-search{display:flex;align-items:center;gap:12px}.l2-mini-logo{font-size:22px;font-weight:700}.l2-results-search .l2-input{max-width:520px;box-shadow:0 1px 5px #0002}.l2-result-tabs{display:flex;gap:25px;margin:12px 0 0 42px;color:#63686c;font-size:13px}.l2-result-tabs strong{border-bottom:3px solid #1a73e8;padding-bottom:9px;color:#1a73e8}.l2-results-body{padding:20px 70px}.l2-result{display:block;width:570px;border:0;background:#fff;padding:0;text-align:left;cursor:pointer}.l2-result:hover h3{text-decoration:underline}.l2-result-source{display:flex;align-items:center;gap:9px;color:#42464a;font-size:13px}.l2-li-badge{display:grid;width:24px;height:24px;place-items:center;border-radius:3px;background:#0a66c2;color:#fff;font-weight:800}.l2-result h3{margin:7px 0;color:#1a0dab;font-size:20px;font-weight:500}.l2-result p{margin:6px 0;color:#4f5356;font-size:14px;line-height:1.45}.l2-sitelinks{display:grid;width:520px;grid-template-columns:1fr 1fr;gap:0 32px;margin-top:18px}.l2-sitelinks div{border-top:1px solid #d7dadd;padding:10px 0;color:#1a0dab;font-size:13px}
      .l2-linkedin{height:100%;background:#f3f2ef}.l2-li-nav{display:flex;height:54px;align-items:center;gap:20px;border-bottom:1px solid #d7d7d7;background:#fff;padding:0 20px;color:#666;font-size:20px}.l2-li-logo{display:grid;width:32px;height:32px;place-items:center;border-radius:3px;background:#0a66c2;color:#fff;font-size:23px;font-weight:800}.l2-li-search{width:230px;border:0;border-radius:4px;background:#eef3f8;padding:10px}.l2-li-spacer{flex:1}.l2-li-icon{display:flex;flex-direction:column;align-items:center;font-size:18px}.l2-li-icon small{font-size:9px}.l2-cover{height:145px;border-bottom:1px solid #ddd;background-color:#82b8d3;background-image:linear-gradient(165deg,transparent 55%,#556f78 56% 60%,transparent 61%),linear-gradient(15deg,transparent 48%,#c5d3d5 49% 54%,transparent 55%),linear-gradient(90deg,#2f657d 0 9%,transparent 9% 15%,#477c90 15% 24%,transparent 24% 32%,#315c70 32% 43%,transparent 43% 50%,#5e8998 50% 62%,transparent 62% 70%,#3d7186 70% 82%,transparent 82%);background-size:100% 100%;box-shadow:inset 0 -28px 35px #f2a44a66}.l2-cover.alt{background-color:#a3c7d6;background-image:linear-gradient(160deg,transparent 54%,#6e817e 55% 59%,transparent 60%),linear-gradient(20deg,transparent 50%,#d9c8a5 51% 55%,transparent 56%),linear-gradient(90deg,#557f86 0 12%,transparent 12% 19%,#8a745e 19% 29%,transparent 29% 38%,#547681 38% 49%,transparent 49% 58%,#917b68 58% 72%,transparent 72% 81%,#4d7680 81%)}.l2-profile{position:relative;margin:0 18px;background:#fff;padding:70px 24px 22px}.l2-profile img{position:absolute;top:-78px;width:140px;height:140px;border:6px solid #fff;border-radius:50%;background:#e6e7e8;object-fit:contain}.l2-profile h2{margin:0;font-size:26px}.l2-profile p{margin:6px 0;color:#61666a}.l2-profile-actions{display:flex;gap:10px;margin-top:18px}.l2-message{border:0;border-radius:18px;background:#0a66c2;color:#fff;padding:8px 17px;font-weight:700}.l2-more{border:1px solid #666;border-radius:18px;background:#fff;padding:7px 17px}.l2-link{border:0;background:none;color:#0a66c2;font-size:16px;font-weight:700;cursor:pointer}.l2-contact-coach{position:absolute;right:28px;top:68px;display:flex;align-items:center;gap:7px;border:2px solid #2c2c2a;border-radius:10px;background:#edf5ff;padding:8px 12px;color:#1f4f78;font-size:13px;font-weight:800;box-shadow:3px 3px 0 #2c2c2a55;pointer-events:none}.l2-contact-coach span{font-size:20px;animation:l2-guide-bob .7s ease-in-out infinite alternate}
      .l2-modal-backdrop{position:absolute;inset:0;display:grid;place-items:center;background:#0009}.l2-modal{position:relative;width:520px;border-radius:18px;background:#fff;padding:28px;box-shadow:0 15px 45px #0006}.l2-modal h2{margin-top:0}.l2-detail{display:grid;grid-template-columns:120px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid #ddd}.l2-detail strong{color:#1f4f78}
      .l2-compose-wrap{position:relative;height:100%;padding:58px 20px 18px;background:#eef1f3;box-sizing:border-box}.l2-compose{position:relative;height:400px;border:1px solid #777;border-radius:18px;background:#fff;box-shadow:0 5px 15px #0003;overflow:hidden}.l2-compose-head{display:flex;height:38px;align-items:center;border-bottom:1px solid #777;background:#dedede;padding:0 14px;font-weight:600}.l2-window-controls{margin-left:auto;color:#6c7175;letter-spacing:11px}.l2-field{display:flex;align-items:center;border-bottom:1px solid #b2b7bb;margin:0 12px}.l2-field label{width:68px;padding:10px 3px}.l2-field input{flex:1;border:0;padding:10px 3px;font-size:15px;outline:0}.l2-cc-links{margin-left:auto;color:#7d8388;font-size:14px}.l2-compose textarea{width:100%;height:240px;border:0;padding:14px 82px 72px 14px;font:16px/1.45 Arial;resize:none;outline:0;box-sizing:border-box}.l2-email-guide{display:grid;width:100%;grid-template-columns:1fr 1fr;gap:8px 10px;border:2px solid #2c2c2a;border-radius:12px;background:#edf5ff;padding:12px;box-sizing:border-box;box-shadow:3px 3px 0 #2c2c2a33}.l2-email-guide strong{grid-column:1/-1;color:#1f4f78;font-size:14px}.l2-guide-item{display:flex;align-items:center;gap:6px;min-width:0;color:#72777b;font-size:11px;line-height:1.2}.l2-guide-item span{display:grid;width:16px;height:16px;flex:0 0 16px;place-items:center;border:2px solid #999;border-radius:50%;font-size:10px}.l2-guide-item.done{color:#002d9c;font-weight:700}.l2-guide-item.done span{border-color:#002d9c;background:#d0e2ff}.l2-review-client{grid-column:1/-1;border:2px solid #1f4f78;border-radius:8px;background:#e7f2f8;padding:8px;color:#1f4f78;font-size:12px;font-weight:800}.l2-client-review{position:absolute;z-index:30;inset:35px;display:flex;align-items:center;justify-content:center;background:transparent}.l2-client-review[hidden]{display:none}.l2-client-review-card{position:relative;width:610px;border:5px solid #2c2c2a;border-radius:18px;background:#f7f1e7;padding:28px;box-sizing:border-box;box-shadow:10px 10px 0 #2c2c2a66}.l2-client-review-card h2{margin:0 0 5px;color:#1f4f78}.l2-client-review-card h3{margin:18px 0 5px;color:#002d9c;font-size:16px}.l2-client-review-card p{margin:0;font-size:15px;line-height:1.4}.l2-client-review-card .l2-close{right:14px;top:12px}.l2-compose-send{position:absolute;z-index:6;right:16px;bottom:14px;display:grid;width:54px;height:54px;place-items:center;border:3px solid #1f1f1f;border-radius:50%;background:#002d9c;color:#fff;padding:0;font-size:26px;line-height:1;font-weight:700;box-shadow:3px 3px 0 #1f1f1f;cursor:pointer}
      .l2-tasks{gap:12px}.l2-side-body{padding:22px 22px 18px}.l2-email-guide{grid-template-columns:1fr;gap:6px;padding:11px 13px;box-shadow:none}.l2-email-guide strong{grid-column:1;font-size:15px}.l2-guide-item{gap:8px;font-size:12px;line-height:1.2}.l2-guide-item span{width:17px;height:17px;flex-basis:17px;font-size:10px}.l2-laptop-action{position:absolute;top:573px;left:50%;transform:translateX(-50%);filter:none}.l2-review-client{min-width:230px;border:3px solid #2c2c2a;border-radius:10px;background:#e7f2f8;padding:10px 22px;color:#1f4f78;font-size:13px;font-weight:800;box-shadow:4px 4px 0 #2c2c2a}.l2-client-review-card{box-shadow:none!important;filter:none!important}.l2-laptop:has(.l2-client-review:not([hidden])){filter:none}
      .l2-screen-action{position:absolute;z-index:40;right:20px;bottom:18px}.l2-screen-action:empty{display:none}.l2-screen-action .l2-compose-send{position:static}
      .l2-sent{display:grid;height:100%;place-items:center;text-align:center}.l2-sent-mark{font-size:86px;color:#002d9c}.l2-sent h2{font-size:32px;color:#1f4f78}.l2-sent p{max-width:500px;font-size:18px;line-height:1.5}
      .l2-side{background:#fff;box-shadow:inset 0 0 0 10px #d0e2ff,0 18px 40px #0003}.l2-side-head{background:#d0e2ff}.l2-side-body{background:#fff}
      .l2-task.active,.l2-task.done,.l2-title,.l2-email-guide strong,.l2-client-review-card h2,.l2-client-review-card h3{color:#002d9c}
      .l2-task.active span,.l2-task.done span{border-color:#002d9c;background:#edf5ff}
      .l2-button,.l2-compose-send{background:#002d9c}.l2-button:disabled{border-color:#a6c8ff;background:#edf5ff;color:#697077}
      .l2-email-guide,.l2-contact-coach{border-color:#a6c8ff;background:#edf5ff;color:#002d9c}.l2-guide-item.done,.l2-sent-mark{color:#002d9c}.l2-guide-item.done span{border-color:#002d9c;background:#d0e2ff}
      .l2-review-client{border-color:#002d9c;background:#edf5ff;color:#002d9c}.l2-client-review-card{background:#fff}.l2-sent h2{color:#002d9c}
      /* Motion is intentionally presentation-only: it makes the workstation feel
         like part of the RPG without changing any task state or grading data. */
      @keyframes l2-laptop-open{0%{opacity:0;transform:perspective(1200px) rotateX(-14deg) translateY(36px) scale(.94)}65%{transform:perspective(1200px) rotateX(2deg) translateY(-5px) scale(1.01)}100%{opacity:1;transform:none}}
      @keyframes l2-panel-enter{from{opacity:0;transform:translateX(38px)}to{opacity:1;transform:none}}
      @keyframes l2-screen-wake{0%{filter:brightness(.25);opacity:.35}55%{filter:brightness(1.2);opacity:1}100%{filter:brightness(1)}}
      @keyframes l2-content-enter{from{opacity:0;transform:translateY(11px) scale(.99)}to{opacity:1;transform:none}}
      @keyframes l2-pulse{0%,100%{box-shadow:0 0 0 0 #1f4f7855}50%{box-shadow:0 0 0 10px #1f4f7800}}
      @keyframes l2-logo-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes l2-sent-pop{0%{opacity:0;transform:scale(.45) rotate(-14deg)}70%{transform:scale(1.12) rotate(3deg)}100%{opacity:1;transform:none}}
      @keyframes l2-screen-shine{from{transform:translateX(-135%)}to{transform:translateX(135%)}}
      @keyframes l2-guide-bob{from{transform:translateY(-3px)}to{transform:translateY(4px)}}
      .l2-laptop{transform-origin:center bottom;animation:l2-laptop-open .58s cubic-bezier(.2,.8,.2,1) both}
      .l2-side{animation:l2-panel-enter .48s .15s cubic-bezier(.2,.8,.2,1) both}
      .l2-display{animation:l2-screen-wake .46s ease-out both}
      .l2-display::after{content:"";pointer-events:none;position:absolute;z-index:20;inset:0;background:linear-gradient(115deg,transparent 16%,#ffffff35 44%,transparent 62%);animation:l2-screen-shine .8s .18s ease-out both}
      .l2-cards,.l2-browser,.l2-results,.l2-linkedin,.l2-compose-wrap,.l2-sent{animation:l2-content-enter .32s ease-out both}
      .l2-task{transition:color .24s ease,transform .24s ease}.l2-task.active{transform:translateX(5px)}.l2-task.active span{animation:l2-pulse 1.65s ease-in-out infinite}
      .l2-card{transition:transform .22s ease,filter .22s ease}.l2-card:hover{transform:translateY(-8px) scale(1.025);filter:drop-shadow(0 10px 8px #0002)}.l2-card:active{transform:translateY(-2px) scale(.985)}.l2-card.selected{transform:translateY(-6px)}.l2-card img,.l2-portrait{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}.l2-card:hover img{transform:scale(1.035)}.l2-card.selected .l2-portrait{box-shadow:0 0 0 6px #84b4cf55}
      .l2-google-logo{animation:l2-logo-float 3s ease-in-out infinite}.l2-searchbox{transition:box-shadow .2s ease,transform .2s ease}.l2-searchbox:focus-within{transform:scale(1.015);box-shadow:0 5px 16px #0003}
      .l2-button,.l2-compose-send{transition:transform .16s ease,filter .16s ease}.l2-button:not(:disabled):hover,.l2-compose-send:hover{transform:translateY(-3px);filter:brightness(1.08)}.l2-button:not(:disabled):active,.l2-compose-send:active{transform:translate(3px,3px)}
      .l2-close{transition:transform .18s ease,background .18s ease}.l2-close:hover{transform:rotate(90deg) scale(1.08);background:#fff2d2}
      .l2-result{transition:transform .18s ease,background .18s ease}.l2-result:hover{transform:translateX(6px);background:#f7faff}.l2-cover{animation:l2-content-enter .45s ease-out both}.l2-profile img{transition:transform .25s ease}.l2-profile img:hover{transform:scale(1.05) rotate(-2deg)}
      .l2-sent-mark{animation:l2-sent-pop .55s cubic-bezier(.2,.9,.3,1.35) both}
      .l2-display,.l2-side,.l2-side-body,.l2-portrait{background:#fff}
      .l2-side{box-shadow:inset 0 0 0 10px #d0e2ff,0 18px 40px #0003}
      .l2-side-head{background:#d0e2ff}
      .l2-task.active,.l2-title,.l2-email-guide strong,.l2-detail strong,.l2-sent h2{color:#002d9c}
      .l2-task.active span,.l2-card.selected .l2-portrait{border-color:#a6c8ff;background:#edf5ff}
      .l2-button,.l2-compose-send{background:#002d9c}
      .l2-email-guide,.l2-client-review-card{background:#fff}
      .l2-review-client{border-color:#a6c8ff;background:#edf5ff;color:#001d6c}
      @media (prefers-reduced-motion:reduce){.l2-shell *,.l2-shell *::before,.l2-shell *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
    </style>
    <div class="l2-shell">
      <section class="l2-laptop"><div class="l2-screen"><div class="l2-display"><button class="l2-close" data-action="close" aria-label="Close laptop">×</button>${content}<div class="l2-screen-action">${screenAction}</div></div></div><div class="l2-base" aria-hidden="true"></div><div class="l2-laptop-action">${laptopAction}</div></section>
      <aside class="l2-side"><div class="l2-side-head"></div><div class="l2-side-body"><ol class="l2-tasks">${renderProgress()}</ol><div class="l2-action">${action}</div></div></aside>
    </div>`

  const bind = (selector: string, event: string, listener: EventListener): void => {
    root.querySelector(selector)?.addEventListener(event, listener)
  }

  const render = (): void => {
    const client = selectedClient
    const details = client ? detailsFor(client) : undefined

    if (step === 'clients') {
      const cards = options.clients
        .map((item, index) => {
          const portrait = portraitFor(item)
          const itemDetails = detailsFor(item)
          return `<button class="l2-card ${selectedClient?.name === item.name ? 'selected' : ''}" data-client="${index}"><span class="l2-portrait"><img src="/assets/characters/npcs/${portrait}" alt=""></span><span class="l2-card-copy"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(itemDetails.role)}</p><p>${escapeHtml(itemDetails.company)}</p></span></button>`
        })
        .join('')
      root.innerHTML = shell(
        `<div class="l2-cards">${cards || '<p>No completed client conversations were found.</p>'}</div>`,
        `<button class="l2-button" data-action="continue" ${selectedClient ? '' : 'disabled'}>Research selected client</button>`
      )
      root.querySelectorAll<HTMLElement>('[data-client]').forEach((card) => {
        card.addEventListener('click', () => {
          const nextClient = options.clients[Number(card.dataset.client)]
          if (selectedClient?.name !== nextClient?.name) {
            emailCopied = false
            furthestProgressIndex = 0
            pendingSubmission = undefined
            submissionStarted = false
          }
          selectedClient = nextClient
          if (selectedClient) {
            const portrait = portraitFor(selectedClient)
            window.localStorage.setItem(
              SELECTED_OUTREACH_CLIENT_KEY,
              JSON.stringify({ ...selectedClient, portrait })
            )
          }
          render()
        })
      })
      bind('[data-action="continue"]', 'click', () => {
        step = 'google'
        render()
      })
    } else if (step === 'google' && client) {
      root.innerHTML = shell(
        `<div class="l2-browser"><div class="l2-browser-top"></div><div class="l2-browserbar"><span>←</span><span>→</span><span>↻</span><input class="l2-url" value="Search Google or type a URL" readonly></div><div class="l2-tabs"></div><div class="l2-google"><div class="l2-google-logo" aria-label="Google"><span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span></div><div class="l2-searchbox"><span>＋</span><input class="l2-input" data-search value="${escapeHtml(client.name)} LinkedIn" aria-label="Google search"><span class="l2-search-tools">♩　⌾</span><button class="l2-search-icon" data-action="search" aria-label="Search">⌕</button></div><div class="l2-shortcuts" aria-label="Decorative Google shortcuts"><button class="l2-chip" disabled>✨ Create images</button><button class="l2-chip" disabled>📎 Ask about files</button><button class="l2-chip" disabled>💡 Brainstorm</button><button class="l2-chip" disabled>I'm Feeling Lucky</button></div></div></div>`
      )
      bind('[data-action="search"]', 'click', () => {
        step = 'results'
        render()
      })
      bind('[data-search]', 'keydown', ((event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          step = 'results'
          render()
        }
      }) as EventListener)
    } else if (step === 'results' && client && details) {
      root.innerHTML = shell(
        `<div class="l2-results"><div class="l2-browser-top"></div><div class="l2-results-head"><div class="l2-results-search"><span class="l2-mini-logo"><span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span></span><input class="l2-input" value="${escapeHtml(client.name)} LinkedIn" readonly><span>🎙　⌕　▦</span></div><div class="l2-result-tabs"><span>AI Mode</span><strong>All</strong><span>Images</span><span>Videos</span><span>News</span><span>Shopping</span><span>More</span><span>Tools</span></div></div><div class="l2-results-body"><p style="color:#70757a;font-size:12px">About 1 result</p><button class="l2-result" data-action="profile"><span class="l2-result-source"><span class="l2-li-badge">in</span><span>LinkedIn<br><small>linkedin.com/in/${escapeHtml(client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}</small></span></span><h3>${escapeHtml(client.name)} – ${escapeHtml(details.role)}</h3><p>${escapeHtml(client.name)} is ${escapeHtml(details.role)} at ${escapeHtml(details.company)} in ${escapeHtml(details.location)}.</p></button><div class="l2-sitelinks" aria-hidden="true"><div>About</div><div>Experience</div><div>Activity</div><div>Contact details</div></div></div></div>`
      )
      bind('[data-action="profile"]', 'click', () => {
        step = 'linkedin'
        render()
      })
    } else if ((step === 'linkedin' || step === 'contact') && client && details) {
      const portrait = portraitFor(client)
      const alternateCover = client.texture === 'good-client' ? '' : 'alt'
      const modal =
        step === 'contact'
          ? `<div class="l2-modal-backdrop"><div class="l2-modal"><button class="l2-close" data-action="close-contact" aria-label="Close contact information">×</button><h2>Contact info</h2><div class="l2-detail"><strong>Profile</strong><span>${escapeHtml(client.name)}</span></div><div class="l2-detail"><strong>Phone</strong><span>${escapeHtml(details.phone)}</span></div><div class="l2-detail"><strong>Email</strong><span>${escapeHtml(details.email)}</span></div><div class="l2-detail"><strong>Connected</strong><span>Since August 2026</span></div></div></div>`
          : ''
      const contactCoach =
        step === 'linkedin'
          ? '<div class="l2-contact-coach"><span aria-hidden="true">↓</span> Click Contact Info</div>'
          : ''
      root.innerHTML = shell(
        `<div class="l2-linkedin"><div class="l2-li-nav"><span class="l2-li-logo">in</span><input class="l2-li-search" value="Search" readonly><span class="l2-li-spacer"></span><span class="l2-li-icon">⌂<small>Home</small></span><span class="l2-li-icon">♟<small>Network</small></span><span class="l2-li-icon">▣<small>Jobs</small></span><span class="l2-li-icon">●<small>Messaging</small></span><span class="l2-li-icon">♟<small>Me</small></span><span>▦</span></div><div class="l2-cover ${alternateCover}"></div><div class="l2-profile"><img src="/assets/characters/npcs/${portrait}" alt=""><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(details.role)} at ${escapeHtml(details.company)}</p><p>${escapeHtml(details.location)} · <button class="l2-link" data-action="contact">Contact info</button></p>${contactCoach}<div class="l2-profile-actions"><button class="l2-message" disabled>➤ Message</button><button class="l2-more" disabled>More</button></div></div>${modal}</div>`,
        step === 'contact'
          ? `<button class="l2-button" data-action="copy">${emailCopied ? 'Email copied ✓' : 'Copy email and continue'}</button>`
          : ''
      )
      bind('[data-action="contact"]', 'click', () => {
        step = 'contact'
        render()
      })
      bind('[data-action="close-contact"]', 'click', () => {
        step = 'linkedin'
        render()
      })
      bind('[data-action="copy"]', 'click', () => {
        emailCopied = true
        step = 'composer'
        render()
      })
    } else if (step === 'composer' && client && details) {
      const clientBrief = CLIENT_BRIEFS[client.personaId ?? ''] ?? {
        businessNeed:
          'Review what this client told you about their most important business challenge.',
        impact: 'Consider how the challenge affects their organisation, customers or growth.',
        desiredOutcome: 'Explain how your proposed next step connects to the outcome they want.',
      }
      const checklistMarkup = emailChecklist('', '', client)
        .map(
          (item) =>
            `<div class="l2-guide-item" data-guide-item><span>○</span>${escapeHtml(item.label)}</div>`
        )
        .join('')
      root.innerHTML = shell(
        `<div class="l2-compose-wrap"><form class="l2-compose" data-compose><div class="l2-compose-head"><span>New Message</span><span class="l2-window-controls">—　↗　×</span></div><div class="l2-field"><label>To</label><input name="to" type="email" value="${escapeHtml(details.email)}" required><span class="l2-cc-links">Cc Bcc</span></div><div class="l2-field"><label>Cc</label><input name="cc" type="email"></div><div class="l2-field"><label>Bcc</label><input name="bcc" type="email"></div><div class="l2-field"><label>Subject</label><input name="subject" maxlength="120" required></div><textarea name="body" maxlength="3000" aria-label="Email body" placeholder="Write your outreach email…" required></textarea></form><div class="l2-client-review" data-client-review hidden><article class="l2-client-review-card"><button type="button" class="l2-close" data-action="close-review" aria-label="Close client details">×</button><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(details.role)} at ${escapeHtml(details.company)}</p><h3>Business need</h3><p>${escapeHtml(clientBrief.businessNeed)}</p><h3>Business impact</h3><p>${escapeHtml(clientBrief.impact)}</p><h3>Desired outcome</h3><p>${escapeHtml(clientBrief.desiredOutcome)}</p></article></div></div>`,
        `<aside class="l2-email-guide"><strong>Email checklist</strong>${checklistMarkup}</aside>`,
        `<button type="button" class="l2-review-client" data-action="review-client">Review client details</button>`,
        `<button class="l2-compose-send" data-action="send" type="button" aria-label="Send outreach email" title="Send outreach email">➤</button>`
      )
      const form = root.querySelector<HTMLFormElement>('[data-compose]')
      const subjectField = form?.elements.namedItem('subject') as HTMLInputElement | null
      const bodyField = form?.elements.namedItem('body') as HTMLTextAreaElement | null
      const updateChecklist = (): void => {
        const checks = emailChecklist(bodyField?.value ?? '', subjectField?.value ?? '', client)
        root.querySelectorAll<HTMLElement>('[data-guide-item]').forEach((item, index) => {
          const complete = checks[index]?.complete === true
          item.classList.toggle('done', complete)
          const marker = item.querySelector('span')
          if (marker) marker.textContent = complete ? '✓' : '○'
        })
      }
      subjectField?.addEventListener('input', updateChecklist)
      bodyField?.addEventListener('input', updateChecklist)
      bind('[data-action="review-client"]', 'click', () => {
        root.querySelector<HTMLElement>('[data-client-review]')?.removeAttribute('hidden')
      })
      bind('[data-action="close-review"]', 'click', () => {
        root.querySelector<HTMLElement>('[data-client-review]')?.setAttribute('hidden', '')
      })
      bind('[data-action="send"]', 'click', () => {
        if (!form?.reportValidity()) return
        const data = new FormData(form)
        // Keep the completed form locally until the player explicitly begins
        // their break. This creates a readable confirmation step instead of
        // replacing the composer with the lunch screen the instant Send is hit.
        pendingSubmission = {
          client,
          to: String(data.get('to') ?? ''),
          subject: String(data.get('subject') ?? ''),
          cc: String(data.get('cc') ?? ''),
          bcc: String(data.get('bcc') ?? ''),
          body: String(data.get('body') ?? ''),
        }
        submissionStarted = false
        step = 'sent'
        render()
      })
    } else if (step === 'sent') {
      root.innerHTML = shell(
        `<div class="l2-sent"><div><div class="l2-sent-mark">✓</div><h2>Email sent</h2><p>Your outreach email has been submitted and your assessment is being prepared.</p><p>Before viewing your grade, take your lunch break.</p></div></div>`,
        `<button class="l2-button" data-action="take-break" ${submissionStarted ? 'disabled' : ''}>${submissionStarted ? 'Preparing lunch break…' : 'Take lunch break'}</button>`
      )
      bind('[data-action="take-break"]', 'click', () => {
        if (!pendingSubmission || submissionStarted) return
        submissionStarted = true
        options.onEmailSent(pendingSubmission)
      })
    }

    // createFromHTML initially measures an empty wrapper. Re-measure after every
    // state render so Phaser centres the complete interface instead of treating its
    // top-left corner as the origin and pushing the laptop off-screen.
    if (gameObject.node) {
      gameObject.updateSize()
    }
    // The sent screen contains both the persistent × and a Return to office
    // button. Bind every close control rather than only the first match so either
    // exit returns the player to the office and restores normal room controls.
    root.querySelectorAll<HTMLElement>('[data-action="close"]').forEach((control) => {
      control.addEventListener('click', options.onClose as EventListener)
    })

    // Completed checklist steps act as navigation, allowing the player to review
    // earlier research or return to client selection. Future steps remain disabled
    // until reached, and choosing a different client restarts client-specific work.
    root.querySelectorAll<HTMLButtonElement>('[data-progress-step]').forEach((control) => {
      control.addEventListener('click', () => {
        if (control.disabled) return
        step = control.dataset.progressStep as LaptopStep
        render()
      })
    })

    // Phaser listens for movement and interaction keys at the window level. Stop
    // events from editable laptop controls before they reach Phaser so ordinary
    // text—especially spaces and the interaction key "E"—is never swallowed.
    root
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
      .forEach((field) => {
        field.addEventListener('keydown', (event) => event.stopPropagation())
        field.addEventListener('keyup', (event) => event.stopPropagation())
      })
  }

  render()
  return gameObject
}
