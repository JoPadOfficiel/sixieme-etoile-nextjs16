# AGENTS.md - Complete Project Documentation

## Table of Contents

- [AGENTS.md - Complete Project Documentation](#agentsmd---complete-project-documentation)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
    - [Key Features](#key-features)
  - [Technology Stack](#technology-stack)
    - [Core Framework](#core-framework)
    - [Styling \& UI](#styling--ui)
    - [Database \& ORM](#database--orm)
    - [Validation \& Utils](#validation--utils)
    - [Development Tools](#development-tools)
    - [Testing](#testing)
  - [Project Structure](#project-structure)
  - [BMAD Methodology](#bmad-methodology)
    - [Core Components](#core-components)
      - [1. Configuration](#1-configuration)
      - [2. Workflow System](#2-workflow-system)
    - [BMAD Enhanced Workflow for Google Jules](#bmad-enhanced-workflow-for-google-jules)
      - [BMAD Orchestrator Protocol](#bmad-orchestrator-protocol)
      - [Google Jules Integration](#google-jules-integration)
  - [Development Workflow](#development-workflow)
    - [1. Environment Setup](#1-environment-setup)
      - [Prerequisites](#prerequisites)
      - [Installation](#installation)
    - [2. Development Commands](#2-development-commands)
  - [Architecture Patterns](#architecture-patterns)
    - [1. App Router Structure (Next.js 16)](#1-app-router-structure-nextjs-16)
    - [2. Package-Based Architecture](#2-package-based-architecture)
    - [3. Data Layer](#3-data-layer)
  - [Deployment \& CI/CD](#deployment--cicd)
    - [Google Jules Integration](#google-jules-integration-1)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)

## Project Overview

**Sixieme Etoile Next.js 16** is a modern VTC (Vehicle for Hire) management platform built as a monorepo. It leverages a robust stack customized for Fleetavia/Sixieme Etoile operations, utilizing the BMAD (Business Model Architecture Development) methodology.

### Key Features
- **Monorepo Architecture**: Efficient code sharing via `packages/` and `apps/web`.
- **VTC Specifics**: specialized data seeding (`seed-vtc-complete.ts`), pricing engines, and fleet management.
- **Internationalization**: Full `next-intl` support (fr, en implementation).
- **Type Safety**: End-to-end type safety with TypeScript, Zod, and Prisma.
- **Modern Tooling**: Turborepo, Biome (linting/formatting), and granular package separation.

## Technology Stack

### Core Framework
- **Next.js 16.0.8**: App Router, Server Components, Turbopack enabled (`--turbo`).
- **React 19.2.1**: leveraging latest React features (View Transitions, Actions).
- **TypeScript 5.6.3**: Strict typing configuration.

### Styling & UI
- **Tailwind CSS 3.4.15**: Utility-first CSS framework.
- **shadcn/ui**: Component library based on Radix UI.
- **Lucide React**: Iconography.
- **Framer Motion**: Animations.

### Database & ORM
- **Prisma 6.0.0**: ORM with type-safe client.
- **PostgreSQL**: Relational database.
- **Seeding**: Custom VTC seeder (`packages/database/prisma/seed-vtc-complete.ts`).

### Validation & Utils
- **Zod 3.23.8**: Schema validation.
- **Biome 1.9.4**: High-performance linter and formatter (replaces ESLint/Prettier for strict tasks).

### Development Tools
- **Turbo 2.3.3**: High-performance build system/task runner.
- **pnpm 9.3.0**: Efficient package manager.

### Testing
- **Cypress 13.16.0**: End-to-End (E2E) testing.
- **Vitest**: Unit and integration testing (`packages/api`, `apps/web`).

## Project Structure

```
sixieme-etoile-nextjs16/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/                # App Router (pages/layouts)
│       ├── components/         # React components
│       ├── lib/                # App-specific utilities
│       ├── public/             # Static assets
│       └── cypress/            # E2E Tests
├── packages/                   # Shared internal packages
│   ├── api/                    # API logic and definition
│   ├── auth/                   # Authentication logic (Better Auth / NextAuth)
│   ├── database/               # Prisma schema and client
│   ├── i18n/                   # Translation logic
│   ├── mail/                   # Email templates and sending
│   ├── payments/               # Payment processing
│   ├── storage/                # File storage
│   ├── ui/                     # Shared UI components
│   └── utils/                  # Common utilities
├── _bmad/                      # BMAD framework configuration
│   ├── bmm/                    # Business Model Management
│   └── core/                   # Core BMAD functionality
├── .gemini/                    # Gemini AI configurations
│   └── jules/                  # Google Jules VM setup scripts
├── docs/                       # Project Documentation
└── scripts/                    # Maintenance scripts
```

## BMAD Methodology

The BMAD (Business Model Architecture Development) methodology provides a structured approach to software development with specialized agents and workflows.

### Core Components

#### 1. Configuration
Located in `_bmad/bmm/config.yaml`:
- **Project**: `sixieme-etoile-nextjs16`
- **User**: `JoPad`
- **Language**: French (communication), English (docs output)

#### 2. Workflow System
Automated workflows for common development tasks:
- **Story Creation**: `/create-story`
- **Development**: `/dev-story`
- **Review**: `/code-review`

### BMAD Enhanced Workflow for Google Jules

This project includes an enhanced BMAD workflow optimized for Google Jules VM environments.

#### BMAD Orchestrator Protocol

**Immutable Order**: `@[_bmad-output]` → `/create-story` → `/dev-story`

1.  **ANALYSIS (@[_bmad-output])**: Define business object, value, constraints.
2.  **SPECIFICATION (/create-story)**: Generate actionable Story card (AC, Tests).
3.  **DEVELOPMENT (/dev-story)**:
    *   **Branch**: `feature/<id-story>-<slug>`
    *   **Implementation**: Complete code (no placeholders).
    *   **Testing**:
        *   **Cypress/Vitest**: Automated tests.
        *   **Browser/Curl**: Manual verification fallback.
        *   **Database**: Verify data integrity via SQL/Prisma Studio.

#### Google Jules Integration

*   **Setup (Basic)**: Use `node .gemini/jules/scripts/script-setup.js` to generate `setup-jules.sh` (No seed).
*   **Setup (VTC)**: Use `node .gemini/jules/scripts/script-setup-vtc.js` to generate `setup-jules-vtc.sh` (With seed).
*   **Execution**: Run the generated script in Jules to provision the environment.

## Development Workflow

### 1. Environment Setup

#### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- pnpm 9.3.0+

#### Installation

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Database setup
pnpm build --filter @repo/database # Ensure db package is built if needed
pnpm db:migrate
pnpm db:generate

# Seed Data (VTC)
pnpm seed:vtc
```

### 2. Development Commands

```bash
# Start development server (Web)
pnpm dev

# Type check
pnpm type-check

# Lint & Format (Biome)
pnpm lint
pnpm format

# Testing
pnpm e2e    # Run Cypress
pnpm test   # Run Vitest
```

## Architecture Patterns

### 1. App Router Structure (Next.js 16)
Uses the `app/` directory for routing, layouts, and loading states.
- **Server Actions**: Used for form mutations and data operations.
- **Route Handlers**: API endpoints in `app/api/`.

### 2. Package-Based Architecture
Logic is separated into `packages/` to ensure modularity:
- `@repo/database`: Single source of truth for Prisma.
- `@repo/auth`: Centralized auth logic.
- `@repo/ui`: Shared design system.

### 3. Data Layer
- **Prisma**: Used for all DB access.
- **Zod**: Used for validating API inputs and Server Action payloads.

## Deployment & CI/CD

### Google Jules Integration

The project is configured for automated setup on Google Jules VMs. We provide two scripts, but **for a fully configured VTC project, you MUST use the VTC Complete script.**

1.  **Generate Scripts** (Run locally):
    *   **Basic**: `pnpm jules:setup` (or `node .gemini/jules/scripts/script-setup.js`)
    *   **VTC Complete**: `pnpm jules:setup:vtc` (or `node .gemini/jules/scripts/script-setup-vtc.js`)
    
2.  **Deploy**:
    *   Copy the content of the generated shell script (e.g., `.gemini/jules/env/setup-jules-vtc.sh`) from your local machine.
    *   Paste it into the Google Jules **Startup Script** configuration.
    *   Run the environment setup.

3.  **Access & Credentials**:
    *   **IMPORTANT**: When the setup finishes, **check the terminal/setup logs**.
    *   The `seed:vtc` process outputs the **Admin Email** and **Password** required to log in.
    *   Use these credentials to access the application dashboard.

This script handles:
-   Repo cloning
-   Env var injection
-   Dependency installation
-   DB Migration
-   **VTC Data Seeding** (Crucial for having a working project structure)

## Troubleshooting

### Common Issues

*   **Database Sync**: If types are out of sync, run `pnpm db:generate`.
*   **Linting**: Uses Biome. If ESLint commands fail, check if you should use `pnpm lint` (which maps to `biome lint`).
*   **Turbo Cache**: If strange build errors occur, run `pnpm clean` to clear Turbo cache.

---
**Note**: This documentation is specific to the `sixieme-etoile-nextjs16` project and its customized technology stack.
