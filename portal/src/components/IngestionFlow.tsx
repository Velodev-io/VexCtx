'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
}

export default function IngestionFlow({ retentionDays = 30 }: { retentionDays?: string | number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pulseShield, setPulseShield] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Source nodes positioning
  const sources = [
    { name: 'Claude', y: 15, color: '#d97706' },     // Amber
    { name: 'ChatGPT', y: 50, color: '#10b981' },    // Emerald
    { name: 'Gemini', y: 85, color: '#2563eb' }      // Blue
  ];

  useEffect(() => {
    let particleId = 0;
    
    // Spawn particles periodically
    const interval = setInterval(() => {
      // Pick a random source
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      const newParticle: Particle = {
        id: particleId++,
        startX: 12, // Starting percent X (source icons are on the left)
        startY: source.y,
        x: 12,
        y: source.y,
        progress: 0,
        speed: 0.007 + Math.random() * 0.008,
        size: 2 + Math.random() * 3,
        color: source.color
      };

      setParticles((prev) => [...prev, newParticle]);
    }, 450);

    return () => clearInterval(interval);
  }, []);

  // Update loop
  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      setParticles((prev) => {
        const nextParticles: Particle[] = [];
        
        for (let i = 0; i < prev.length; i++) {
          const p = prev[i];
          const nextProgress = p.progress + p.speed;

          if (nextProgress >= 1) {
            // Trigger target shield flash when particle completes flow
            setPulseShield(true);
            setTimeout(() => setPulseShield(false), 150);
            continue; // Particle reached the vault, delete it
          }

          // Bezier curve calculations for natural flow paths
          // start: {12, p.startY}, end: {88, 50}
          const t = nextProgress;
          const cpX1 = 45; // Control point 1
          const cpY1 = p.startY;
          const cpX2 = 55; // Control point 2
          const cpY2 = 50;

          // Cubic Bezier path
          const curX = (1-t)**3 * p.startX + 3*(1-t)**2 * t * cpX1 + 3*(1-t) * t**2 * cpX2 + t**3 * 88;
          const curY = (1-t)**3 * p.startY + 3*(1-t)**2 * t * cpY1 + 3*(1-t) * t**2 * cpY2 + t**3 * 50;

          nextParticles.push({
            ...p,
            progress: nextProgress,
            x: curX,
            y: curY
          });
        }
        
        return nextParticles;
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="deck-panel deck-panel-green crt-monitor"
      style={{
        width: '100%',
        height: '320px',
        position: 'relative',
        backgroundColor: '#07090e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'hidden'
      }}
    >
      {/* SVG Canvas overlay */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        {/* Draw connection paths */}
        {sources.map((s, idx) => (
          <path
            key={idx}
            d={`M 12% ${s.y}% C 45% ${s.y}%, 55% 50%, 88% 50%`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.025)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
        ))}

        {/* Render particles moving along paths */}
        {particles.map((p) => (
          <circle
            key={p.id}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.size}
            fill={p.color}
            style={{
              filter: `drop-shadow(0 0 4px ${p.color})`,
              opacity: p.progress < 0.1 ? p.progress * 10 : p.progress > 0.9 ? (1 - p.progress) * 10 : 1
            }}
          />
        ))}
      </svg>

      {/* Grid structure overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} className="crt-bloom" />

      {/* Interface Labels */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-green)',
          zIndex: 5
        }}
      >
        [CAPTURE_DAEMON_INGESTION_FLOW]
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          zIndex: 5
        }}
      >
        ACTIVE BRIDGES: 3 | RETENTION: {retentionDays === 'Permanent' || retentionDays === 0 || retentionDays === -1 || retentionDays === 'Permanent' ? 'PERM' : `${retentionDays}D`}
      </div>

      {/* Content wrapper */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 4,
          padding: '0 4%'
        }}
      >
        {/* Source Nodes Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {sources.map((s, idx) => (
            <div
              key={idx}
              style={{
                width: '45px',
                height: '45px',
                border: '1px solid var(--border-muted)',
                backgroundColor: 'rgba(255,255,255,0.01)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: s.color,
                fontWeight: 'bold',
                position: 'relative'
              }}
              title={s.name}
            >
              {/* LED connection status light */}
              <div
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px'
                }}
                className="led led-green"
              />
              {s.name.substring(0, 3).toUpperCase()}
            </div>
          ))}
        </div>

        {/* Target Shield Daemon Node */}
        <div
          style={{
            width: '70px',
            height: '70px',
            border: `1.5px solid ${pulseShield ? 'var(--accent-green)' : 'var(--border-muted)'}`,
            boxShadow: pulseShield ? '0 0 15px var(--accent-green-glow)' : 'none',
            backgroundColor: 'var(--accent-green-glow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent-green)'
            }}
          >
            VAULT
          </div>
          <div
            style={{
              fontSize: '9px',
              color: 'var(--text-secondary)',
              marginTop: '2px'
            }}
          >
            DAEMON
          </div>
        </div>
      </div>
    </div>
  );
}
