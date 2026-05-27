export interface OSInfo {
  os: 'macos' | 'windows' | 'linux' | 'unknown';
  arch: 'arm64' | 'x64' | 'unknown';
  downloadUrl: string;
  label: string;
  fileName: string;
}

// Fallback constant version targeting v1.0.6 release structure
const RELEASE_VERSION = 'v1.0.6';
const BINARY_VERSION = '1.0.0';

export async function detectOS(): Promise<OSInfo> {
  if (typeof window === 'undefined') {
    return {
      os: 'unknown',
      arch: 'unknown',
      downloadUrl: `https://github.com/Velodev-io/VexCtx/releases/tag/${RELEASE_VERSION}`,
      label: 'Download VexCTX',
      fileName: 'package'
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = (window.navigator as any).platform?.toLowerCase() || '';
  
  let os: OSInfo['os'] = 'unknown';
  let arch: OSInfo['arch'] = 'unknown';

  // Detect OS
  if (userAgent.includes('mac') || platform.includes('mac')) {
    os = 'macos';
  } else if (userAgent.includes('win') || platform.includes('win')) {
    os = 'windows';
  } else if (userAgent.includes('linux') || platform.includes('linux')) {
    os = 'linux';
  }

  // Detect Architecture
  if (os === 'macos') {
    // 1. Check Chromium userAgentData API
    const userAgentData = (window.navigator as any).userAgentData;
    if (userAgentData && typeof userAgentData.getHighEntropyValues === 'function') {
      try {
        const entropy = await userAgentData.getHighEntropyValues(['architecture']);
        if (entropy.architecture === 'arm') {
          arch = 'arm64';
        } else if (entropy.architecture === 'x86') {
          arch = 'x64';
        }
      } catch (e) {
        // Ignore and proceed to webgl check
      }
    }

    // 2. Fallback to WebGL Renderer Check (Reliable for Safari Apple Silicon detection)
    if (arch === 'unknown') {
      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            // If it's an Apple GPU and doesn't contain "intel" or "amd", it is Apple Silicon (arm64)
            if (/Apple/i.test(renderer) && !/Intel/i.test(renderer) && !/AMD/i.test(renderer)) {
              arch = 'arm64';
            } else {
              arch = 'x64';
            }
          }
        }
      } catch (e) {
        // Ignore fallback
      }
    }

    // Default macOS fallback
    if (arch === 'unknown') {
      arch = 'arm64'; // Default to modern Apple Silicon
    }
  } else if (os === 'windows' || os === 'linux') {
    // Windows/Linux desktop binaries are compiled for 64-bit Intel/AMD
    arch = 'x64';
  }

  // Map to URLs
  let downloadUrl = `https://github.com/Velodev-io/VexCtx/releases/tag/${RELEASE_VERSION}`;
  let label = 'Download for Unknown OS';
  let fileName = 'VexCTX';

  if (os === 'macos') {
    if (arch === 'arm64') {
      fileName = `VexCTX_${BINARY_VERSION}_aarch64.dmg`;
      downloadUrl = `https://github.com/Velodev-io/VexCtx/releases/download/${RELEASE_VERSION}/${fileName}`;
      label = 'Download for macOS (Apple Silicon)';
    } else {
      fileName = `VexCTX_${BINARY_VERSION}_x64.dmg`;
      downloadUrl = `https://github.com/Velodev-io/VexCtx/releases/download/${RELEASE_VERSION}/${fileName}`;
      label = 'Download for macOS (Intel) — Coming Soon';
    }
  } else if (os === 'windows') {
    fileName = `VexCTX_${BINARY_VERSION}_x64-setup.exe`;
    downloadUrl = `https://github.com/Velodev-io/VexCtx/releases/download/${RELEASE_VERSION}/${fileName}`;
    label = 'Download for Windows';
  } else if (os === 'linux') {
    fileName = `VexCTX_${BINARY_VERSION}_amd64.AppImage`;
    downloadUrl = `https://github.com/Velodev-io/VexCtx/releases/download/${RELEASE_VERSION}/${fileName}`;
    label = 'Download for Linux';
  }

  return { os, arch, downloadUrl, label, fileName };
}
