'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: 'Playground',
      href: '/playground',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      name: 'Changelog',
      href: '/changelog',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    }
  ];

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 40px',
        borderBottom: '1px solid var(--border-muted)',
        backgroundColor: 'rgba(7, 8, 13, 0.4)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Brand logo & Version badge */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '18px', letterSpacing: '-0.5px' }}>VexCTX</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.01)' }}>v1.0.6</span>
      </Link>

      {/* Segmented Navigation Control */}
      <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-muted)',
                backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                textTransform: 'uppercase',
                boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.1)' : 'none'
              }}
              className={isActive ? '' : 'nav-tab-hover'}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}

        {/* GitHub link with matching design */}
        <a
          href="https://github.com/Velodev-io/VexCtx"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            borderRadius: '8px',
            border: '1px solid var(--border-muted)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            textTransform: 'uppercase'
          }}
          className="nav-tab-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          GitHub
        </a>
      </nav>
    </header>
  );
}
