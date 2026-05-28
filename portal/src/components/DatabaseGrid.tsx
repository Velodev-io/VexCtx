'use client';

import React, { useEffect, useState } from 'react';

type CellState = 'empty' | 'active' | 'indexed' | 'pruned';

export default function DatabaseGrid({ retentionDays = 30 }: { retentionDays?: string | number }) {
  const [grid, setGrid] = useState<CellState[]>([]);
  const rows = 12;
  const cols = 12;
  const totalCells = rows * cols;

  useEffect(() => {
    // Determine max filled rows based on retentionDays
    let maxFilledRows = 6;
    if (retentionDays === 7) maxFilledRows = 3;
    else if (retentionDays === 30) maxFilledRows = 6;
    else if (retentionDays === 90) maxFilledRows = 9;
    else if (retentionDays === 'Permanent') maxFilledRows = 11;

    const initialGrid: CellState[] = [];
    for (let i = 0; i < totalCells; i++) {
      const rowIdx = Math.floor(i / cols);
      const distanceFromBottom = rows - 1 - rowIdx;
      if (distanceFromBottom < maxFilledRows) {
        initialGrid.push(Math.random() > 0.25 ? 'indexed' : 'empty');
      } else {
        initialGrid.push('empty');
      }
    }
    setGrid(initialGrid);
  }, [retentionDays]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const runSimulationLoop = () => {
      const isCompacting = Math.random() > 0.65;

      setGrid((prev) => {
        const nextGrid = [...prev];

        // Determine max allowed rows based on retentionDays
        let maxAllowedRows = 6;
        if (retentionDays === 7) maxAllowedRows = 3;
        else if (retentionDays === 30) maxAllowedRows = 6;
        else if (retentionDays === 90) maxAllowedRows = 9;
        else if (retentionDays === 'Permanent') maxAllowedRows = 11;

        if (isCompacting) {
          // 1. Simulate Compaction: move everything down, fill empty gaps, prune overflow
          for (let c = 0; c < cols; c++) {
            const columnStates: CellState[] = [];
            for (let r = 0; r < rows; r++) {
              const state = prev[r * cols + c];
              if (state !== 'empty' && state !== 'pruned') {
                columnStates.push(state);
              }
            }

            // Prune top rows if exceeding local retention capacity limits
            if (columnStates.length > maxAllowedRows) {
              columnStates.splice(0, columnStates.length - maxAllowedRows);
            }

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
          const targetCol = Math.floor(Math.random() * cols);
          
          // Calculate top empty cell in the column
          let targetRow = -1;
          for (let r = rows - 1; r >= 0; r--) {
            if (prev[r * cols + targetCol] === 'empty') {
              targetRow = r;
              break;
            }
          }

          // If there is room, add active ingest particles
          if (targetRow >= 0) {
            const startRow = Math.max(0, targetRow - 2);
            for (let r = startRow; r <= targetRow; r++) {
              nextGrid[r * cols + targetCol] = 'active'; // Orange glow
            }

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
        }

        // Randomly prune cells to simulate active database maintenance
        if (Math.random() > 0.75) {
          const pruneCount = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < pruneCount; k++) {
            const randIdx = Math.floor(Math.random() * totalCells);
            if (nextGrid[randIdx] === 'indexed') {
              nextGrid[randIdx] = 'pruned';
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
  }, [retentionDays]);

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
          color: 'var(--accent-cyan)',
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
            backgroundColor = 'rgba(223, 159, 40, 0.15)';
            borderColor = 'rgba(223, 159, 40, 0.4)';
            boxShadow = 'inset 0 0 2px var(--accent-cyan-glow)';
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
                height: '100%',
                borderRadius: '2px'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
