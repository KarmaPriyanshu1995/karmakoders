import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Loader({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setDone(true)
            setTimeout(onComplete, 600)
          }, 300)
          return 100
        }
        return p + Math.random() * 15
      })
    }, 80)
    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#030711' }}
        >
          {/* Background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="orb w-96 h-96 -top-20 -left-20" style={{ background: '#5b60fa' }} />
            <div className="orb w-80 h-80 -bottom-20 -right-20" style={{ background: '#a855f7', animationDelay: '3s' }} />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5b60fa, #a855f7)' }}>
                <span className="text-white font-bold text-2xl font-display">K</span>
              </div>
              <span className="text-white font-display font-bold text-2xl tracking-widest uppercase">
                Karma<span className="gradient-text">koders</span>
              </span>
            </motion.div>

            {/* Progress bar */}
            <div className="w-64">
              <div className="h-px bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #5b60fa, #a855f7, #00d4ff)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="mt-2 text-center text-xs text-white/30 tabular-nums">
                {Math.min(Math.round(progress), 100)}%
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white/30 text-xs tracking-widest uppercase"
            >
              Loading Experience...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
