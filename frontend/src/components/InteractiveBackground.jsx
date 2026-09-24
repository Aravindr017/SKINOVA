import React, { useEffect, useState, useRef } from 'react';

/**
 * InteractiveBackground:
 * Renders a soothing, light-tinted, light-white masked bio-mesh background
 * with interactive elements (cursor-following ambient glow, floating nodes,
 * and subtle click ripples).
 *
 * Ensures all cards and text across all sections remain 100% visible and readable.
 */
export default function InteractiveBackground({ children }) {
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const handlePointerMove = (e) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
        if (!isHovered) setIsHovered(true);
      });
    };

    const handlePointerLeave = () => {
      setIsHovered(false);
    };

    const handleClick = (e) => {
      // Add a subtle expanding ripple
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-3), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 1200);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('click', handleClick, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('click', handleClick);
    };
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      className="interactive-bg-wrapper relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: `
          radial-gradient(circle at 10% 15%, rgba(204, 251, 241, 0.45) 0%, transparent 40%),
          radial-gradient(circle at 90% 85%, rgba(224, 242, 254, 0.5) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(241, 245, 249, 0.6) 0%, transparent 70%)
        `,
      }}
    >
      {/* ── 1. Light-White Masked Geometric Mesh Layer ────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
        style={{
          opacity: 0.85,
          backgroundImage: `
            radial-gradient(rgba(13, 148, 136, 0.07) 1.2px, transparent 1.2px),
            radial-gradient(rgba(148, 163, 184, 0.08) 1.2px, transparent 1.2px)
          `,
          backgroundSize: '32px 32px, 64px 64px',
          backgroundPosition: '0 0, 16px 16px',
          maskImage: 'radial-gradient(ellipse 90% 85% at 50% 50%, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 85% at 50% 50%, black 60%, transparent 100%)',
        }}
      />

      {/* Subtle SVG Bio-Hexagon Light Mask Overlay */}
      <svg
        className="pointer-events-none fixed inset-0 w-full h-full z-0 opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="skinova-mesh" width="56" height="96" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
            <path
              d="M28,0 L56,16 L56,48 L28,64 L0,48 L0,16 Z M28,64 L56,80 L56,112 L28,128 L0,112 L0,80 Z"
              fill="none"
              stroke="#0D9488"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#skinova-mesh)" />
      </svg>

      {/* ── 2. Interactive Cursor-Following Luminous Spotlight ─ */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0.4,
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(20, 184, 166, 0.09) 0%, rgba(6, 182, 212, 0.05) 35%, rgba(248, 250, 252, 0) 70%)`,
        }}
      />

      {/* ── 3. Subtle Floating Ambient Orbs (Gentle Motion) ──── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top-Right Orb */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-40 animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.3), rgba(56, 189, 248, 0.2))',
            animationDuration: '9s',
          }}
        />

        {/* Bottom-Left Orb */}
        <div
          className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full blur-3xl opacity-35 animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(94, 234, 212, 0.2))',
            animationDuration: '12s',
            animationDelay: '2s',
          }}
        />

        {/* Interactive Floating Micro-Nodes */}
        <div
          className="absolute top-1/4 left-1/6 w-2.5 h-2.5 rounded-full bg-teal-400/25 blur-[1px] animate-float"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-cyan-400/20 blur-[1px] animate-float"
          style={{ animationDuration: '8s', animationDelay: '1.5s' }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-emerald-400/20 blur-[1px] animate-float"
          style={{ animationDuration: '7s', animationDelay: '3s' }}
        />
      </div>

      {/* ── 4. Interactive Click Ripples ─────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - 30,
              top: ripple.y - 30,
              width: 60,
              height: 60,
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%)',
              animation: 'skinova-ripple 1.1s cubic-bezier(0, 0.2, 0.8, 1) forwards',
            }}
          />
        ))}
      </div>

      {/* ── 5. Application Foreground Content ─────────────────── */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>

      {/* Embedded CSS for the interactive ripple effect */}
      <style>{`
        @keyframes skinova-ripple {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(7);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
