# Pipeline (TypeScript)

This folder contains the Phase 2 pipeline, written in TypeScript for type safety and better maintainability. It runs as a GitHub Actions scheduled workflow.

- Entry: `pipeline/src/run-once.ts`
- Local: `npm run run-once`
- CI/Schedule: `.github/workflows/pipeline.yml`

## TypeScript Benefits

The pipeline is now fully typed with TypeScript, providing:
- Compile-time type checking for API responses and data structures
- Better IDE autocomplete and documentation
- Safer refactoring and reduced runtime errors
- Self-documenting code with clear interfaces
