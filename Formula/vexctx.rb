class Vexctx < Formula
  desc "Local-first encrypted memory vault for AI-assisted work"
  homepage "https://github.com/Velodev-io/VexCtx"
  url "https://github.com/Velodev-io/VexCtx/archive/refs/tags/v1.0.6.tar.gz"
  sha256 "9d682810e74f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f" # Placeholder stable release hash
  license "Apache-2.0"
  head "https://github.com/Velodev-io/VexCtx.git", branch: "master"

  depends_on "python@3.12"
  depends_on "uv"

  def install
    # 1. Copy all files to libexec (Homebrew's private library path)
    libexec.install Dir["*"]

    # 2. Run uv sync inside libexec to build the virtual environment
    system "uv", "sync", "--project", libexec

    # 3. Create a wrapper script in Homebrew's bin directory
    (bin/"vexctx").write <<~EOS
      #!/bin/bash
      exec uv run --project #{libexec} uvicorn vexctx.main:app "$@"
    EOS

    # 4. Make the wrapper script executable
    chmod 0755, bin/"vexctx"
  end

  test do
    system "#{bin}/vexctx", "--version"
  end
end
