'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Client-only dynamic imports for canvas and animations to avoid SSR mismatch
const VectorNet = dynamic(() => import('../components/VectorNet'), { ssr: false });
const IngestionFlow = dynamic(() => import('../components/IngestionFlow'), { ssr: false });
const DeveloperChat = dynamic(() => import('../components/DeveloperChat'), { ssr: false });

export default function Home() {
  const [retentionDays, setRetentionDays] = useState<number | 'Permanent'>(30);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<'curl' | 'python' | 'node'>('curl');
  const [copied, setCopied] = useState(false);
  const installCmd = "git clone https://github.com/Velodev-io/VexCtx.git && cd VexCtx && ./install.sh";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqData = [
    {
      q: 'Where is my work context stored?',
      a: 'All data resides 100% on your local machine. VexCTX boots an offline server daemon that writes events into a locally encrypted SQLite database and vector embeddings into a local Qdrant memory instance. We run zero collection servers and have no access to your data.'
    },
    {
      q: 'Does it capture passwords, keys, or credit cards?',
      a: 'No. VexCTX passes all inputs through a client-side privacy blacklist filter before writing anything to disk. It automatically identifies and discards credit card configurations, private keys, authorization tokens, and all inputs originating from security-sensitive or password manager applications.'
    },
    {
      q: 'How does the browser extension connect securely?',
      a: 'The extension streams conversations to your local daemon at http://localhost:8765/ext/events. To prevent unauthorized websites from accessing your local vault, the extension pairs with the daemon using a unique security token generated and saved in ~/.vexctx/ext_token.txt.'
    },
    {
      q: 'How do I run and install the VexCTX CLI environment?',
      a: 'Requirements are Python 3.12+ and the uv package manager. Clone the repository and run the automated helper script: git clone https://github.com/Velodev-io/VexCtx.git && cd VexCtx && ./install.sh. Once complete, boot the server: uv run uvicorn vexctx.main:app --port 8765.'
    }
  ];

  const recipes = {
    curl: `curl -X POST http://localhost:8765/events \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "ai_prompt",
    "source_app": "vscode",
    "content": "How do I fix a Redis timeout in FastAPI?",
    "session_id": "dev_session_1",
    "user_id": "default",
    "project_id": "VexCTX"
  }'`,
    python: `from vexctx import VexCTXClient

client = VexCTXClient(token="YOUR_PAIRED_TOKEN")

client.capture_event(
    event_type="ai_prompt",
    source_app="vscode",
    content="How do I fix a Redis timeout in FastAPI?",
    session_id="dev_session_1",
    project_id="VexCTX"
)`,
    node: `const { VexCTX } = require('vexctx');

const vex = new VexCTX({ token: 'YOUR_PAIRED_TOKEN' });

await vex.capture({
  eventType: 'ai_prompt',
  sourceApp: 'vscode',
  content: 'How do I fix a Redis timeout in FastAPI?',
  sessionId: 'dev_session_1',
  projectId: 'VexCTX'
});`
  };

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '50px 20px 100px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '100px',
        position: 'relative'
      }}
      className="animate-fade-in"
    >
      {/* Background spring vector network */}
      <VectorNet />


      {/* HERO SECTION: ZBS Capital-Inspired 3D Centerpiece & Floating Constellations */}
      <section
        style={{
          position: 'relative',
          minHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 20px',
          marginTop: '10px',
          overflow: 'visible'
        }}
      >
        {/* Floating tech nodes constellation around centerpiece */}
        {/* Hex 1: Python */}
        <div className="tech-hex-wrap float-node-1" style={{ position: 'absolute', top: '10%', left: '10%' }} title="Python Client Integration">
          <div className="tech-hex">
            <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>PY</span>
          </div>
        </div>

        {/* Hex 2: VS Code */}
        <div className="tech-hex-wrap float-node-2" style={{ position: 'absolute', top: '46%', left: '4%' }} title="VS Code Extension Capture">
          <div className="tech-hex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
        </div>

        {/* Hex 3: SQLite */}
        <div className="tech-hex-wrap float-node-3" style={{ position: 'absolute', top: '82%', left: '16%' }} title="Encrypted SQLite Vault">
          <div className="tech-hex">
            <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>SQL</span>
          </div>
        </div>

        {/* Hex 4: Git / Version Control */}
        <div className="tech-hex-wrap float-node-4" style={{ position: 'absolute', top: '8%', right: '12%' }} title="Git Timeline Integration">
          <div className="tech-hex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </div>
        </div>

        {/* Hex 5: NodeJS */}
        <div className="tech-hex-wrap float-node-1" style={{ position: 'absolute', top: '48%', right: '5%' }} title="JS/Node SDK Integration">
          <div className="tech-hex">
            <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>JS</span>
          </div>
        </div>

        {/* Hex 6: Qdrant / Vector embeddings */}
        <div className="tech-hex-wrap float-node-3" style={{ position: 'absolute', top: '80%', right: '18%' }} title="Local Vector Engine">
          <div className="tech-hex">
            <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>VCT</span>
          </div>
        </div>

        {/* 3D Orb Centerpiece Backdrop */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '680px',
            height: '680px',
            backgroundImage: 'url(/vault_centerpiece.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
            pointerEvents: 'none',
            zIndex: -1,
            filter: 'drop-shadow(0 0 60px rgba(223, 159, 40, 0.2))',
            borderRadius: '50%',
            animation: 'floatSlow1 14s ease-in-out infinite'
          }}
        />

        {/* Hero content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '820px', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span className="led led-green" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--accent-green)',
                fontWeight: 600,
                letterSpacing: '1px'
              }}
            >
              SECURE DEPLOYMENT: ONLINE
            </span>
          </div>

          <h1
            style={{
              fontSize: '56px',
              fontWeight: 800,
              lineHeight: '1.1',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1, var(--accent-cyan))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-2px',
              margin: '0'
            }}
          >
            Stateless AI chats are wasting your time.
          </h1>

          <p
            style={{
              fontSize: '17px',
              color: 'var(--text-secondary)',
              lineHeight: '1.62',
              fontFamily: 'var(--font-sans)',
              maxWidth: '680px',
              margin: '0 auto'
            }}
          >
            Every new prompt window is a blank slate. You re-explain your stack, re-verify package versions, and re-clarify styling guides. 
            VexCTX automatically logs your work events into a secure local database running 100% offline.
          </p>

          {/* Central Terminal CLI Copy Box */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              width: '100%', 
              maxWidth: '640px', 
              margin: '24px auto 0 auto',
              zIndex: 5
            }}
          >
            {/* Terminal Window Header */}
            <div 
              style={{
                backgroundColor: 'rgba(15, 20, 32, 0.75)',
                border: '1px solid var(--border-muted)',
                borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}
            >
              {/* Three dots mac buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', opacity: 0.8 }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', opacity: 0.8 }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', opacity: 0.8 }} />
              </div>
              <span>bash — local setup</span>
              <span style={{ width: '42px' }}></span>
            </div>

            {/* Terminal Body */}
            <div 
              className="crt-monitor"
              style={{
                backgroundColor: '#05070a',
                border: '1px solid var(--border-muted)',
                borderRadius: '0 0 12px 12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '8px', color: 'var(--accent-cyan)' }}>
                <span style={{ color: 'var(--text-muted)', userSelect: 'none' }}>$</span>
                <span>{installCmd}</span>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                  backgroundColor: copied ? 'var(--accent-green-glow)' : 'rgba(255, 255, 255, 0.02)',
                  color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
                  borderColor: copied ? 'var(--accent-green)' : 'var(--border-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CHAT SECTION: Animated Developer Chat */}
      <DeveloperChat />

      {/* TECHNICAL SCHEMA MATRIX: Problem vs Solution */}
      <section
        className="deck-panel"
        style={{
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          marginTop: '10px'
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>
          Secure Vault Specifications
        </h2>

        <div className="grid-container" style={{ gap: '48px' }}>
          {/* Card 1: Zero-Cloud */}
          <div className="bracket-frame">
            <span className="bracket-scob bracket-scob-left" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="led led-green" />
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Zero Cloud Egress</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                All captured work logs are written locally to your drive, encrypted using AES-256-GCM. 
                No third-party accounts, cloud syncs, or trackers exist in the engine.
              </p>
            </div>
            <span className="bracket-scob bracket-scob-right" />
          </div>

          {/* Card 2: SQLite Search */}
          <div className="bracket-frame">
            <span className="bracket-scob bracket-scob-left" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="led led-green" />
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>FTS5 Index Retrieval</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                A local Full-Text Search (FTS5) index records details of files, chat prompts, and system actions, enabling sub-millisecond retrieval of history.
              </p>
            </div>
            <span className="bracket-scob bracket-scob-right" />
          </div>

          {/* Card 3: Interactive Auto-Pruning */}
          <div className="bracket-frame">
            <span className="bracket-scob bracket-scob-left" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="led led-orange" />
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Custom Data Retention</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '8px' }}>
                You control how long your history is kept. Set the retention window to automatically optimize local storage capacity.
              </p>
              {/* Pill Selector for Custom Retention */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([7, 30, 90, 'Permanent'] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setRetentionDays(days)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-muted)',
                      backgroundColor: retentionDays === days ? 'var(--accent-cyan-glow)' : 'transparent',
                      borderColor: retentionDays === days ? 'var(--accent-cyan)' : 'var(--border-muted)',
                      color: retentionDays === days ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    {typeof days === 'number' ? `${days} Days` : days}
                  </button>
                ))}
              </div>
            </div>
            <span className="bracket-scob bracket-scob-right" />
          </div>
        </div>
      </section>



      {/* RECIPE API MODULE: Code snippets */}
      <section
        className="deck-panel"
        style={{
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginTop: '10px',
          backgroundColor: 'rgba(8, 12, 24, 0.35)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>
            Ingest API Integration
          </h2>
          
          {/* Recipe toggle tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['curl', 'python', 'node'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveRecipe(lang)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-muted)',
                  backgroundColor: activeRecipe === lang ? 'var(--accent-cyan-glow)' : 'transparent',
                  borderColor: activeRecipe === lang ? 'var(--accent-cyan)' : 'var(--border-muted)',
                  color: activeRecipe === lang ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Send custom prompt transactions, command histories, and file diffs directly to your local VexCTX daemon via simple REST API endpoints.
        </p>

        {/* Code display terminal block */}
        <div
          className="crt-monitor"
          style={{
            padding: '20px',
            backgroundColor: '#05070a',
            border: '1px solid var(--border-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-primary)',
            overflowX: 'auto',
            whiteSpace: 'pre'
          }}
        >
          {recipes[activeRecipe]}
        </div>
      </section>

      {/* FAQ MODULE: Accordion */}
      <section style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqData.map((faq, idx) => (
            <div
              key={idx}
              className="deck-panel"
              style={{
                border: '1px solid var(--border-muted)',
                backgroundColor: 'rgba(8, 12, 24, 0.25)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                overflow: 'hidden'
              }}
            >
              {/* Question Header */}
              <button
                onClick={() => toggleFaq(idx)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  textTransform: 'none',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: activeFaq === idx ? 'var(--accent-cyan)' : 'var(--text-primary)'
                }}
              >
                <span>{faq.q}</span>
                <span
                  style={{
                    transform: activeFaq === idx ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    fontSize: '18px',
                    lineHeight: 1,
                    color: 'var(--text-muted)'
                  }}
                >
                  +
                </span>
              </button>

              {/* Answer Content */}
              <div
                style={{
                  maxHeight: activeFaq === idx ? '200px' : '0px',
                  opacity: activeFaq === idx ? 1 : 0,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  padding: activeFaq === idx ? '0 24px 24px 24px' : '0 24px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6'
                }}
              >
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
