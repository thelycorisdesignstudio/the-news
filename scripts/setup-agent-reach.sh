#!/usr/bin/env bash
# Installs agent-reach (https://github.com/Panniantong/agent-reach) next to The News and runs its doctor.
# The News reads news through the same channels agent-reach sets up: RSS, Jina Reader and Exa search are
# built in and need nothing here. This script adds agent-reach's own health report to /api/admin/sources
# (set AGENT_REACH_BIN to the path it prints), and is where to opt in to its login-backed channels.
set -euo pipefail

if ! command -v pipx >/dev/null 2>&1; then
  echo "pipx is required: https://pipx.pypa.io/stable/installation/" >&2
  exit 1
fi

pipx install --force "git+https://github.com/Panniantong/agent-reach.git"
BIN="$(command -v agent-reach)"
echo
echo "agent-reach installed at: $BIN"
echo "Add to your .env:  AGENT_REACH_BIN=$BIN"
echo
agent-reach doctor || true
echo
echo "Optional, with your approval: 'agent-reach install --env=auto --system' also registers Exa via mcporter."
echo "The News already talks to Exa's MCP endpoint directly, so this is not required."
