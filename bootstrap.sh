#!/usr/bin/env bash
# Bootstrap a new Mac from this dotfiles repo.
# Usage: ./bootstrap.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "1/6 Brew packages..."
if ! command -v brew >/dev/null; then
  echo "Homebrew missing. Install it first: https://brew.sh"
  exit 1
fi
bundle_log="$(mktemp)"
if ! brew bundle --file=./Brewfile 2>&1 | tee "$bundle_log"; then
  if grep -q "untrusted tap" "$bundle_log"; then
    echo "Trusting oven-sh/bun tap (official Bun tap) and retrying..."
    brew trust oven-sh/bun
    brew bundle --file=./Brewfile
  else
    echo "WARNING: brew bundle reported errors. Fix them, then re-run ./bootstrap.sh"
    exit 1
  fi
fi
unlink "$bundle_log"

echo "2/6 Dependencies..."
if ! command -v bun >/dev/null; then
  echo "bun missing. Install it first: https://bun.sh"
  exit 1
fi
bun install

echo "3/6 Git hooks..."
if [ ! -d ./.git ]; then
  echo "Not a git clone, skipping hook install"
else
  if [ -f ./.git/hooks/pre-push ]; then
    cp ./.git/hooks/pre-push ./.git/hooks/pre-push.bak
  fi
  cp ./hooks/pre-push ./.git/hooks/pre-push
  chmod +x ./.git/hooks/pre-push
fi

echo "4/6 Environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill in your secrets, then re-run ./bootstrap.sh"
  exit 1
fi

echo "5/6 Dotfiles symlinks..."
bun run setup

echo "6/6 MCP configs..."
bun run build
bun run install:all
bun run audit

echo "Done. Restart your shell."
