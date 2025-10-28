# Project Structure

## Root Directory Layout

```
├── api/                    # Express.js backend application
├── src/                    # React frontend application
├── migrations/             # PostgreSQL database migrations
├── scripts/                # Node.js utility scripts
├── public/                 # Static assets served by Vite
├── repo-docs/              # Feature documentation and API references
├── .kiro/                  # Kiro IDE configuration and steering
├── .env.example            # Environment configuration template
└── package.json            # Dependencies and npm scripts
```

## Backend Structure (`api/`)

```
api/
├── app.ts                  # Express app configuration and middleware
├── server.ts               # Development server entry point
├── index.ts                # Production entry point
├── config/                 # Configuration management
├── lib/                    # Database and utility functions
├── middleware/             # Express middleware (auth, rate limiting)
├── routes/                 # API route handlers
└── services/               # Business logic and external integrations
```

## Frontend Structure (`src/`)

```
src/
├── App.tsx                 # Main app component with routing
├── main.tsx                # React app entry point
├── index.css               # Global styles and Tailwind imports
├── components/             # Reusable UI components
├── contexts/               # React context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API client
├── pages/                  # Route components
├── services/               # Frontend service layer
├── theme/                  # Theme configuration
└── types/                  # TypeScript type definitions
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Pages**: PascalCase (e.g., `Dashboard.tsx`)
- **Utilities**: camelCase (e.g., `apiClient.ts`)
- **Types**: camelCase with `.types.ts` suffix
- **Services**: camelCase with descriptive names

### Import Paths
- Use `@/` alias for `src/` imports in frontend
- Relative imports for backend (`./` and `../`)
- Group imports: external libraries, internal modules, relative imports

### Component Structure
- Use functional components with hooks
- Export default for main component, named exports for utilities
- Co-locate related components in subdirectories
- Use `index.ts` files for clean imports

### API Routes
- RESTful conventions with consistent response format
- Group related routes in separate files
- Use middleware for common functionality (auth, validation)
- Prefix all API routes with `/api/`

### Database
- Sequential numbered migrations (001_, 002_, etc.)
- Use transactions for multi-table operations
- Database access through `api/lib/database.ts`
- Activity logging for auditable events

### Environment Configuration
- Use `.env` for local development
- Prefix frontend variables with `VITE_` or `COMPANY-`
- Validate required environment variables on startup
- Separate development and production configurations

### Testing
- Unit tests co-located with source files
- Integration tests in `__tests__` directories
- Use Vitest for both frontend and backend testing
- Mock external services and APIs