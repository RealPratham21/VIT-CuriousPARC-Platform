'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface CommandStageProps {
  children: ReactNode
  viewKey: string
}

export function CommandStage({ children, viewKey }: CommandStageProps) {
  return (
    <div className="flex-1 h-full overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewKey}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.4,
          }}
          className="h-full overflow-auto"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
