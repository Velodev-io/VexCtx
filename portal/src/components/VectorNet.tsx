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

    // Grid details
    const spacing = 60; // Space between points
    const points: Array<{
      x: number;
      y: number;
      ox: number; // Original x
      oy: number; // Original y
      vx: number; // Velocity x
      vy: number; // Velocity y
    }> = [];

    // Initialize points grid
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const px = c * spacing;
        const py = r * spacing;
        points.push({
          x: px,
          y: py,
          ox: px,
          oy: py,
          vx: 0,
          vy: 0,
        });
      }
    }

    // Mouse coordinates tracker
    const mouse = {
      x: -9999,
      y: -9999,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.active = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Reinitialize points list to match size
      points.length = 0;
      const newCols = Math.ceil(width / spacing) + 1;
      const newRows = Math.ceil(height / spacing) + 1;
      for (let c = 0; c < newCols; c++) {
        for (let r = 0; r < newRows; r++) {
          const px = c * spacing;
          const py = r * spacing;
          points.push({
            x: px,
            y: py,
            ox: px,
            oy: py,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const pullRadius = 130;
    const springTension = 0.03;
    const friction = 0.88;

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update points physics
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < pullRadius) {
            // Apply magnetic gravity vector towards mouse
            const force = (pullRadius - dist) / pullRadius;
            p.vx += (dx / dist) * force * 1.5;
            p.vy += (dy / dist) * force * 1.5;
          }
        }

        // Spring force returning home
        const homedx = p.ox - p.x;
        const homedy = p.oy - p.y;
        p.vx += homedx * springTension;
        p.vy += homedy * springTension;

        // Apply friction & update position
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;
      }

      // 2. Draw Vector Net Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      
      const colsCount = Math.ceil(width / spacing) + 1;
      const rowsCount = Math.ceil(height / spacing) + 1;

      for (let c = 0; c < colsCount; c++) {
        for (let r = 0; r < rowsCount; r++) {
          const idx = c * rowsCount + r;
          const p1 = points[idx];
          if (!p1) continue;

          // Connect to right neighbor
          if (c < colsCount - 1) {
            const pRight = points[(c + 1) * rowsCount + r];
            if (pRight) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(pRight.x, pRight.y);
              ctx.stroke();
            }
          }

          // Connect to bottom neighbor
          if (r < rowsCount - 1) {
            const pBottom = points[c * rowsCount + r + 1];
            if (pBottom) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(pBottom.x, pBottom.y);
              ctx.stroke();
            }
          }
        }
      }

      // 3. Draw Nodes (highly transparent amber or green dots when close to mouse)
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = p.x - p.ox;
        const dy = p.y - p.oy;
        const displacement = Math.sqrt(dx * dx + dy * dy);

        if (displacement > 0.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
          // Highlight nodes with amber/orange glow if they are actively displaced by mouse
          const opacity = Math.min(displacement / 10, 0.35);
          ctx.fillStyle = `rgba(255, 69, 0, ${opacity})`;
          ctx.fill();
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
