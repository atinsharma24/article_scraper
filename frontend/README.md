# Frontend (React + TypeScript + Vite)

This is the frontend application for BeyondChats article viewer, built with React 19, TypeScript, and Vite.

## TypeScript Migration

The frontend has been fully migrated to TypeScript, providing:
- Type-safe React components with proper prop types
- Type-checked API calls and responses
- Better IDE support and autocomplete
- Compile-time error detection
- Self-documenting code

## Development

```bash
# Install dependencies
npm ci

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Stack

- **React 19**: Latest React with hooks and concurrent features
- **TypeScript**: Full type safety across the codebase
- **Vite**: Fast build tool with HMR
- **rolldown-vite**: Optimized Vite build for better performance

## Key Files

- `src/App.tsx`: Main application component (TypeScript)
- `src/api.ts`: Type-safe API client
- `src/types/index.ts`: Shared TypeScript interfaces
- `tsconfig.json`: TypeScript configuration
