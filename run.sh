#!/usr/bin/env bash
set -e

# Add nodejs to PATH
export PATH="/nix/store/r1smm331j6crqs02mn986g06f7cpbggh-nodejs-22.17.0/bin:$PATH"

# Set environment variables
export NODE_ENV=development

# Change to workspace directory
cd "$(dirname "$0")"

# Run npm dev
exec npm run dev
