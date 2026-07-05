
import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function CinematicBackground() {
  // Mouse parallax setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 30, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 30, damping: 30 });

  // Parallax transforms for different layers
  const layer1X = useTransform(mouseXSpring, (v) => v * 0.01);
  const layer1Y = useTransform(mouseYSpring, (v) => v * 0.01);
  const layer2X = useTransform(mouseXSpring, (v) => v * 0.02);
  const layer2Y = useTransform(mouseYSpring, (v) => v * 0.02);
  const layer3X = useTransform(mouseXSpring, (v) => v * 0.03);
  const layer3Y = useTransform(mouseYSpring, (v) => v * 0.03);
  const layer4X = useTransform(mouseXSpring, (v) => v * 0.04);
  const layer4Y = useTransform(mouseYSpring, (v) => v * 0.04);
  const layer5X = useTransform(mouseXSpring, (v) => v * 0.05);
  const layer5Y = useTransform(mouseYSpring, (v) => v * 0.05);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReduced);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', handleChange);

    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle mouse move for parallax
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isTabActive || reducedMotion) return;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }, [isTabActive, reducedMotion, x, y]);

  const isAnimating = isTabActive && !reducedMotion;

  // Generate rain drops with varying speed/length
  const RainDrops = () => {
    const drops = [];
    const count = reducedMotion ? 40 : 120;
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100;
      const duration = 0.4 + Math.random() * 1.2; // Varying speed
      const delay = Math.random() * 3;
      const opacity = 0.15 + Math.random() * 0.35;
      const length = 8 + Math.random() * 28; // Varying length
      drops.push(
        <motion.div
          key={`rain-${i}`}
          className="absolute"
          style={{
            left: `${left}%`,
            top: `-${length}px`,
            width: '1px',
            height: `${length}px`,
            background: `linear-gradient(to bottom, transparent, rgba(170, 190, 220, ${opacity}))`,
          }}
          animate={isAnimating ? {
            y: ['0vh', '120vh'],
          } : {
            y: '0vh',
          }}
          transition={{
            duration: duration,
            ease: 'linear',
            repeat: Infinity,
            delay: delay,
          }}
        />
      );
    }
    return <>{drops}</>;
  };

  // Generate dust particles
  const DustParticles = () => {
    const particles = [];
    const count = reducedMotion ? 15 : 40;
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const size = 1 + Math.random() * 3;
      const opacity = 0.08 + Math.random() * 0.22;
      const duration = 12 + Math.random() * 24;
      particles.push(
        <motion.div
          key={`dust-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: `rgba(200, 210, 230, ${opacity})`,
          }}
          animate={isAnimating ? {
            x: [0, Math.random() * 15 - 7.5, 0],
            y: [0, Math.random() * 15 - 7.5, 0],
            opacity: [opacity, opacity * 0.4, opacity],
          } : {
            x: 0,
            y: 0,
            opacity: opacity,
          }}
          transition={{
            duration: duration,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: Math.random() * 12,
          }}
        />
      );
    }
    return <>{particles}</>;
  };

  // Generate investigation board lines and softly glowing nodes
  const InvestigationBoard = () => {
    const nodes = [
      { x: 10, y: 15 },
      { x: 30, y: 25 },
      { x: 25, y: 55 },
      { x: 55, y: 20 },
      { x: 70, y: 60 },
      { x: 85, y: 30 },
    ];

    const connections = [
      [0, 1], [1, 2], [1, 3], [3, 4], [4, 5],
    ];

    return (
      <svg className="absolute inset-0 w-full h-full opacity-12" style={{ pointerEvents: 'none' }}>
        {connections.map(([from, to], i) => {
          const x1 = `${nodes[from].x}%`;
          const y1 = `${nodes[from].y}%`;
          const x2 = `${nodes[to].x}%`;
          const y2 = `${nodes[to].y}%`;
          return (
            <motion.line
              key={`line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="5,5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isAnimating ? { pathLength: 1, opacity: 0.7 } : { pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 2, delay: i * 0.2 }}
            />
          );
        })}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <motion.circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="8"
              fill="rgba(6, 182, 212, 0.1)"
              initial={{ scale: 0 }}
              animate={isAnimating ? {
                scale: [1, 1.4, 1],
                opacity: [0.3, 0.6, 0.3],
              } : {
                scale: 1,
                opacity: 0.2,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                delay: 1 + i * 0.2,
                duration: 3,
                repeat: Infinity,
              }}
            />
            <motion.circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="4"
              fill="#06b6d4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 1 + i * 0.2 }}
            />
          </g>
        ))}
      </svg>
    );
  };

  // Evidence markers
  const EvidenceMarkers = () => {
    const markers = [
      { x: 15, y: 80 },
      { x: 88, y: 15 },
      { x: 78, y: 85 },
      { x: 8, y: 20 },
    ];

    return (
      <>
        {markers.map((marker, i) => (
          <div
            key={`evidence-${i}`}
            className="absolute opacity-7"
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
                stroke="#f97316"
                strokeWidth="1.5"
              />
              <text
                x="12"
                y="15"
                textAnchor="middle"
                fill="#f97316"
                fontSize="9"
                fontWeight="bold"
              >
                {i + 1}
              </text>
            </svg>
          </div>
        ))}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{ background: '#050508' }}
    >
      {/* 1. Night city skyline with depth */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-2/3"
        style={{
          x: layer1X,
          y: layer1Y,
        }}
      >
        {/* Skyline layer 1 (far) */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skyline1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0c12" />
              <stop offset="100%" stopColor="#050508" />
            </linearGradient>
          </defs>
          <path d="M0 300 L0 200 L50 200 L50 180 L80 180 L80 160 L100 160 L100 190 L150 190 L150 150 L170 150 L170 200 L220 200 L220 120 L260 120 L260 180 L300 180 L300 140 L350 140 L350 200 L400 200 L400 110 L440 110 L440 170 L480 170 L480 130 L530 130 L530 190 L580 190 L580 100 L620 100 L620 160 L670 160 L670 150 L720 150 L720 200 L770 200 L770 130 L810 130 L810 180 L860 180 L860 110 L900 110 L900 170 L950 170 L950 140 L1000 140 L1000 200 L1050 200 L1050 160 L1100 160 L1100 190 L1150 190 L1150 200 L1200 200 L1200 300 Z" fill="url(#skyline1)" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 w-full h-2/3"
        style={{
          x: layer2X,
          y: layer2Y,
        }}
      >
        {/* Skyline layer 2 (mid) */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 350" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skyline2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f1420" />
              <stop offset="100%" stopColor="#050508" />
            </linearGradient>
          </defs>
          <path d="M0 350 L0 220 L60 220 L60 180 L90 180 L90 200 L130 200 L130 140 L170 140 L170 220 L220 220 L220 100 L280 100 L280 190 L330 190 L330 130 L380 130 L380 200 L430 200 L430 80 L490 80 L490 170 L540 170 L540 120 L600 120 L600 180 L650 180 L650 70 L710 70 L710 160 L760 160 L760 140 L820 140 L820 210 L870 210 L870 90 L930 90 L930 180 L980 180 L980 130 L1040 130 L1040 200 L1090 200 L1090 170 L1140 170 L1140 220 L1200 220 L1200 350 Z" fill="url(#skyline2)" />
        </svg>
      </motion.div>

      {/* 2. Slow moving volumetric fog drifting across buildings */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: layer2X,
          y: layer2Y,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`fog-${i}`}
            className="absolute w-full h-full"
            style={{
              background: `radial-gradient(ellipse at ${15 + i * 30}% ${25 + i * 20}%, rgba(200, 210, 230, ${0.025 + i * 0.015}) 0%, transparent 65%)`,
            }}
            animate={isAnimating ? {
              x: ['-10%', '20%', '-10%'],
            } : {
              x: '0%',
            }}
            transition={{
              duration: 45 + i * 15,
              ease: 'linear',
              repeat: Infinity,
              delay: i * 8,
            }}
          />
        ))}
      </motion.div>

      {/* 3. Rain animation with varying speed/length */}
      <div className="absolute inset-0 overflow-hidden">
        <RainDrops />
      </div>

      {/* 4. Subtle floating dust/ash particles */}
      <div className="absolute inset-0 overflow-hidden">
        <DustParticles />
      </div>

      {/* 5. Very faint fingerprint watermark overlays (3-5% opacity) */}
      <motion.div
        className="absolute top-12 left-12 opacity-4"
        style={{
          x: layer5X,
          y: layer5Y,
        }}
        animate={isAnimating ? {
          rotate: [0, 3, 0],
        } : {
          rotate: 0,
        }}
        transition={{
          duration: 25,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="16" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="8" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-20 opacity-3"
        style={{
          x: layer5X,
          y: layer5Y,
        }}
        animate={isAnimating ? {
          rotate: [0, -3, 0],
        } : {
          rotate: 0,
        }}
        transition={{
          duration: 30,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        <svg width="96" height="96" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#f97316" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#f97316" strokeWidth="0.5" />
        </svg>
      </motion.div>

      {/* 6. Investigation board connection lines with softly glowing nodes */}
      <div className="absolute inset-0">
        <InvestigationBoard />
      </div>

      {/* 7. Evidence markers */}
      <EvidenceMarkers />

      {/* 8. Subtle blue ambient glow - behind logo area */}
      <motion.div
        className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
          x: layer3X,
          y: layer3Y,
        }}
        animate={isAnimating ? {
          opacity: [0.4, 0.7, 0.4],
        } : {
          opacity: 0.3,
        }}
        transition={{
          duration: 10,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />

      {/* 9. Very soft red/blue police light sweep every 10-15 seconds */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, transparent 0%, rgba(6,182,212,0.18) 20%, transparent 40%, rgba(239,68,68,0.12) 60%, transparent 80%)',
          x: layer4X,
          y: layer4Y,
        }}
        animate={isAnimating ? {
          x: ['-150%', '150%'],
        } : {
          x: '-150%',
        }}
        transition={{
          duration: 12,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 3,
        }}
      />

      {/* 10. Extremely subtle animated light rays */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: layer2X,
          y: layer2Y,
        }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute"
            style={{
              top: `${8 + i * 22}%`,
              left: `${12 + i * 35}%`,
              width: '1.5px',
              height: '320px',
              background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.08), transparent)',
              transform: `rotate(${-25 + i * 18}deg)`,
              transformOrigin: 'top center',
            }}
            animate={isAnimating ? {
              opacity: [0, 0.4, 0],
            } : {
              opacity: 0,
            }}
            transition={{
              duration: 8 + i * 2,
              ease: 'easeInOut',
              repeat: Infinity,
              delay: i * 2,
            }}
          />
        ))}
      </motion.div>

      {/* 11. Cinematic vignette around screen edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5,5,8,0.75) 100%)',
        }}
      />

      {/* 12. Animated glass reflection */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.015) 50%, transparent 100%)',
          x: layer1X,
          y: layer1Y,
        }}
        animate={isAnimating ? {
          opacity: [0.25, 0.45, 0.25],
        } : {
          opacity: 0.2,
        }}
        transition={{
          duration: 15,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />
    </div>
  );
}
