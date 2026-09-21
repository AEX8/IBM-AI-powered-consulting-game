import { NextResponse } from 'next/server'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { contractsClosed } from '@/features/closing/closing'
import { toContractSummary, type ContractSummary } from '@/features/closing/contracts'
import { getProgressData } from '@/features/progress/queries'

const MAX_CONTRACTS = 50

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Equality filter only, so no composite index is needed; sorting happens here.
    const snapshot = await adminDb.collection('contracts').where('uid', '==', session.uid).get()

    const contracts = snapshot.docs
      .map((doc) => toContractSummary(doc.id, doc.data()))
      .filter((contract): contract is ContractSummary => contract !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_CONTRACTS)

    return NextResponse.json({
      contracts,
      contractsClosed: contractsClosed(await getProgressData(session.uid)),
    })
  } catch (error) {
    console.error('Closing contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}