# Pixelated Empathy Repository Information

## Summary
Pixelated Empathy is an AI-first training simulation platform for mental health professionals. It provides a zero-risk environment where therapists can practice with AI-simulated clients presenting challenging, rare, and complex cases without endangering vulnerable populations.

## Structure
The repository is organized as a microservices architecture with several key components:
- **Web Frontend**: Astro-based web application with React components
- **AI Services**: LLM integration for mental health simulations
- **Bias Detection**: Service for detecting bias in therapeutic interactions
- **Analytics**: Service for tracking and analyzing training metrics
- **Background Jobs**: Worker service for handling asynchronous tasks

## Language & Runtime
**Language**: TypeScript, JavaScript, Python
**Version**: Node.js 22.x, Python 3.x
**Build System**: Astro, Vite
**Package Manager**: pnpm 10.12.4

## Dependencies
**Main Dependencies**:
- Astro 4.x (Web framework)
- React 19.x (UI components)
- OpenAI SDK (AI integration)
- Supabase (Database and authentication)
- TensorFlow.js (Client-side ML)
- Redis (Caching)
- PostgreSQL (Database)

**Development Dependencies**:
- Playwright (E2E testing)
- Vitest (Unit testing)
- TypeScript (Type checking)
- ESLint/OxLint (Linting)

## Build & Installation
```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Production build
pnpm build

# Start production server
pnpm preview
```

## Docker
**Dockerfile**: Multi-stage build using Node 22 slim
**Compose**: Microservices architecture with web, AI services, bias detection, analytics, PostgreSQL, Redis
**Configuration**: Production-ready setup with health checks and proper networking

## Testing
**Framework**: Playwright (E2E), Vitest (Unit/Integration)
**Test Location**: `/tests` directory and component-level tests
**Run Command**:
```bash
# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# All tests
pnpm test:all
```

## Microservices
The application is structured as several interconnected services:
- **Web**: Astro-based frontend (port 3000)
- **Bias Detection**: AI bias detection service (port 8001)
- **AI Service**: LLM integration service (port 8002)
- **Analytics**: Metrics and monitoring service (port 8003)
- **Background Jobs**: Asynchronous task processing
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for caching and session management

## Security Features
- HIPAA compliance measures
- Fully Homomorphic Encryption (FHE) for secure data processing
- Zero-knowledge proofs for privacy-preserving verification
- Real-time bias detection across interactions

## Deployment
The application supports multiple deployment targets:
- Azure App Service (primary)
- AWS Amplify
- Docker containers
- Fly.io

## Key Application Components
- Mental health chat simulations
- Therapeutic training modules
- Bias detection and analytics
- User authentication and progress tracking
- Admin dashboard for monitoring