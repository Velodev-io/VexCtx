'use client';

import React, { useState, useEffect } from 'react';

interface TerminalLine {
  text: string;
  type: 'input' | 'output' | 'success' | 'info';
  delay?: number;
}

const SIMULATION_SCRIPTS: TerminalLine[][] = [
  // Script 1: Database Status Check
  [
    { text: 'vexctx status', type: 'input' },
    { text: 'Checking local VexCTX daemon daemon services...', type: 'info' },
    { text: '● SQLite storage engine: ONLINE (encrypted, AES-256-GCM)', type: 'success' },
    { text: '● Local FTS5 indexing: ACTIVE (621 documents registered)', type: 'success' },
    { text: '● Vector indexing: ACTIVE (Qdrant memory store)', type: 'success' },
    { text: '● Privacy blacklist: LOADED (excludes credit-cards, banking, pass managers)', type: 'success' },
    { text: '● Active capture streams: Chrome (Claude.ai, ChatGPT) | status: 100% active', type: 'info' }
  ],
  // Script 2: Local Keyword Retrieval Query
  [
    { text: 'vexctx query "lifespan config"', type: 'input' },
    { text: 'Searching decrypted timeline events via Hybrid FTS5 + RRF...', type: 'info' },
    { text: '2 events located matching "lifespan config":', type: 'info' },
    { text: '----------------------------------------', type: 'info' },
    { text: '[Event #312] Source: VSCode | Time: 2h ago', type: 'success' },
    { text: '  - filepath: vexctx/main.py#L42', type: 'info' },
    { text: '  - code excerpt:', type: 'info' },
    { text: '    + async def lifespan(app: FastAPI):', type: 'success' },
    { text: '    +     await setup_database()', type: 'success' },
    { text: '    +     yield', type: 'success' },
    { text: '----------------------------------------', type: 'info' },
    { text: '[Event #124] Source: Claude.ai (Extension) | Time: 1d ago', type: 'success' },
    { text: '  - user_prompt: "How do I fix a Redis timeout in my FastAPI lifespan?"', type: 'info' }
  ],
  // Script 3: SQLite compaction & Pruning
  [
    { text: 'vexctx db compact --retention=30', type: 'input' },
    { text: 'Scanning local storage records older than 30 days...', type: 'info' },
    { text: 'Deleted 142 records from events table.', type: 'success' },
    { text: 'Purged 142 vectors from Qdrant vector space.', type: 'success' },
    { text: 'VACUUM database file completed.', type: 'success' },
    { text: 'Local disk space reclaimed: 14.2 MB.', type: 'success' }
  ]
];

export default function SearchSimulator() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentScriptIdx, setCurrentScriptIdx] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [triggerFlicker, setTriggerFlicker] = useState(false);

  useEffect(() => {
    let active = true;
    
    const runSimulation = async () => {
      // Clear lines and start typing new script input line
      setLines([]);
      const script = SIMULATION_SCRIPTS[currentScriptIdx];
      const inputLine = script[0];
      
      setIsTyping(true);
      setTypingInput('');
      
      // Simulate typewriter effect for input command
      for (let i = 0; i <= inputLine.text.length; i++) {
        if (!active) return;
        setTypingInput(inputLine.text.substring(0, i));
        await new Promise((r) => setTimeout(r, 60 + Math.random() * 50));
      }
      
      setIsTyping(false);
      
      // Trigger CRT screen flicker when command is "submitted"
      setTriggerFlicker(true);
      setTimeout(() => setTriggerFlicker(false), 200);

      // Append input line to log list
      setLines([{ text: `$ ${inputLine.text}`, type: 'input' }]);
      setTypingInput('');

      // Render output lines with slight delays
      for (let i = 1; i < script.length; i++) {
        if (!active) return;
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 250));
        setLines((prev) => [...prev, script[i]]);
      }

      // Hold output display, then go to next script
      await new Promise((r) => setTimeout(r, 4500));
      if (!active) return;
      setCurrentScriptIdx((prev) => (prev + 1) % SIMULATION_SCRIPTS.length);
    };

    runSimulation();

    return () => {
      active = false;
    };
  }, [currentScriptIdx]);

  return (
    <div
      className="deck-panel deck-panel-orange crt-monitor"
      style={{
        width: '100%',
        minHeight: '320px',
        backgroundColor: '#0c0d12',
        padding: '20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        lineHeight: '1.4',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Screen scanlines and bloom glow */}
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 5, 
          pointerEvents: 'none',
          animation: triggerFlicker ? 'crt-flicker 0.05s infinite' : 'none',
          opacity: triggerFlicker ? 0.3 : 1
        }} 
        className="crt-bloom" 
      />

      {/* Terminal Title Bar */}
      <div
        style={{
          borderBottom: '1px solid var(--border-muted)',
          paddingBottom: '10px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--accent-orange)'
        }}
      >
        <span>[VexCTX CLI Console v1.0.6]</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <span className="led led-orange" />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ONLINE</span>
        </div>
      </div>

      {/* Terminal Logs View */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          paddingBottom: '20px'
        }}
      >
        {lines.map((line, idx) => {
          let color = 'var(--text-primary)';
          if (line.type === 'input') color = 'var(--accent-orange)';
          else if (line.type === 'success') color = 'var(--accent-green)';
          else if (line.type === 'info') color = 'var(--text-secondary)';

          return (
            <div
              key={idx}
              style={{
                color,
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
                textShadow: line.type === 'input' ? '0 0 4px var(--accent-orange-glow)' : 'none'
              }}
            >
              {line.text}
            </div>
          );
        })}

        {/* Typing Line */}
        {isTyping && (
          <div style={{ color: 'var(--accent-orange)', textShadow: '0 0 4px var(--accent-orange-glow)' }}>
            $ {typingInput}
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '13px',
                backgroundColor: 'var(--accent-orange)',
                marginLeft: '4px',
                animation: 'led-blink 1s infinite steps(2)'
              }}
            />
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          paddingTop: '6px'
        }}
      >
        <span>SECURE VAULT: LOCKED</span>
        <span>INDEX COUNT: 621 EVENTS</span>
      </div>
    </div>
  );
}
