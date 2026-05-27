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

  useEffect(() => {
    detectOS().then((info) => setOsInfo(info));
  }, []);

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
        position: 'relative'
      }}
      className="animate-fade-in"
    >
      {/* Background spring vector network */}
      <VectorNet />

      {/* Header Deck Panel */}
      <header
        style={{
          borderBottom: '1px solid var(--border-muted)',
          paddingBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-orange)' }}>[VEXCTX_PORTAL]</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v1.0.6</span>
        </div>
        <nav style={{ display: 'flex', gap: '20px' }}>
          <Link href="/changelog" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px' }} className="glitch-text">
            [CHANGELOG/RELEASES]
          </Link>
          <a
            href="https://github.com/Velodev-io/VexCtx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px' }}
            className="glitch-text"
          >
            [GITHUB_SRC]
          </a>
        </nav>
      </header>

      {/* HERO SECTION: System Initialization */}
      <section className="grid-container" style={{ alignItems: 'center', gap: '40px', marginTop: '20px' }}>
        {/* Left Column: Problem & Solution Pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--accent-orange)'
            }}
          >
            SYSTEM_STATUS: ACTIVE // LOCAL_FIRST
          </div>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 800,
              lineHeight: '1.1',
              color: '#fff',
              letterSpacing: '-1px'
            }}
          >
            Stateless AI chats are wasting your time.
          </h1>
          <p
            style={{
              fontSize: '15px',
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
            className="deck-panel deck-panel-orange"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: 'rgba(255, 69, 0, 0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>AUTODETECTING CLIENT...</span>
              <span style={{ color: 'var(--accent-orange)' }}>
                {osInfo ? `[${osInfo.os.toUpperCase()}_${osInfo.arch.toUpperCase()}]` : 'LOADING...'}
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
                paddingTop: '12px'
              }}
            >
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_aarch64.dmg" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="glitch-text">
                [macOS arm64]
              </a>
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_x64-setup.exe" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="glitch-text">
                [Windows exe]
              </a>
              <a href="https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_amd64.AppImage" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="glitch-text">
                [Linux AppImage]
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Ingestion particle flow */}
        <IngestionFlow />
      </section>

      {/* TECHNICAL SCHEMA MATRIX: Problem vs Solution */}
      <section
        className="deck-panel"
        style={{
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginTop: '20px'
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
          [VAULT_SECURE_SPECIFICATIONS]
        </h2>

        <div className="grid-container">
          {/* Card 1: Zero-Cloud */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-green" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>ZERO CLOUD EGRESS</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              We don't operate ingestion servers. All event captures are written immediately to your local drive encrypted using AES-256-GCM. 
              Your work context never leaves your own hardware.
            </p>
          </div>

          {/* Card 2: SQLite Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-green" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>FTS5 INDEX RETRIEVAL</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Built-in Full-Text Search (FTS5) index indexes files, prompts, and tool commands in real-time. 
              Re-find precise snippets instantly using rapid key-index matching.
            </p>
          </div>

          {/* Card 3: Auto-Pruning */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-orange" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>30-DAY COMPACTION</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Configurable automated retention cleaner prunes metadata and vectors older than 30 days. 
              Runs as an offline background thread on startup to prevent storage bloated sector pools.
            </p>
          </div>
        </div>
      </section>

      {/* LIVE SIMULATOR DECK: Search console + Grid compaction */}
      <section style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
          [VAULT_INDEXER_SIMULATION]
        </h2>
        <div className="grid-container" style={{ gap: '30px' }}>
          <SearchSimulator />
          <DatabaseGrid />
        </div>
      </section>
    </div>
  );
}
