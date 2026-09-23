import type { EarlierMeetingNote } from '../types'

type EarlierMeetingsSidebarProps = {
  clientName: string
  clientInitials: string
  notes: EarlierMeetingNote[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
}

export function EarlierMeetingsSidebar({
  clientName,
  clientInitials,
  notes,
  selectedNoteId,
  onSelectNote,
}: EarlierMeetingsSidebarProps) {
  return (
    <aside className="bg-dark-blue max-h-[30dvh] w-full shrink-0 overflow-y-auto overscroll-contain px-6 py-8 md:max-h-none md:w-[280px] md:pb-28">
      <div className="border-charcoal bg-honey-wood flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-lg font-extrabold text-white">
        {clientInitials}
      </div>

      <h2 className="mt-4 text-lg font-extrabold text-white">{clientName}</h2>

      <span className="bg-plant-green mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">
        Continued from Level 4
      </span>

      <hr className="mt-5 border-white/20" />

      <p className="mt-5 text-[11px] font-extrabold tracking-[0.1em] text-white/70 uppercase">
        From earlier meetings
      </p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {notes.map((note) => {
          const isSelected = note.id === selectedNoteId

          return (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => onSelectNote(note.id)}
                aria-haspopup="dialog"
                className={`w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                  isSelected
                    ? 'bg-plant-green text-white'
                    : 'text-charcoal bg-white hover:bg-white/90'
                }`}
              >
                {note.label}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
