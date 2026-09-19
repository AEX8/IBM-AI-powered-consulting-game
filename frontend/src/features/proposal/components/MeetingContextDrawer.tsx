'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { EarlierMeetingNote } from '../types'

type MeetingContextDrawerProps = {
  note: EarlierMeetingNote
  onClose: () => void
}

export function MeetingContextDrawer({ note, onClose }: MeetingContextDrawerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-context-title"
        className="absolute top-0 right-0 h-full w-full max-w-[560px] overflow-y-auto bg-white px-10 py-8 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-charcoal/60 text-[11px] font-extrabold tracking-[0.1em] uppercase">
            {note.category}
          </p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="text-charcoal/60 hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        <h2 id="meeting-context-title" className="text-charcoal mt-3 text-2xl font-extrabold">
          {note.title}
        </h2>

        <p className="text-charcoal/80 mt-4 text-sm leading-relaxed">{note.detail}</p>

        {note.relatedObjectives && note.relatedObjectives.length > 0 && (
          <div className="mt-8">
            <p className="text-charcoal/60 text-[11px] font-extrabold tracking-[0.1em] uppercase">
              Also selected in that meeting
            </p>

            <ul className="mt-3 flex flex-wrap gap-2">
              {note.relatedObjectives.map((objective) => (
                <li
                  key={objective}
                  className="bg-warm-cream text-charcoal rounded-full px-3 py-1.5 text-sm font-semibold"
                >
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}