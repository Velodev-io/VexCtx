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

      {/* Header Deck Panel */}
      <header
        style={{
          borderBottom: '1px solid var(--border-muted)',
          paddingBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-sans)',
          fontWeight: 500
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '18px', letterSpacing: '-0.5px' }}>VexCTX</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '4px' }}>v1.0.6</span>
        </div>
        <nav style={{ display: 'flex', gap: '24px' }}>
          <Link href="/changelog" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} className="glitch-text">
            Changelog
          </Link>
          <a
            href="https://github.com/Velodev-io/VexCtx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            className="glitch-text"
          >
            GitHub
          </a>
        </nav>
      </header>

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
        <IngestionFlow />
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

          {/* Card 3: Auto-Pruning */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-muted)', paddingLeft: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="led led-orange" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>30-Day Storage Compaction</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Automated offline database maintenance prunes expired records and vectors on startup, optimizing your disk space parameters.
            </p>
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
          <DatabaseGrid />
        </div>
      </section>
    </div>
  );
}
