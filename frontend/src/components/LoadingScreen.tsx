import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

export default function LoadingScreen({ message = 'Investigating...', progress }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated magnifying glass */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="relative w-32 h-32 mx-auto mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
            <div className="absolute inset-2 border-4 border-primary/50 rounded-full border-t-transparent" />
            <div className="absolute inset-4 border-4 border-primary/70 rounded-full border-t-transparent border-r-transparent" />
          </motion.div>
          <Search className="absolute inset-0 m-auto w-16 h-16 text-primary" />
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold gradient-text mb-2">{message}</h2>
          
          {/* Progress bar */}
          {progress !== undefined && (
            <div className="w-64 mx-auto mb-4">
              <div className="h-2 bg-surfaceLight rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-textMuted mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Animated dots */}
          {!progress && (
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Detective quotes */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-textMuted text-sm mt-8 italic"
        >
          "The truth is always hidden in plain sight."
        </motion.p>
      </div>
    </div>
  );
}
