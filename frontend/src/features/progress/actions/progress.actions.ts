'use server'

import { z } from 'zod'
import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import type { StageCompletionReward } from '../progress'
import { saveStageCompletion } from '../server'

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
  metrics: z
    .record(z.string().regex(/^[a-zA-Z0-9_]{1,40}$/), z.number().finite().min(0).max(1000))
    .optional(),
  completesStage: z.boolean().optional(),
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
    const reward = await saveStageCompletion(session.uid, parsed.data) // 3. save it
    return { success: true, data: reward }
  } catch {
    return { success: false, error: 'Failed to save progress' }
  }
}
