#!/usr/bin/env node
/**
 * Creates the fixed demo account used for instant, no-typing sign-in during
 * the showcase event. Firebase blocks sign-in for unverified emails, so this
 * creates the user directly via the Admin SDK with emailVerified already
 * true — no verification email needs to be sent or clicked.
 *
 * Safe to run more than once: does nothing if the account already exists.
 *
 * Run from the repo root:  node scripts/seed-demo-account.js
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

// These are intentionally public — this account only ever exists in the
// isolated demo Firebase project and holds no real data. Keep this exact
// email and password in sync with frontend/src/app/(auth)/auth/signin/page.tsx
// once that file is updated to sign in with them automatically.
const DEMO_EMAIL = 'demo@team9-showcase.dev'
const DEMO_PASSWORD = 'IbmDemo2026!'

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env')

if (!fs.existsSync(envPath)) {
  console.error('No .env file found at the repo root. See docs/ENV-VARS.md.')
  process.exit(1)
}

// firebase-admin is installed inside frontend/, not at the repo root.
const admin = createRequire(path.join(root, 'frontend', 'package.json'))('firebase-admin')

function readEnvValue(content, key) {
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1 || trimmed.slice(0, eq).trim() !== key) continue

    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return ''
}

async function main() {
  const encodedKey = readEnvValue(
    fs.readFileSync(envPath, 'utf8'),
    'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64'
  )

  if (!encodedKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is empty in .env.')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

  console.log(`Firebase project: ${serviceAccount.project_id}`)

  const existing = await admin
    .auth()
    .getUserByEmail(DEMO_EMAIL)
    .catch(() => null)

  if (existing) {
    console.log(`  skipped  ${DEMO_EMAIL} (already exists, uid ${existing.uid})`)
    return
  }

  const user = await admin.auth().createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    emailVerified: true,
    displayName: 'Demo Consultant',
  })

  console.log(`  created  ${DEMO_EMAIL} (uid ${user.uid})`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Creating the demo account failed:', error.message)
    process.exit(1)
  })