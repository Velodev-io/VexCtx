import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '80px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '60px'
    }} className="animate-fade-in">
      
      {/* Hero Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
        <div style={{ 
          background: 'rgba(0, 240, 255, 0.1)', 
          border: '1px solid rgba(0, 240, 255, 0.2)',
          padding: '6px 16px',
          borderRadius: '999px',
          color: 'var(--accent-cyan)',
          fontSize: '14px',
          fontWeight: 500,
          alignSelf: 'center',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Phase 3 — Stateless Portal Active
        </div>
        <h1 style={{
          fontSize: '56px',
          fontWeight: 800,
          lineHeight: '1.15',
          background: 'linear-gradient(to right, #ffffff, #9ca3af, var(--accent-cyan))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px'
        }}>
          The Private, On-Device AI Memory Layer
        </h1>
        <p style={{
          fontSize: '20px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginTop: '10px'
        }}>
          Automatically capture your AI conversations from Claude, ChatGPT, Gemini, and Perplexity. 
          Stored locally. Encrypted locally. 100% private. Zero data ever leaves your machine.
        </p>
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          marginTop: '30px'
        }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
            Go to Dashboard
          </Link>
          <a href="#features" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
            Learn More
          </a>
        </div>
      </div>

      {/* Feature Section */}
      <div id="features" style={{
        width: '100%',
        marginTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Designed for absolute privacy and maximum speed
        </h2>
        
        <div className="grid-container">
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Zero-Server-Data Privacy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              We don't want your data. All conversations are encrypted with AES-256-GCM and stored only on your local hard drive.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Local Semantic Search</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Verify your Pro license to unlock on-device vector retrieval. Query your entire AI history using local model embeddings.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-purple)'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>30-Day Storage Retention</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Auto-pruning keeps your disk usage light. Events and Qdrant vectors older than 30 days are automatically deleted and reclaimed on startup.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
