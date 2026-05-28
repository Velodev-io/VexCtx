'use client';

import React, { useEffect, useRef } from 'react';

export default function VectorNet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Drifting points grid
    const spacing = 80; // Grid density
    const points: Array<{
      x: number;
      y: number;
      ox: number; // Anchor x
      oy: number; // Anchor y
      phaseX: number; // Unique trigonometric phase
      phaseY: number;
      speed: number;
    }> = [];

    // Initialize grid of points
    const initGrid = () => {
      points.length = 0;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      for (let c = -1; c < cols; c++) {
        for (let r = -1; r < rows; r++) {
          const px = c * spacing;
          const py = r * spacing;
          points.push({
            x: px,
            y: py,
            ox: px,
            oy: py,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.003
          });
        }
      }
    };

    initGrid();

    // Mouse tracker
    const mouse = {
      x: -9999,
      y: -9999,
      tx: -9999, // Target x
      ty: -9999, // Target y
      active: false
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.tx = -9999;
      mouse.ty = -9999;
      mouse.active = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    let time = 0;
    const maxDistance = 75; // Connect lines within this distance

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      if (mouse.active) {
        if (mouse.x === -9999) {
          mouse.x = mouse.tx;
          mouse.y = mouse.ty;
        } else {
          mouse.x += (mouse.tx - mouse.x) * 0.1;
          mouse.y += (mouse.ty - mouse.y) * 0.1;
        }
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      // 1. Update points positioning with waves + mouse repulsion
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Drifting wave motion
        p.phaseX += p.speed;
        p.phaseY += p.speed;
        const driftX = Math.sin(p.phaseX) * 12;
        const driftY = Math.cos(p.phaseY) * 12;

        let targetX = p.ox + driftX;
        let targetY = p.oy + driftY;

        // Apply mouse lens distortion (push away slightly to look 3D)
        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const forceRadius = 180;

          if (dist < forceRadius) {
            const force = (forceRadius - dist) / forceRadius;
            // Push points outward from mouse coordinates
            targetX += (dx / dist) * force * 35;
            targetY += (dy / dist) * force * 35;
          }
        }

        p.x = targetX;
        p.y = targetY;
      }

      // 2. Draw connections and constellation lines
      ctx.lineWidth = 0.8;
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // Scan surrounding points to build network lines
        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            // Draw connection line with opacity based on distance
            const alpha = (1 - dist / maxDistance) * 0.05;
            ctx.strokeStyle = `rgba(223, 159, 40, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Occasionally draw a traveling light packet along the connection path
            if ((time + i + j) % 650 === 0) {
              const pulsePos = (time % 100) / 100;
              const px = p1.x + (p2.x - p1.x) * pulsePos;
              const py = p1.y + (p2.y - p1.y) * pulsePos;
              
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(223, 159, 40, 0.4)';
              ctx.fill();
            }
          }
        }
      }

      // 3. Draw active nodes
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Only draw node points if they are close to mouse interaction radius
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const glowOpacity = (1 - dist / 140) * 0.25;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(223, 159, 40, ${glowOpacity})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
