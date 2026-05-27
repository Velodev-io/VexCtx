import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import VectorNet from '../../components/VectorNet';

export const revalidate = 3600; // Cache and revalidate cache every hour (ISR)

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

// Fallback data in case of GitHub API rate limit errors
const FALLBACK_RELEASES: GitHubRelease[] = [
  {
    tag_name: 'v1.0.6',
    name: 'VexCTX v1.0.6',
    published_at: new Date().toISOString(),
    body: `## What's new in v1.0.6\n\n- Removed macOS Intel build from matrix to speed up CI runs\n- Updated download packages dynamically under correct asset files\n- Fixed repository default branch pushes in release.yml`,
    html_url: 'https://github.com/Velodev-io/VexCtx/releases/tag/v1.0.6',
    assets: [
      { name: 'VexCTX_1.0.0_aarch64.dmg', browser_download_url: 'https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_aarch64.dmg', size: 45278744, download_count: 12 },
      { name: 'VexCTX_1.0.0_x64-setup.exe', browser_download_url: 'https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_x64-setup.exe', size: 51232768, download_count: 8 },
      { name: 'VexCTX_1.0.0_amd64.AppImage', browser_download_url: 'https://github.com/Velodev-io/VexCtx/releases/download/v1.0.6/VexCTX_1.0.0_amd64.AppImage', size: 48123984, download_count: 5 }
    ]
  }
];

async function fetchReleases(): Promise<GitHubRelease[]> {
  try {
    const res = await fetch('https://api.github.com/repos/Velodev-io/VexCtx/releases', {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'VexCTX-Changelog-Fetcher'
      }
    });

    if (!res.ok) {
      console.warn(`GitHub API request failed with status: ${res.status}. Using fallback release list.`);
      return FALLBACK_RELEASES;
    }

    const data = await res.json();
    return Array.isArray(data) ? data : FALLBACK_RELEASES;
  } catch (e) {
    console.error('Error fetching VexCTX releases from GitHub API:', e);
    return FALLBACK_RELEASES;
  }
}

export default async function ChangelogPage() {
  const releases = await fetchReleases();

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        position: 'relative'
      }}
    >
      {/* Background vector net */}
      <VectorNet />

      {/* Header Bar */}
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
          <Link href="/" style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '18px', letterSpacing: '-0.5px' }}>
            VexCTX
          </Link>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '4px' }}>/changelog</span>
        </div>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} className="glitch-text">
          Back
        </Link>
      </header>

      {/* Page Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
          SYSTEM_LOG_INDEX
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
          System Logs & Updates
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6' }}>
          Chronological index of releases, security patches, and installer file compiles fetched directly from the deployment logs.
        </p>
      </div>

      {/* Timeline Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          position: 'relative',
          paddingLeft: '24px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {releases.map((release) => (
          <div
            key={release.tag_name}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Dot Node Indicator */}
            <span
              className="led led-green"
              style={{
                position: 'absolute',
                left: '-28px',
                top: '22px',
                width: '7px',
                height: '7px'
              }}
            />

            {/* Version Card */}
            <div className="deck-panel" style={{ padding: '28px', backgroundColor: 'rgba(8,12,24,0.45)' }}>
              {/* Card Title Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '12px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {release.tag_name}
                  </h2>
                  <span className="badge badge-tag">{release.name || 'System Compile'}</span>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  [{formatDate(release.published_at).toUpperCase()}]
                </span>
              </div>

              {/* Release description markdown block rendering */}
              <div
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {/* Clean out markdown headers/formatting tags for basic render */}
                {release.body
                  ? release.body
                      .replace(/##\s+/g, '')
                      .replace(/###\s+/g, '')
                      .replace(/-\s+/g, '• ')
                      .replace(/>\s+/g, '')
                  : 'System configuration updates and package builds.'}
              </div>

              {/* Release Binaries File Readout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', marginBottom: '4px', opacity: 0.8 }}>
                  [BUILT_BINARY_ASSETS]
                </div>
                
                {release.assets.length > 0 ? (
                  release.assets.map((asset) => (
                    <a
                      key={asset.name}
                      href={asset.browser_download_url}
                      className="deck-panel"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 18px',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: 'rgba(255,255,255,0.01)',
                        borderRadius: '8px'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }} className="glitch-text">
                        {asset.name}
                      </span>
                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        <span>SIZE: {formatSize(asset.size)}</span>
                        <span>DOWNLOADS: {asset.download_count}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No manual binaries compiled. Source available on GitHub.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
