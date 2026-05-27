'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('pro');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLicenseKey('');
    setCopied(false);

    try {
      const response = await fetch('/api/license/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate license key.');
      }
      setLicenseKey(data.license_key);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '40px 20px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px'
    }} className="animate-fade-in">
      
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
          Licensing Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Stateless license manager. Generate cryptographic license keys to unlock on-device retrieve capabilities.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Developer Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Select Plan Tier
            </label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <label style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid ' + (plan === 'pro' ? 'var(--accent-cyan)' : 'var(--border-muted)'),
                background: plan === 'pro' ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="plan"
                  value="pro"
                  checked={plan === 'pro'}
                  onChange={() => setPlan('pro')}
                  style={{ width: 'auto', outline: 'none', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>Pro (Retrieve)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unlock vector search, local LLM, and agent context.</div>
                </div>
              </label>

              <label style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid ' + (plan === 'free' ? 'var(--accent-cyan)' : 'var(--border-muted)'),
                background: plan === 'free' ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="plan"
                  value="free"
                  checked={plan === 'free'}
                  onChange={() => setPlan('free')}
                  style={{ width: 'auto', outline: 'none', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>Free (Vault)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Standard local capture and encryption only.</div>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
          >
            {loading ? 'Generating...' : 'Generate Cryptographic License Key'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--accent-red)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {licenseKey && (
          <div style={{
            marginTop: '25px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                Your Signed License Key (JWT)
              </label>
              <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            
            <textarea
              readOnly
              value={licenseKey}
              style={{
                width: '100%',
                height: '110px',
                fontFamily: 'monospace',
                fontSize: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-muted)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--text-secondary)',
                resize: 'none',
                outline: 'none'
              }}
            />

            <div style={{
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.03)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>How to activate locally:</strong>
              <div style={{ marginTop: '8px' }}>
                1. Make sure your local VexCTX daemon is running.
                <br />
                2. Run the following activation command in your terminal:
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--accent-cyan)'
                }}>
                  curl -X POST http://localhost:8765/license/activate \<br />
                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                  &nbsp;&nbsp;-d &apos;&#123;&quot;license_key&quot;: &quot;[Paste Key Here]&quot;&#125;&apos;
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
