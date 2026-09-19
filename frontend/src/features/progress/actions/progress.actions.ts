'use server'

import { z } from 'zod'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import {
  applyStageCompletion,
  normalizeProgressData,
  type StageCompletionReward,
} from '../progress'

const skillDelta = z.number().int().min(0).max(3).optional()

const recordStageCompletionSchema = z.object({
  stageId: z.number().int().min(1).max(6),
  personaKey: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Invalid client key'),
  performance: z.enum(['strong', 'developing']),
  skillDeltas: z
    .object({
      clientDiscovery: skillDelta,
      businessAcumen: skillDelta,
      solutionDesign: skillDelta,
      clientManagement: skillDelta,
      dealSuccess: skillDelta,
    })
    .strict()
    .optional(),
})

export async function recordStageCompletion(
  input: unknown
): Promise<ActionResult<StageCompletionReward>> {
  const session = await requireAuth() // 1. who is asking?

  const parsed = recordStageCompletionSchema.safeParse(input) // 2. is the input sane?
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  try {
    // 3. read-modify-write in a transaction so two quick calls cannot double-count
    const ref = adminDb.collection('portfolioProgress').doc(session.uid)

    const reward = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref)
      const current = normalizeProgressData(snapshot.data())
      const { data, reward: stageReward } = applyStageCompletion(current, parsed.data)
      const now = Timestamp.now()

      transaction.set(ref, {
        id: session.uid,
        uid: session.uid,
        ...data,
        createdAt: snapshot.exists ? (snapshot.get('createdAt') ?? now) : now,
        updatedAt: now,
        _schemaVersion: 1,
      })

      return stageReward
    })

    return { success: true, data: reward }
  } catch {
    return { success: false, error: 'Failed to save progress' }
  }
}