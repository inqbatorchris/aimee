#!/bin/bash

# Set environment
export NODE_ENV=development

# Navigate to workspace
cd /home/runner/workspace

# Run the development server using bun (which is available in PATH)
exec bun --bun run server/index.ts
