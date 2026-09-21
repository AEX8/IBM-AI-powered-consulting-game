import { adminDb } from '@/lib/firebase/admin'
import {
  completedClientKeys,
  normalizeProgressData,
  toConsultantProgress,
  type ConsultantProgress,
  type ProgressData,
} from './progress'

export async function getProgressData(uid: string): Promise<ProgressData> {
  const snapshot = await adminDb.collection('portfolioProgress').doc(uid).get()
  return normalizeProgressData(snapshot.data())
}

export async function getConsultantProgress(uid: string): Promise<ConsultantProgress> {
  return toConsultantProgress(await getProgressData(uid))
}

export async function getCompletedClientKeys(uid: string, stageId: number): Promise<string[]> {
  return completedClientKeys(await getProgressData(uid), stageId)
}