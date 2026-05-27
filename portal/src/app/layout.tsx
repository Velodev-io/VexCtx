import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VexCTX — Private On-Device AI Memory Layer",
  description: "Stateless license key portal for VexCTX. Activate your on-device context retrieval intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header style={{
          display: 'flex',
          justifyContent: 'between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '1px solid var(--border-muted)',
          background: 'rgba(6, 8, 14, 0.5)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }}>
              VEX<span style={{ color: 'var(--accent-cyan)' }}>CTX</span>
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px' }}>
            <a href="/" style={{ fontSize: '14px', color: 'var(--text-secondary)', transition: 'color 0.2s' }}>Home</a>
            <a href="/dashboard" style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>Dashboard</a>
          </div>
        </header>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '30px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-muted)',
          background: 'rgba(6, 8, 14, 0.8)'
        }}>
          &copy; {new Date().getFullYear()} VexCTX. All rights reserved. Zero-server-data model. Your data remains entirely local.
        </footer>
      </body>
    </html>
  );
}
