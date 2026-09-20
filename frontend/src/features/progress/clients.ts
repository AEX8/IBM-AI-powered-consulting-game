// The game's persona ids (the Firestore `personas` documents) and the short client
// keys used by the shared progress record and Level 5. Add new clients here.
const CLIENT_KEY_BY_PERSONA_ID: Record<string, string> = {
  'test-level-1': 'sarah',
  'test-level-2': 'david',
}

export function clientKeyFromPersonaId(personaId: string): string | null {
  return CLIENT_KEY_BY_PERSONA_ID[personaId] ?? null
}
