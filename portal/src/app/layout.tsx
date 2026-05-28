import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VexCTX — Private On-Device AI Memory Vault",
  description: "Your local-first encrypted context engine for AI work. 100% private, offline, and free.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 40px',
            borderBottom: '1px solid var(--border-muted)',
            backgroundColor: 'rgba(6, 8, 14, 0.4)',
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            fontFamily: 'var(--font-sans)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '18px', letterSpacing: '-0.5px' }}>VexCTX</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '4px' }}>v1.0.6</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }} className="glitch-text">
              Home
            </Link>
            <Link href="/changelog" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }} className="glitch-text">
              Changelog
            </Link>
            <a
              href="https://github.com/Velodev-io/VexCtx"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
              className="glitch-text"
            >
              GitHub
            </a>
          </div>
        </header>
        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        
        <footer
          style={{
            textAlign: 'center',
            padding: '30px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-muted)',
            background: 'rgba(6, 8, 14, 0.8)'
          }}
        >
          &copy; {new Date().getFullYear()} VexCTX. All rights reserved. Zero-server-data model. Your data remains entirely local.
        </footer>
      </body>
    </html>
  );
}
