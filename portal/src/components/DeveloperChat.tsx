'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'alex' | 'sarah';
  text: string;
  code?: string;
  reactions?: string[];
}

export default function DeveloperChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUser, setTypingUser] = useState<'alex' | 'sarah' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [currentStage, setCurrentStage] = useState(0);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    if (feedContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
    }
  };

  const stages = [
    // 0. Alex types first message
    {
      action: 'type',
      sender: 'alex',
      text: "claude just forgot my api schema for the 3rd time today. i'm literally losing my mind.",
      delay: 50
    },
    // 1. Alex sends first message
    {
      action: 'send',
      sender: 'alex',
      text: "claude just forgot my api schema for the 3rd time today. i'm literally losing my mind."
    },
    // 2. Sarah is typing
    {
      action: 'typing_indicator',
      sender: 'sarah',
      duration: 1500
    },
    // 3. Sarah sends response
    {
      action: 'send',
      sender: 'sarah',
      text: "Let me guess: 'How do I fix a Redis timeout in my FastAPI lifespan?' 💀"
    },
    // 4. Alex types response
    {
      action: 'type',
      sender: 'alex',
      text: "exactly! i'm copy-pasting the same config file for the 5th time. i feel like a prompt secretary.",
      delay: 40
    },
    // 5. Alex sends response
    {
      action: 'send',
      sender: 'alex',
      text: "exactly! i'm copy-pasting the same config file for the 5th time. i feel like a prompt secretary."
    },
    // 6. Sarah is typing
    {
      action: 'typing_indicator',
      sender: 'sarah',
      duration: 1800
    },
    // 7. Sarah sends pitch
    {
      action: 'send',
      sender: 'sarah',
      text: "Why aren't you using VexCTX? It runs locally, captures terminal & IDE events, and feeds context automatically. Zero prompt copying."
    },
    // 8. Sarah sends code example immediately
    {
      action: 'send',
      sender: 'sarah',
      text: "You just capture details via simple client calls directly from your workspace logs:",
      code: `from vexctx import VexCTXClient

client = VexCTXClient(token="local_secure_token")
client.capture_event(
    event_type="ai_prompt",
    source_app="vscode",
    content="FastAPI Redis lifespan integration",
    project_id="main_vault"
)`
    },
    // 9. Alex types security question
    {
      action: 'type',
      sender: 'alex',
      text: "wait, does it sync to a cloud? my company has strict security rules.",
      delay: 45
    },
    // 10. Alex sends security question
    {
      action: 'send',
      sender: 'alex',
      text: "wait, does it sync to a cloud? my company has strict security rules."
    },
    // 11. Sarah is typing
    {
      action: 'typing_indicator',
      sender: 'sarah',
      duration: 1600
    },
    // 12. Sarah explains security
    {
      action: 'send',
      sender: 'sarah',
      text: "Nope, 100% offline. Encrypted SQLite database + local Qdrant memory. Zero trackers, zero cloud egress. Totally safe."
    },
    // 13. Alex types reaction
    {
      action: 'type',
      sender: 'alex',
      text: "okay, this is actually massive. installing it now.",
      delay: 50
    },
    // 14. Alex sends reaction
    {
      action: 'send',
      sender: 'alex',
      text: "okay, this is actually massive. installing it now."
    },
    // 15. Alex reacts to Sarah's pitch
    {
      action: 'react',
      targetMsgIdx: 4, // index of Sarah's VexCTX pitch message (id is generated dynamically)
      emoji: '🤯'
    },
    // 16. Wait and loop
    {
      action: 'wait',
      duration: 8000
    }
  ];

  useEffect(() => {
    let active = true;

    const runStage = async (stageIdx: number) => {
      if (!active) return;
      
      // If we reached the end, reset and loop
      if (stageIdx >= stages.length) {
        setMessages([]);
        setInputValue('');
        setTypingUser(null);
        setCurrentStage(0);
        isAtBottomRef.current = true;
        return;
      }

      const stage = stages[stageIdx];

      if (stage.action === 'type') {
        setTypingUser(stage.sender as 'alex' | 'sarah');
        setInputValue('');
        
        let chars = '';
        if (stage.text) {
          for (let i = 0; i < stage.text.length; i++) {
            if (!active) return;
            chars += stage.text[i];
            setInputValue(chars);
            await new Promise((r) => setTimeout(r, stage.delay || 40));
          }
        }
        
        // Brief pause after typing finishes before sending
        await new Promise((r) => setTimeout(r, 600));
        setCurrentStage(stageIdx + 1);

      } else if (stage.action === 'send') {
        setTypingUser(null);
        setInputValue('');
        
        const newMsg: Message = {
          id: `msg-${stageIdx}-${Date.now()}`,
          sender: stage.sender as 'alex' | 'sarah',
          text: stage.text || '',
          code: stage.code,
          reactions: []
        };
        
        setMessages((prev) => [...prev, newMsg]);
        
        await new Promise((r) => setTimeout(r, 800));
        setCurrentStage(stageIdx + 1);

      } else if (stage.action === 'typing_indicator') {
        setTypingUser(stage.sender as 'alex' | 'sarah');
        await new Promise((r) => setTimeout(r, stage.duration || 1500));
        setTypingUser(null);
        setCurrentStage(stageIdx + 1);

      } else if (stage.action === 'react') {
        setMessages((prev) => {
          const next = [...prev];
          // Find message to react to: we want to find the message by sender sarah that matches VexCTX pitch
          const targetMsg = next.find((m) => m.text.includes("VexCTX?"));
          if (targetMsg) {
            targetMsg.reactions = [...(targetMsg.reactions || []), stage.emoji || ''];
          }
          return next;
        });
        
        await new Promise((r) => setTimeout(r, 1200));
        setCurrentStage(stageIdx + 1);

      } else if (stage.action === 'wait') {
        await new Promise((r) => setTimeout(r, stage.duration || 5000));
        setCurrentStage(0); // Restart loop
      }
    };

    runStage(currentStage);

    return () => {
      active = false;
    };
  }, [currentStage]);

  // Scroll container to bottom of chat feed when new messages arrive (only if scroll lock is active)
  useEffect(() => {
    if (feedContainerRef.current && isAtBottomRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  return (
    <section style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>
          Why VexCTX? Ask Your Team.
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          A typical developer slack channel conversation simulated in real-time.
        </p>
      </div>

      <div
        className="deck-panel"
        style={{
          width: '100%',
          maxWidth: '850px',
          margin: '0 auto',
          height: '480px',
          backgroundColor: 'rgba(8, 10, 18, 0.85)',
          border: '1px solid var(--border-muted)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.8)'
        }}
      >
        {/* Slack-style Channel Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-muted)',
            backgroundColor: 'rgba(15, 20, 32, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-orange)' }}>#</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>dev-rant</span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginLeft: '8px',
                borderLeft: '1px solid var(--border-muted)',
                paddingLeft: '12px'
              }}
            >
              Channel for context-loss induced screaming
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>2 DEV ONLINE</span>
          </div>
        </div>

        {/* Message feed stream */}
        <div
          ref={feedContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {messages.length === 0 && !typingUser && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifySelf: 'center', alignSelf: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', fontFamily: 'var(--font-mono)' }}>
              Waiting for incoming team webhook stream...
            </div>
          )}

          {messages.map((msg) => {
            const isSarah = msg.sender === 'sarah';
            const nameColor = isSarah ? 'var(--accent-cyan)' : 'var(--accent-orange)';
            const initial = isSarah ? 'S' : 'A';
            const avatarBg = isSarah ? 'rgba(223, 159, 40, 0.15)' : 'rgba(194, 65, 12, 0.15)';
            const borderGlow = isSarah ? 'rgba(223, 159, 40, 0.2)' : 'rgba(194, 65, 12, 0.2)';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  animation: 'spring-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards',
                  alignItems: 'flex-start'
                }}
              >
                {/* Avatar Badge */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: avatarBg,
                    border: `1px solid ${borderGlow}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: nameColor,
                    flexShrink: 0,
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  {initial}
                </div>

                {/* Content Bubble */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: nameColor }}>
                      {isSarah ? 'sarah_solutions' : 'alex_struggles'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      [DEV_LOG_13:42]
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '13.5px',
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Code snippet display block */}
                  {msg.code && (
                    <pre
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        color: '#cbd5e1',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                        lineHeight: '1.4',
                        marginTop: '4px'
                      }}
                    >
                      <code>{msg.code}</code>
                    </pre>
                  )}

                  {/* Reactions Container with bouncy animation */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {msg.reactions.map((r, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(223, 159, 40, 0.3)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            animation: 'reaction-pop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.25) forwards',
                            color: 'var(--accent-cyan)'
                          }}
                        >
                          <span>{r}</span>
                          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>1</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUser && (
            <div
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  flexShrink: 0
                }}
              >
                {typingUser === 'sarah' ? 'S' : 'A'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {typingUser === 'sarah' ? 'sarah_solutions' : 'alex_struggles'} is typing...
                </span>
                {/* Real-time typing dot pulse animation */}
                <div style={{ display: 'flex', gap: '4px', padding: '4px' }}>
                  <span className="typing-dot" style={{ animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Input area at the bottom */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(15, 20, 32, 0.4)',
            borderTop: '1px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* Simulated File Clip attachment icon */}
          <button
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'default',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Typing box */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              readOnly
              value={inputValue}
              placeholder="Message #dev-rant..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(5, 7, 10, 0.5)',
                border: '1px solid var(--border-muted)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'default'
              }}
            />
            
            {/* Terminal blinking cursor inside input */}
            {typingUser === 'alex' && (
              <span
                style={{
                  position: 'absolute',
                  left: `${Math.max(16, 16 + inputValue.length * 7)}px`,
                  width: '7px',
                  height: '14px',
                  backgroundColor: 'var(--accent-orange)',
                  opacity: 0.8,
                  animation: 'led-blink 0.8s infinite steps(2)'
                }}
              />
            )}
          </div>

          {/* Send button */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: typingUser === 'alex' && inputValue.length > 0 ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: typingUser === 'alex' && inputValue.length > 0 ? '#000' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Styled animation keyframes for unique spring layout */}
      <style jsx global>{`
        @keyframes spring-in {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(28px);
          }
          75% {
            transform: scale(1.015) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes reaction-pop {
          0% {
            opacity: 0;
            transform: scale(0.4) rotate(-10deg);
          }
          70% {
            transform: scale(1.2) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--text-muted);
          display: inline-block;
          animation: dot-pulse 1.2s infinite ease-in-out;
        }
        @keyframes dot-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
