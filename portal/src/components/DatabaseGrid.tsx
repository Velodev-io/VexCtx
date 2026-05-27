'use client';

import React, { useEffect, useState } from 'react';

type CellState = 'empty' | 'active' | 'indexed' | 'pruned';

export default function DatabaseGrid() {
  const [grid, setGrid] = useState<CellState[]>([]);
  const rows = 12;
  const cols = 12;
  const totalCells = rows * cols;

  useEffect(() => {
    // Initialize the grid with mostly indexed (green) cells on the bottom and empty cells on top
    const initialGrid: CellState[] = [];
    for (let i = 0; i < totalCells; i++) {
      const rowIdx = Math.floor(i / cols);
      if (rowIdx > 8) {
        // Lower rows are already indexed
        initialGrid.push(Math.random() > 0.15 ? 'indexed' : 'empty');
      } else if (rowIdx > 4) {
        initialGrid.push(Math.random() > 0.6 ? 'indexed' : 'empty');
      } else {
        initialGrid.push('empty');
      }
    }
    setGrid(initialGrid);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const runSimulationLoop = () => {
      // Pick a random operation: Ingestion/Indexing OR Compaction/Pruning
      const isCompacting = Math.random() > 0.65;

      setGrid((prev) => {
        const nextGrid = [...prev];

        if (isCompacting) {
          // 1. Simulate Compaction: move everything down, fill empty gaps
          for (let c = 0; c < cols; c++) {
            const columnStates: CellState[] = [];
            // Extract column
            for (let r = 0; r < rows; r++) {
              const state = prev[r * cols + c];
              if (state !== 'empty' && state !== 'pruned') {
                columnStates.push(state);
              }
            }
            // Fill bottom rows of this column with the remaining states, and top rows with empty
            const emptyCount = rows - columnStates.length;
            for (let r = 0; r < rows; r++) {
              if (r < emptyCount) {
                nextGrid[r * cols + c] = 'empty';
              } else {
                nextGrid[r * cols + c] = columnStates[r - emptyCount];
              }
            }
          }
        } else {
          // 2. Simulate Ingestion: activate cells in top rows, then turn them green (indexed)
          // Pick a random column to ingest events
          const targetCol = Math.floor(Math.random() * cols);
          for (let r = 0; r < 4; r++) {
            const cellIdx = r * cols + targetCol;
            nextGrid[cellIdx] = 'active'; // Orange glow
          }

          // Convert active cells to indexed cells after a short delay
          setTimeout(() => {
            setGrid((current) => {
              const updated = [...current];
              for (let i = 0; i < totalCells; i++) {
                if (updated[i] === 'active') {
                  updated[i] = 'indexed';
                }
              }
              return updated;
            });
          }, 800);
        }

        // Randomly prune (turn a few cells red/empty to simulate retention deletion)
        if (Math.random() > 0.75) {
          const pruneCount = 2 + Math.floor(Math.random() * 4);
          for (let k = 0; k < pruneCount; k++) {
            const randIdx = Math.floor(Math.random() * totalCells);
            if (nextGrid[randIdx] === 'indexed') {
              nextGrid[randIdx] = 'pruned';
              // After a short timeout, make them empty
              setTimeout(() => {
                setGrid((current) => {
                  const updated = [...current];
                  if (updated[randIdx] === 'pruned') {
                    updated[randIdx] = 'empty';
                  }
                  return updated;
                });
              }, 600);
            }
          }
        }

        return nextGrid;
      });
    };

    intervalId = setInterval(runSimulationLoop, 2000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      className="deck-panel deck-panel-blue crt-monitor"
      style={{
        width: '100%',
        height: '320px',
        backgroundColor: '#0c0d12',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'hidden'
      }}
    >
      {/* Scanline CRT overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }} className="crt-bloom" />

      {/* Grid labels */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          zIndex: 6
        }}
      >
        [SQLITE_COMPACTION_BLOCK_INDEX]
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--text-muted)',
          zIndex: 6
        }}
      >
        <span>STATUS: DEFRAG_AUTO</span>
        <span>SECTOR: 12x12 CELLS</span>
      </div>

      {/* Actual Block Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '4px',
          width: '180px',
          height: '180px',
          zIndex: 4,
          backgroundColor: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.04)',
          padding: '6px'
        }}
      >
        {grid.map((state, idx) => {
          let backgroundColor = 'rgba(255, 255, 255, 0.02)';
          let borderColor = 'rgba(255, 255, 255, 0.04)';
          let boxShadow = 'none';

          if (state === 'active') {
            backgroundColor = 'var(--accent-orange)';
            borderColor = 'var(--accent-orange)';
            boxShadow = '0 0 8px var(--accent-orange-glow)';
          } else if (state === 'indexed') {
            backgroundColor = 'rgba(0, 255, 102, 0.25)';
            borderColor = 'var(--accent-green)';
            boxShadow = 'inset 0 0 2px var(--accent-green-glow)';
          } else if (state === 'pruned') {
            backgroundColor = 'rgba(239, 68, 68, 0.4)';
            borderColor = '#ef4444';
            boxShadow = '0 0 8px rgba(239, 68, 68, 0.3)';
          }

          return (
            <div
              key={idx}
              style={{
                backgroundColor,
                border: `1px solid ${borderColor}`,
                boxShadow,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                width: '100%',
                height: '100%'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
