import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface InstructionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  // Close modal when pressing Escape
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  // Use createPortal to render the modal at the document body level
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-bold">
            How to Play Curling
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-lg">Game Objective</h3>
            <p>Place your stones closer to the center of the house (the target) than your opponent's stones.</p>
          </section>

          <section>
            <h3 className="font-bold text-lg">How to Play</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Drag stones from the rock bar at the bottom onto the curling sheet.</li>
              <li>Try to position your stones strategically on the sheet.</li>
              <li>Stones cannot overlap - they will automatically be repositioned if placed too close together.</li>
              <li>Stones must remain within the boundaries of the sheet.</li>
              <li>Once both stones are placed, click the "Finish" button to complete your turn.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-lg">Scoring</h3>
            <p>
              After all stones are played, the team with stones closest to the center of the house scores points. Only
              stones in the house (the colored circles) can score.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-lg">Key Areas</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>House</strong>: The colored circles at the bottom of the sheet.
              </li>
              <li>
                <strong>Button</strong>: The very center of the house (white circle).
              </li>
              <li>
                <strong>Hog Line</strong>: The horizontal line across the sheet. Stones must cross this line to be in
                play.
              </li>
              <li>
                <strong>Backline</strong>: The line at the very bottom of the sheet. Stones that completely cross this
                line are out of play.
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

