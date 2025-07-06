# Pixelated Empathy Information

## Summary
Pixelated Empathy is an AI-first training simulation platform for mental health professionals. It provides a zero-risk environment where therapists can practice with AI-simulated clients presenting challenging, rare, and complex cases without endangering vulnerable populations.

## Structure
The project is built as an Astro-based web application with React components, TypeScript, and various AI services. The repository follows a modern web application structure with server-side rendering capabilities.

## Language & Runtime
**Language**: TypeScript/JavaScript with some Python components
**Version**: TypeScript 5.3+, Node.js 22.x
**Build System**: Astro with Vite
**Package Manager**: pnpm 10.12.4

## Dependencies
**Main Dependencies**:
- Astro 4.x (Web framework)
- React 19.x (UI components)
- Tailwind CSS 4.x (Styling)
- OpenAI SDK (AI capabilities)
- Supabase (Database/Auth)
- Sentry (Monitoring)
- Redis (Caching)
- TensorFlow.js (Client-side ML)

**Development Dependencies**:
- Vitest (Unit testing)
- Playwright (E2E testing)
- ESLint/Oxlint (Linting)
- TypeScript (Type checking)

## Build & Installation
```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Preview production build
pnpm preview
```

## Docker
**Dockerfile**: Dockerfile at repository root
**Image**: Node 22-slim based image
**Configuration**: Multi-stage build with production optimization
**Run Command**:
```bash
pnpm docker:build
pnpm docker:run
```

## Testing
**Frameworks**: Vitest (unit/integration), Playwright (E2E)
**Test Location**: 
- Unit/Integration: `src/**/*.{test,spec}.{ts,tsx}`
- E2E: `tests/e2e/**/*.spec.ts`
- Browser: `tests/browser/**/*.spec.ts`
- Accessibility: `tests/accessibility/**/*.spec.ts`

**Run Commands**:
```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# All tests
pnpm test:all
```

## AI Components
**AI Services**: 
- OpenAI integration
- Azure OpenAI integration
- Google AI (Gemini) integration
- Bias detection system
- Memory system for conversation context

**AI Data Processing**:
- Dataset preparation tools
- Fine-tuning preparation
- Dialogue generation pipeline

## Security Features
**Privacy**: 
- Fully Homomorphic Encryption (FHE)
- Zero-Knowledge Proofs
- HIPAA compliance measures

**Monitoring**:
- Sentry integration
- Custom security scanning
- Audit logging

## Deployment
**Platforms**:
- Azure App Service (primary)
- AWS (alternative)
- Docker containers

**CI/CD**:
- GitHub Actions
- Azure Pipelines
- Deployment scripts for staging/production