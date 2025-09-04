// components/Confetti.js
import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const Confetti = () => {
  useEffect(() => {
    const end = Date.now() + 1 * 1000 // seconds of confetti

    const colors = ['#2dd4bf', '#4f46e5', '#fcd34d']

    ;(function frame() {
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 90,
        origin: { x: 0.5, y: 1 },
        colors: colors
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    })()
  }, [])

  return null
}

export default Confetti
