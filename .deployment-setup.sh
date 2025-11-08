#!/usr/bin/env bash
# Ensure npm is available in deployment environment
export PATH="/nix/store/r1smm331j6crqs02mn986g06f7cpbggh-nodejs-22.17.0/bin:$PATH"
exec "$@"
