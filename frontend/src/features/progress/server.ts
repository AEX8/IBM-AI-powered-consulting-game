import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import {
  applyStageCompletion,
  normalizeProgressData,
  type StageCompletionInput,
  type StageCompletionReward,
} from './progress'

// Server only the caller must already have verified who the player is.
export async function saveStageCompletion(
  uid: string,
  input: StageCompletionInput
): Promise<StageCompletionReward> {
  const ref = adminDb.collection('portfolioProgress').doc(uid)

  // Read-modify-write in a transaction so two quick calls cannot double count.
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const current = normalizeProgressData(snapshot.data())
    const { data, reward } = applyStageCompletion(current, input)
    const now = Timestamp.now()

    transaction.set(ref, {
      id: uid,
      uid,
      ...data,
      createdAt: snapshot.exists ? (snapshot.get('createdAt') ?? now) : now,
      updatedAt: now,
      _schemaVersion: 1,
    })

    return reward
  })
}
