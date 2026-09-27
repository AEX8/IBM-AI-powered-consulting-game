'use client'

import { useState } from 'react'
import { preparationContent } from './preparationContent'
import styles from './MeetingOrderPopup.module.css'

/**
 * Shown once, right after Level 3 preparation is finished for both clients.
 * Level 4 has one meeting room: the player must meet the two clients one at a
 * time, so this decides which one comes first. Drag reorders by tracking
 * plain pointer enter/leave over each row — no native drag-and-drop, so it
 * works the same with a mouse or a finger on a touch screen.
 */
export function MeetingOrderPopup({
  personaIds,
  onConfirm,
}: {
  personaIds: string[]
  onConfirm: (order: string[]) => void
}) {
  const [order, setOrder] = useState(personaIds)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function moveDraggedOver(overId: string) {
    if (!draggingId || draggingId === overId) return

    setOrder((current) => {
      const from = current.indexOf(draggingId)
      const to = current.indexOf(overId)
      if (from === -1 || to === -1) return current

      const next = [...current]
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Choose meeting order">
      <div className={styles.card}>
        <h2>Both clients are ready</h2>
        <p>You have one meeting room. Drag to choose who you meet first.</p>
        <ul className={styles.list} onPointerUp={() => setDraggingId(null)} onPointerLeave={() => setDraggingId(null)}>
          {order.map((id, index) => (
            <li
              key={id}
              className={`${styles.item} ${draggingId === id ? styles.dragging : ''}`}
              onPointerDown={() => setDraggingId(id)}
              onPointerEnter={() => moveDraggedOver(id)}
            >
              <span className={styles.handle} aria-hidden="true">
                ⠿
              </span>
              <span className={styles.rank}>{index + 1}</span>
              <span className={styles.name}>{preparationContent[id]?.name ?? id}</span>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.confirm} onClick={() => onConfirm(order)}>
          Confirm order →
        </button>
      </div>
    </div>
  )
}
