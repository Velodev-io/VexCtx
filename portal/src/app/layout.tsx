import type { Metadata } from "next";
import Header from "../components/Header";
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
      <body className="noise">
        <Header />
        
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
