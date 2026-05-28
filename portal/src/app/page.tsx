'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { detectOS, OSInfo } from '../utils/detectOS';

// Client-only dynamic imports for canvas and animations to avoid SSR mismatch
const VectorNet = dynamic(() => import('../components/VectorNet'), { ssr: false });
const IngestionFlow = dynamic(() => import('../components/IngestionFlow'), { ssr: false });
const SearchSimulator = dynamic(() => import('../components/SearchSimulator'), { ssr: false });
const DatabaseGrid = dynamic(() => import('../components/DatabaseGrid'), { ssr: false });

export default function Home() {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | 'Permanent'>(30);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<'curl' | 'python' | 'node'>('curl');

  useEffect(() => {
    detectOS().then((info) => setOsInfo(info));
  }, []);

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
        padding: '30px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '56px',
        position: 'relative'
      }}
      className="animate-fade-in"
    >
      {/* Background spring vector network */}
      <VectorNet />


      {/* HERO SECTION: System Initialization */}
      <section className="grid-container" style={{ alignItems: 'center', gap: '48px', marginTop: '10px' }}>
        {/* Left Column: Problem & Solution Pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="led led-green" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--accent-green)',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}
            >
              SECURE DEPLOYMENT: ONLINE
            </span>
          </div>
          
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: '1.15',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1, var(--accent-cyan))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px'
            }}
          >
            Stateless AI chats are wasting your time.
          </h1>
          
          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Every new prompt window is a blank slate. You re-explain your stacks, re-verify package versions, and re-clarify styling guides. 
            VexCTX bridges this gap by automatically saving your AI work events into a secure, encrypted local database—running 100% offline.
          </p>

          {/* Installer Detection Control Console */}
          <div
            className="deck-panel deck-panel-blue"
            style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: 'rgba(0, 240, 255, 0.01)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>CLIENT VERSION IDENTIFIER</span>
              <span style={{ color: 'var(--accent-cyan)' }}>
                {osInfo ? `[${osInfo.os.toUpperCase()}_${osInfo.arch.toUpperCase()}]` : 'RETRIEVING CLIENT DETAILS...'}
              </span>
            </div>

            {/* Smart download action */}
            {osInfo ? (
              <a href={osInfo.downloadUrl} className="btn btn-primary" style={{ width: '100%' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {osInfo.label}
              </a>
            ) : (
              <button disabled style={{ width: '100%', opacity: 0.5 }}>
                Detecting Client Environment...
              </button>
            )}

            {/* Selector fallback list */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                paddingTop: '16px'
              }}
            >
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_aarch64.dmg" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="glitch-text">
                [macOS arm64]
              </a>
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_x64-setup.exe" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="glitch-text">
                [Windows setup.exe]
              </a>
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_amd64.AppImage" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="glitch-text">
                [Linux AppImage]
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Ingestion particle flow */}
        <IngestionFlow retentionDays={retentionDays} />
      </section>

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

        <div className="grid-container">
          {/* Card 1: Zero-Cloud */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-green" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Zero Cloud Egress</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              All captured work logs are written locally to your drive, encrypted using AES-256-GCM. 
              No third-party accounts, cloud syncs, or trackers exist in the engine.
            </p>
          </div>

          {/* Card 2: SQLite Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-green" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>FTS5 Index Retrieval</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              A local Full-Text Search (FTS5) index records details of files, chat prompts, and system actions, enabling sub-millisecond retrieval of history.
            </p>
          </div>

          {/* Card 3: Interactive Auto-Pruning */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '20px' }}>
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
                    backgroundColor: retentionDays === days ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
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
        </div>
      </section>

      {/* LIVE SIMULATOR DECK: Search console + Grid compaction */}
      <section style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>
          Interactive Indexer Simulation
        </h2>
        <div className="grid-container" style={{ gap: '32px' }}>
          <SearchSimulator />
          <DatabaseGrid retentionDays={retentionDays} />
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
                  backgroundColor: activeRecipe === lang ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
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
