import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel: string
  /** Styles the confirm button as a destructive action. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A modal confirmation on the native `<dialog>`: it traps focus, closes on
 * Escape and on a tap outside the card, and starts on the safe choice.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="confirm-title"
      // Escape closes the dialog natively; keep React's state in step.
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      // The dialog box is the backdrop: a click on it, not on the card, is outside.
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="confirm__card">
        <h2 id="confirm-title">{title}</h2>
        {children && <p>{children}</p>}
        <div className="confirm__actions">
          <button className="ghost confirm__cancel" autoFocus onClick={onCancel}>{cancelLabel}</button>
          <button className={`confirm__ok${danger ? ' is-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  )
}
