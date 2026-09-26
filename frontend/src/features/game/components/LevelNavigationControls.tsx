'use client'

import { useEffect, useState } from 'react'
import { Home, NotebookPen } from 'lucide-react'
import { readNotebook, saveNotebook } from '../notebookStorage'

type LevelNavigationControlsProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6
  client?: string
}

export function LevelNavigationControls({ level, client }: LevelNavigationControlsProps) {
  const [open, setOpen] = useState<'home' | 'notebook' | null>(null)
  const [notes, setNotes] = useState('')

  const closeNotebook = () => {
    saveNotebook(level, notes, client)
    setOpen(null)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (open === 'notebook') saveNotebook(level, notes, client)
      setOpen(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, notes, level, client])

  return (
    <>
      <nav aria-label="Level controls" className="fixed bottom-6 left-6 z-40 flex gap-2">
        <button
          type="button"
          aria-label="Home menu"
          title="Home menu"
          onClick={() => setOpen('home')}
          className="flex size-14 items-center justify-center rounded-full border-[3px] border-[#161616] bg-[#002d9c] text-white shadow-[3px_3px_0_#161616] transition hover:scale-110"
        >
          <Home size={25} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Open notebook"
          title="Notebook"
          onClick={() => {
            setNotes(readNotebook(level, client))
            setOpen('notebook')
          }}
          className="flex size-14 items-center justify-center rounded-full border-[3px] border-[#161616] bg-[#2c2c2a] text-white shadow-[3px_3px_0_#161616] transition hover:scale-110"
        >
          <NotebookPen size={25} aria-hidden="true" />
        </button>
      </nav>

      {open === 'home' && (
        <div
          data-level-navigation-dialog
          role="dialog"
          aria-modal="true"
          aria-label="Home menu"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#edf5ff]/80 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(null)
          }}
        >
          <div className="w-full max-w-[720px] overflow-hidden border-4 border-[#111111] bg-[#f3f6f8] shadow-[6px_6px_0_#001d6c33]">
            <div className="h-[18px] border-b-[3px] border-[#111111] bg-[#d0e2ff]" />
            <div className="flex min-h-[198px] flex-wrap items-center justify-center gap-4 p-6">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="min-w-40 border-[3px] border-[#111111] bg-[#002d9c] px-5 py-3 text-xl text-white"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-w-40 border-[3px] border-[#111111] bg-[#002d9c] px-5 py-3 text-xl text-white"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/dashboard')}
                className="min-w-40 border-[3px] border-[#111111] bg-[#002d9c] px-5 py-3 text-xl text-white"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}

      {open === 'notebook' && (
        <div
          data-level-navigation-dialog
          role="dialog"
          aria-modal="true"
          aria-label={`Level ${level} notebook`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#edf5ff]/80 p-4"
          onMouseDown={(event) => {
            if (!(event.target as HTMLElement).closest('textarea')) closeNotebook()
          }}
        >
          <div className="flex h-[625px] max-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col border-[5px] border-[#111111] bg-[#f4f7f9] shadow-[6px_6px_0_#001d6c33]">
            <div className="flex h-[105px] shrink-0 items-center justify-center border-b-[5px] border-[#111111] bg-[#d0e2ff]">
              <span
                aria-hidden="true"
                className="flex size-[84px] items-center justify-center rounded-full border-4 border-black bg-[#2c2c2a] text-[#f4f7f9]"
              >
                <NotebookPen size={36} />
              </span>
            </div>
            <textarea
              aria-label={`Level ${level} consultant notes`}
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mx-auto my-5 min-h-[200px] w-[80%] flex-1 resize-none border-0 bg-[#f4f7f9] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_34px,#222_35px,#222_37px)] px-2 text-[17px] leading-[37px] text-[#2c2c2a] outline-none"
            />
            <div className="flex shrink-0 justify-end px-5 pb-5">
              <button
                type="button"
                onClick={closeNotebook}
                aria-label="Save notebook"
                title="Save notebook"
                className="flex size-[50px] items-center justify-center rounded-full border-4 border-[#111111] bg-[#e6e8e9] text-[#2c2c2a] transition hover:scale-110"
              >
                <span aria-hidden="true" className="text-2xl">
                  ▶
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
