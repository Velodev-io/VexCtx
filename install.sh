#!/bin/bash

# VexCTX Installer Script
# Simplifies requirements check, dependency installation, env config, and model pulling.

set -e

# Colors for nice output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       VexCTX Installation Helper      ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Check for Python
echo -e "\nChecking for Python..."
if command -v python3 &>/dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    echo -e "${GREEN}✓ Found Python 3 (v$PYTHON_VERSION)${NC}"
else
    echo -e "${RED}✗ Python 3 is not installed. Please install Python 3.11+ before running this script.${NC}"
    exit 1
fi

# 2. Check and install uv
echo -e "\nChecking for uv package manager..."
if command -v uv &>/dev/null; then
    echo -e "${GREEN}✓ Found uv package manager${NC}"
else
    echo -e "${YELLOW}uv package manager is not installed.${NC}"
    read -p "Would you like to install uv automatically? (y/n): " install_uv
    if [[ "$install_uv" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Installing uv...${NC}"
        curl -LsSf https://astral.sh/uv/install.sh | sh
        # Source the cargo env or path to make uv available immediately
        export PATH="$HOME/.local/bin:$PATH"
        if command -v uv &>/dev/null; then
            echo -e "${GREEN}✓ uv installed successfully${NC}"
        else
            echo -e "${RED}✗ uv installation failed. Please install uv manually: https://github.com/astral-sh/uv${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ uv is required to install VexCTX. Exiting.${NC}"
        exit 1
    fi
fi

# 3. Setup Virtual Environment and Sync Dependencies
echo -e "\nSyncing project dependencies using uv..."
uv sync
echo -e "${GREEN}✓ Virtual environment created and dependencies synchronized successfully.${NC}"

# 4. Configure Environment
echo -e "\nConfiguring environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
else
    echo -e "${YELLOW}! .env file already exists, skipping copy.${NC}"
fi

# 5. Run verification tests
echo -e "\nRunning test suite to verify setup..."
if PYTHONPATH=. uv run pytest; then
    echo -e "${GREEN}✓ All verification tests passed successfully!${NC}"
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
fi

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}    VexCTX Setup Complete!             ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "To start the local context server, run:"
echo -e "  ${BLUE}uv run uvicorn vexctx.main:app --port 8765 --reload${NC}"
echo -e "======================================="
