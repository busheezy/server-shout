#!/bin/bash
pnpm ts-json-schema-generator --path src/cfg/cfg.types.ts --type "ShoutConfig" --tsconfig tsconfig.schemas.json > yaml-schemas/config.json