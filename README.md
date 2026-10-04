# IBM Consultancy 101

An AI-powered consulting training game. Players work a full client engagement, from finding a lead to closing the deal, by talking to AI-driven clients who react like real people and grade every step.

Built by Team 9 for the RMIT x IBM capstone.

**Live demo:** https://ibm-ai-powered-consulting-game-fron.vercel.app/

## How the game works

There are six stages, played against two AI clients (Sarah Chen and David Palte):

| Stage | What you do |
|-------|-------------|
| 1. Find a Lead | Walk around the office and have a discovery conversation with each client |
| 2. Outreach | Research a client and send them an outreach email, which gets graded |
| 3. Prepare for a Meeting | Pick objectives and questions, then get feedback on your preparation |
| 4. Client Meeting | Hold a live AI-driven meeting, then get scored on relationship, trust and more |
| 5. Proposal and Negotiation | Write a proposal and handle the client's objections |
| 6. Close the Deal | Agree contract terms and answer the client's final concerns |

Progress and XP are saved per player, and each stage unlocks only after the one before it is done.

## How the AI works

- Each client is a document in Firestore (job title, company, problem, personality, objections).
- For every conversation or grading step, the server builds a prompt from that client's data plus the rules for that stage, and sends it to Groq.
- The model replies in JSON, which the server validates before the player sees anything.
- The AI only scores. Whether you pass is decided by plain rules in our own code.
- If a call fails or a model hits its limit, the app retries and falls back to other models, then to a backup API key.

## Tech stack

| | |
|-|-|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Game | Phaser 3 for the room-based levels |
| Auth and data | Firebase Authentication (anonymous sign-in) and Firestore |
| AI | Groq (open-source models such as `gpt-oss-20b`) |
| Hosting | Vercel |
| Tooling | pnpm workspaces, Vitest, ESLint, Prettier, Lefthook |

The backend is the set of Next.js API routes in `frontend/src/app/api`.

## Run it locally

**Prerequisites:** Node.js 22 and pnpm (`npm install -g pnpm`).

1. Install dependencies and create the env file:

   ```bash
   pnpm run bootstrap
   ```

2. Fill in the root `.env` (see `.env.example`):
   - The `NEXT_PUBLIC_FIREBASE_*` values from your Firebase web app
   - `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`, a base64-encoded service account key
   - `GROQ_API_KEY`, and optionally `GROQ_API_KEY_BACKUP` for a second Groq account

3. In the Firebase console, enable **Anonymous** sign-in and create a Firestore database, then publish the rules from `firebase/firestore.rules`.

4. Add the two client personas to Firestore:

   ```bash
   node scripts/seed-personas.js
   ```

5. Start the app:

   ```bash
   pnpm run dev
   ```

   Then open http://localhost:3000. Restart the dev server after any `.env` change.

More detail on environment variables is in [docs/ENV-VARS.md](docs/ENV-VARS.md).

## Project structure

```
frontend/src/
  app/          Pages and API routes
  components/   Shared UI
  features/     One folder per part of the game (game, meeting, proposal, closing, progress)
  lib/          Firebase and Groq helpers
scripts/        Env sync and persona seeding
firebase/       Firestore rules and indexes
docs/           Extra documentation
```

Files worth reading first:

- `frontend/src/lib/groq.ts`: every AI call goes through here
- `frontend/src/features/meeting/prompts.ts`: how a client prompt is built
- `frontend/src/app/api/`: the grading and conversation routes
- `scripts/seed-personas.js`: the client personas

## Commands

```bash
pnpm run dev         # Start the dev server
pnpm run build       # Build all packages
pnpm run lint        # Lint
pnpm run typecheck   # Type check
pnpm run test:all    # Run all tests
pnpm run env:sync    # Regenerate frontend env files from the root .env
```

## Deployment

The frontend deploys to Vercel and redeploys on every push to `main`. Environment variables are set in the Vercel dashboard (Project Settings, Environment Variables), not committed to git. After adding or changing one, redeploy so it takes effect.

## Team

- Gayath Wethmin Kaluwahewa, Project Manager and Developer
- Kashaf Fatima, Developer
- Amritha Selvaganapathi, UX/UI Designer
- Fatima Hubail, Business Analyst
- Ibrahim Allouche, Developer

## Credits

Started from the Garage Boilerplate by Duc Gia Tin Huynh ([LinkedIn](https://www.linkedin.com/in/huynhducgiatin/)).
