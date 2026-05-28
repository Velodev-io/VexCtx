'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const VectorNet = dynamic(() => import('../../components/VectorNet'), { ssr: false });
const SearchSimulator = dynamic(() => import('../../components/SearchSimulator'), { ssr: false });
const DatabaseGrid = dynamic(() => import('../../components/DatabaseGrid'), { ssr: false });

export default function PlaygroundPage() {
  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '40px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        position: 'relative'
      }}
    >
      {/* Background vector net */}
      <VectorNet />

      {/* Page Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
          SANDBOX_SIMULATION_ENVIRONMENT
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
          Indexer & Compaction Sandbox
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', maxWidth: '750px' }}>
          Simulate full-text index retrieval requests and automatic SQLite garbage collection defrag cycles. Watch how events filter through local secure memory vaults in real-time.
        </p>
      </div>

      {/* Simulator Deck Grid */}
      <div className="grid-container" style={{ gap: '32px', marginTop: '20px' }}>
        <SearchSimulator />
        <DatabaseGrid retentionDays={30} />
      </div>

      {/* Extra Technical context panels below simulator */}
      <div
        className="deck-panel"
        style={{
          padding: '24px 28px',
          backgroundColor: 'rgba(8, 12, 24, 0.3)',
          border: '1px solid var(--border-muted)',
          borderRadius: '12px',
          fontSize: '13.5px',
          lineHeight: '1.6',
          color: 'var(--text-secondary)'
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: '8px' }}>
          💡 Sandbox Operations Checklist
        </span>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>CLI Queries</strong>: The simulator prints keyword matching lookups (e.g. <code>FastAPI lifespan</code>) executed via FTS5 index searches.</li>
          <li><strong>SQLite Compaction</strong>: Empties cells in the block grid representing expired timeline logs, writing new records at the bottom while reclaiming local disk capacity.</li>
          <li><strong>Memory Vault</strong>: Secure blacklists reject secret keys, authentication tokens, and banking numbers instantly before writing them to the SQLite file.</li>
        </ul>
      </div>
    </div>
  );
}
