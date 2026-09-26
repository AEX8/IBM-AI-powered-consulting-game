import { getClientAuth } from '@/lib/firebase/client'

function notebookKey(level: number, client = 'general'): string | null {
  try {
    const userId = getClientAuth().currentUser?.uid
    return userId ? `ibm-notebook:${userId}:level-${level}:${client}` : null
  } catch {
    return null
  }
}

export function readNotebook(level: number, client?: string): string {
  const key = notebookKey(level, client)
  if (!key) return ''
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function saveNotebook(level: number, value: string, client?: string): void {
  const key = notebookKey(level, client)
  if (!key) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Notes remain available in the open notebook if browser storage is unavailable.
  }
}
