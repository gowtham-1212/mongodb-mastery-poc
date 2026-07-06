# Project 03: Indexing, Optimization & Profiling

## Overview

This project uses NestJS with the native MongoDB driver to demonstrate index types and query profiling.

Routes are implemented in separate controller files for:
- single-field indexes
- compound indexes
- multikey indexes
- text indexes
- hashed indexes
- wildcard indexes
- TTL indexes
- sparse indexes

Each route creates the index, runs a query, and returns execution timing.

## Run locally

```bash
cd project-03-indexing
npm install
chmod +x seed.sh
./seed.sh
npm run dev

