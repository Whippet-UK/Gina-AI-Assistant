/**
 * Code Engine Studio — profile dictionary + shortcode resolver.
 * Unknown / missing shortcodes fall back to GLOBAL_CODE_DEFAULTS.
 */

/** Supported CPython targets for Python-oriented profiles. */
export type PythonVersion = '3.10' | '3.11' | '3.12' | '3.13';

export const PYTHON_VERSIONS: { id: PythonVersion; label: string }[] = [
  { id: '3.10', label: 'Python 3.10' },
  { id: '3.11', label: 'Python 3.11' },
  { id: '3.12', label: 'Python 3.12' },
  { id: '3.13', label: 'Python 3.13' },
];

export interface CodeSettings {
  targetEnvironment: string;
  typescriptStrict: boolean;
  inlineDocumentation: string;
  securityScanLevel: string;
  autoLintCode: boolean;
  maxOutputTokens: number;
  executionModel: string;
  /** Applied when generating Python-oriented profiles. */
  pythonVersion?: PythonVersion;
}

export interface CodeAdvanced {
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  optimizationPasses: number;
}

export interface CodeProfile {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'general' | string;
  positivePrompt: string;
  settings?: Partial<CodeSettings>;
  advanced?: Partial<CodeAdvanced>;
}

/** Safe baseline applied when no profile shortcode matches. */
export const GLOBAL_CODE_DEFAULTS = {
  settings: {
    targetEnvironment: 'Node.js ESM',
    typescriptStrict: true,
    inlineDocumentation: 'Sparse',
    securityScanLevel: 'Standard',
    autoLintCode: true,
    maxOutputTokens: 2048,
    /** Local stack uses Qwen Coder GGUF; label kept for profile compatibility. */
    executionModel: 'Qwen-2.5-Coder-Local',
    pythonVersion: '3.11',
  } satisfies CodeSettings,
  advanced: {
    temperature: 0.0,
    topP: 0.1,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    optimizationPasses: 1,
  } satisfies CodeAdvanced,
};

export const GINA_CODE_PROFILES: CodeProfile[] = [
  {
    id: 'react_component',
    name: 'Modern React Functional Component',
    category: 'frontend',
    positivePrompt:
      'Generate an isolated functional React component using TypeScript 5.8 and Tailwind CSS v4 styles. Do not provide markdown wrapper commentary or explanations. Export types clearly.',
    settings: {
      targetEnvironment: 'Vite React Client',
      typescriptStrict: true,
      inlineDocumentation: 'JSDoc Headers Only',
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'database_migration',
    name: 'Relational Schema Migration Script',
    category: 'backend',
    positivePrompt:
      'Generate optimized raw SQL schema migrations. Every alter table layout must include down-migration rollback hooks wrapped securely in transactions.',
    settings: {
      targetEnvironment: 'PostgreSQL 16',
      typescriptStrict: false,
      securityScanLevel: 'Extreme Critical',
    },
    advanced: {
      temperature: 0.0,
      topP: 0.0,
    },
  },
  {
    id: 'website',
    name: 'Full Website (Static HTML5)',
    category: 'frontend',
    positivePrompt:
      'Build a complete multi-section website as a single self-contained static HTML5 file. Include semantic structure, responsive layout, accessible navigation, hero, features, about/content sections, and footer. Use modern CSS (Tailwind CDN or clean embedded CSS). Prefer real content placeholders over lorem ipsum when the user describes the brand. Do NOT use React, JSX, or a build step. No markdown commentary — output only the HTML ready to open in a browser or save as index.html.',
    settings: {
      targetEnvironment: 'Static HTML5 + CSS',
      typescriptStrict: false,
      inlineDocumentation: 'Sparse section comments only',
      securityScanLevel: 'Standard',
      autoLintCode: true,
      maxOutputTokens: 4096,
      executionModel: 'Qwen-2.5-Coder-Local',
    },
    advanced: {
      temperature: 0.05,
      topP: 0.2,
      optimizationPasses: 2,
    },
  },
  {
    id: 'website_landing',
    name: 'Marketing Landing Page (Static HTML5)',
    category: 'frontend',
    positivePrompt:
      'Create a high-conversion single-page marketing landing page as a single self-contained static HTML5 file: strong hero headline, primary CTA, social proof, feature grid, FAQ, and final CTA footer. Fully responsive, accessible, polished typography and spacing. Use embedded CSS or Tailwind CDN. Do NOT use React or JSX. No explanatory markdown — code only.',
    settings: {
      targetEnvironment: 'Static HTML5 + Tailwind CDN',
      typescriptStrict: false,
      inlineDocumentation: 'None',
      maxOutputTokens: 3072,
    },
    advanced: {
      temperature: 0.1,
      optimizationPasses: 2,
    },
  },
  {
    id: 'website_react',
    name: 'Full Website (React + TypeScript)',
    category: 'frontend',
    positivePrompt:
      'Build a complete multi-section website as a Vite React 19 + TypeScript 5.8 app using Tailwind CSS v4 utility classes. Structure: App shell, routed or section-based pages (Hero, Features, About, Contact, Footer), reusable components, and exported types. Prefer real brand content from the user over lorem ipsum. Output production-ready component files and a clear file tree. No markdown wrapper commentary beyond minimal file path headers.',
    settings: {
      targetEnvironment: 'Vite React Client',
      typescriptStrict: true,
      inlineDocumentation: 'JSDoc Headers Only',
      securityScanLevel: 'Standard',
      autoLintCode: true,
      maxOutputTokens: 4096,
      executionModel: 'Qwen-2.5-Coder-Local',
    },
    advanced: {
      temperature: 0.0,
      topP: 0.15,
      optimizationPasses: 2,
    },
  },
  {
    id: 'react_typescript',
    name: 'React + TypeScript App',
    category: 'frontend',
    positivePrompt:
      'Create a production-oriented React 19 + TypeScript 5.8 application (Vite). Use strict types, functional components, hooks, and clear module boundaries. Include typed props/interfaces, error boundaries where useful, and Tailwind CSS v4 utilities. Prefer small composable files over one monolith. Output code only with brief file-path headers — no tutorial prose.',
    settings: {
      targetEnvironment: 'Vite React Client',
      typescriptStrict: true,
      inlineDocumentation: 'JSDoc Headers Only',
      securityScanLevel: 'Standard',
      autoLintCode: true,
      maxOutputTokens: 4096,
      executionModel: 'Qwen-2.5-Coder-Local',
    },
    advanced: {
      temperature: 0.0,
      topP: 0.1,
      optimizationPasses: 2,
    },
  },
  {
    id: 'nextjs_app',
    name: 'Next.js App Router',
    category: 'frontend',
    positivePrompt:
      'Build a Next.js (App Router) application with TypeScript and Tailwind CSS. Use server and client components appropriately, typed route handlers where needed, and clean app/ directory structure. Prefer Server Components by default; mark Client Components only when interactivity requires it. Output file tree + source — no lengthy explanations.',
    settings: {
      targetEnvironment: 'Next.js App Router',
      typescriptStrict: true,
      inlineDocumentation: 'JSDoc Headers Only',
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'vue_app',
    name: 'Vue 3 + TypeScript App',
    category: 'frontend',
    positivePrompt:
      'Create a Vue 3 Composition API + TypeScript application (Vite). Use <script setup lang="ts">, typed props/emits, and modular single-file components. Prefer Pinia only if state is non-trivial. Output SFC code with file paths — no tutorial markdown.',
    settings: {
      targetEnvironment: 'Vite Vue 3',
      typescriptStrict: true,
      inlineDocumentation: 'Sparse',
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'express_api',
    name: 'Express REST API',
    category: 'backend',
    positivePrompt:
      'Build a secure Node.js Express REST API with TypeScript (ESM). Include typed routes, input validation, error middleware, and environment-based config. Prefer clear folder structure (routes, controllers, services). No secrets in source. Output runnable code only.',
    settings: {
      targetEnvironment: 'Node.js ESM + Express',
      typescriptStrict: true,
      securityScanLevel: 'High',
      autoLintCode: true,
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.0,
      topP: 0.1,
      optimizationPasses: 2,
    },
  },
  {
    id: 'electron_desktop',
    name: 'Electron Desktop App',
    category: 'desktop',
    positivePrompt:
      'Scaffold an Electron desktop app with a secure main process, preload bridge, and renderer UI (HTML or React + TypeScript). Enforce contextIsolation, disable nodeIntegration in the renderer, and use IPC via contextBridge only. Output main/preload/renderer files with clear paths.',
    settings: {
      targetEnvironment: 'Electron + TypeScript',
      typescriptStrict: true,
      securityScanLevel: 'Extreme Critical',
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'react_native',
    name: 'React Native Mobile App',
    category: 'mobile',
    positivePrompt:
      'Create a React Native (TypeScript) mobile screen or mini-app using functional components and typed navigation props. Prefer platform-safe styling (StyleSheet). Keep dependencies minimal. Output component and entry files only — no long setup essays.',
    settings: {
      targetEnvironment: 'React Native TypeScript',
      typescriptStrict: true,
      inlineDocumentation: 'JSDoc Headers Only',
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'chrome_extension',
    name: 'Chrome Extension (MV3)',
    category: 'frontend',
    positivePrompt:
      'Build a Manifest V3 Chrome extension with TypeScript where practical: manifest.json, service worker background, content script if needed, and popup UI. Follow MV3 service-worker rules (no persistent background page). Keep permissions minimal. Output all required files.',
    settings: {
      targetEnvironment: 'Chrome Extension MV3',
      typescriptStrict: true,
      securityScanLevel: 'High',
      maxOutputTokens: 3072,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 2,
    },
  },
  {
    id: 'python_cli',
    name: 'Python CLI Tool',
    category: 'backend',
    positivePrompt:
      'Write a clean Python 3.10+ CLI tool with argparse or click, typed functions where helpful, clear exit codes, and a main guard. Prefer the standard library unless a package is essential. Output a single runnable module or small package layout — no markdown tutorial.',
    settings: {
      targetEnvironment: 'Python 3.10+',
      typescriptStrict: false,
      securityScanLevel: 'Standard',
      maxOutputTokens: 3072,
    },
    advanced: {
      temperature: 0.0,
      optimizationPasses: 1,
    },
  },
  {
    id: 'dashboard_app',
    name: 'Admin Dashboard UI',
    category: 'frontend',
    positivePrompt:
      'Build an admin dashboard UI with sidebar navigation, top bar, KPI cards, data table, and detail panel. Use React 19 + TypeScript + Tailwind CSS v4. Include mock data types and loading/empty states. Code only with file-path headers.',
    settings: {
      targetEnvironment: 'Vite React Client',
      typescriptStrict: true,
      maxOutputTokens: 4096,
    },
    advanced: {
      temperature: 0.05,
      optimizationPasses: 2,
    },
  },

  // —— React + TypeScript + Tailwind core ——
  {
    id: 'react_ts_tailwind',
    name: 'React + TypeScript + Tailwind',
    category: 'frontend',
    positivePrompt:
      'Build with React 19, TypeScript 5.8 (strict), and Tailwind CSS v4. Functional components only, typed props, no any. Prefer small composable files. Output code with file-path headers only.',
    settings: { targetEnvironment: 'Vite React + TS + Tailwind v4', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'react_ts_api',
    name: 'React + TypeScript + API Client',
    category: 'frontend',
    positivePrompt:
      'React 19 + TypeScript app that talks to a REST API. Include typed fetch/axios helpers, loading/error states, and DTOs matching API JSON. Tailwind for UI. No fake network calls without typed mocks.',
    settings: { targetEnvironment: 'Vite React + TS + REST client', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'react_ts_tailwind_api',
    name: 'React + TS + Tailwind + API',
    category: 'fullstack',
    positivePrompt:
      'Full UI stack: React 19 + TypeScript + Tailwind CSS v4 frontend consuming a typed REST API. Provide both UI components and a minimal Express/Fastify API or clear API contract types. Strict TS, no any.',
    settings: { targetEnvironment: 'Vite React + TS + Tailwind + Node API', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'react_hook_form',
    name: 'React Hook Form + Zod',
    category: 'frontend',
    positivePrompt:
      'Build forms with React Hook Form, Zod schemas, and TypeScript inferred types. Accessible labels, validation messages, Tailwind styling. Export schema + form component.',
    settings: { targetEnvironment: 'Vite React + RHF + Zod', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_query',
    name: 'React Query / TanStack Query',
    category: 'frontend',
    positivePrompt:
      'Data-fetching UI with TanStack Query (React Query) + TypeScript. Typed query keys, mutations, optimistic updates where useful, and Tailwind-styled status UI.',
    settings: { targetEnvironment: 'Vite React + TanStack Query', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_router',
    name: 'React Router SPA',
    category: 'frontend',
    positivePrompt:
      'SPA with React Router v6/v7, TypeScript, and Tailwind. Nested routes, loaders if appropriate, protected route pattern, and typed route params.',
    settings: { targetEnvironment: 'Vite React Router + TS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_context',
    name: 'React Context State',
    category: 'frontend',
    positivePrompt:
      'Typed React Context + reducer or simple provider pattern. Avoid prop drilling. TypeScript strict, Tailwind consumers. No Redux unless asked.',
    settings: { targetEnvironment: 'Vite React + Context', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_zustand',
    name: 'React + Zustand Store',
    category: 'frontend',
    positivePrompt:
      'Zustand store with TypeScript, sliced state if needed, and React components bound to the store. Tailwind UI. Keep store pure and testable.',
    settings: { targetEnvironment: 'Vite React + Zustand', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_redux',
    name: 'React + Redux Toolkit',
    category: 'frontend',
    positivePrompt:
      'Redux Toolkit slices + TypeScript typed hooks (useAppDispatch/useAppSelector). React UI with Tailwind. Prefer RTK Query if API-heavy.',
    settings: { targetEnvironment: 'Vite React + Redux Toolkit', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_auth',
    name: 'React Auth UI',
    category: 'frontend',
    positivePrompt:
      'Login/register/logout UI with TypeScript, protected routes, token storage pattern (memory or httpOnly cookie notes), and Tailwind forms. Never hardcode secrets.',
    settings: { targetEnvironment: 'Vite React + Auth patterns', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_table',
    name: 'React Data Table',
    category: 'frontend',
    positivePrompt:
      'Sortable/filterable data table in React + TypeScript + Tailwind. Typed row model, pagination, empty/loading states. Prefer TanStack Table if suitable.',
    settings: { targetEnvironment: 'Vite React + Table', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_charts',
    name: 'React Charts Dashboard',
    category: 'frontend',
    positivePrompt:
      'Chart dashboard using React + TypeScript + Tailwind. Use Recharts or similar. Typed data series, responsive containers, legend and tooltips.',
    settings: { targetEnvironment: 'Vite React + Recharts', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'react_modal',
    name: 'React Modal / Dialog System',
    category: 'frontend',
    positivePrompt:
      'Accessible modal/dialog system in React + TypeScript + Tailwind: focus trap, Escape to close, backdrop, compound components or headless pattern.',
    settings: { targetEnvironment: 'Vite React + a11y dialogs', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_drag_drop',
    name: 'React Drag and Drop',
    category: 'frontend',
    positivePrompt:
      'Drag-and-drop lists or kanban in React + TypeScript + Tailwind. Prefer @dnd-kit or HTML5 DnD with typed items and clear keyboard alternatives notes.',
    settings: { targetEnvironment: 'Vite React + DnD', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_infinite_scroll',
    name: 'React Infinite Scroll List',
    category: 'frontend',
    positivePrompt:
      'Infinite scroll or virtualized list in React + TypeScript. Intersection Observer or windowing library, typed pages from an API, Tailwind list UI.',
    settings: { targetEnvironment: 'Vite React + virtual list', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_storybook',
    name: 'React Storybook Stories',
    category: 'frontend',
    positivePrompt:
      'Storybook stories for React + TypeScript components with Tailwind. CSF3 format, args/controls, and edge-state stories (loading, empty, error).',
    settings: { targetEnvironment: 'Storybook + React + TS', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'react_tests',
    name: 'React Testing Library',
    category: 'testing',
    positivePrompt:
      'Vitest + React Testing Library tests for React + TypeScript components. User-centric queries, no implementation-detail tests, clear arrange/act/assert.',
    settings: { targetEnvironment: 'Vitest + RTL', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },

  // —— Next.js family ——
  {
    id: 'nextjs_api',
    name: 'Next.js Route Handlers API',
    category: 'backend',
    positivePrompt:
      'Next.js App Router route handlers (TypeScript) as a JSON API. Validate input, typed responses, sensible status codes. No secrets in source.',
    settings: { targetEnvironment: 'Next.js Route Handlers', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nextjs_fullstack',
    name: 'Next.js Full-Stack App',
    category: 'fullstack',
    positivePrompt:
      'Next.js App Router full-stack feature: UI (React + TS + Tailwind) + server actions or route handlers + typed data layer. Prefer Server Components.',
    settings: { targetEnvironment: 'Next.js full-stack', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'nextjs_auth',
    name: 'Next.js Auth Session',
    category: 'fullstack',
    positivePrompt:
      'Auth session pattern for Next.js (Auth.js/NextAuth or similar) with TypeScript. Protected pages, session types, and secure cookie posture notes.',
    settings: { targetEnvironment: 'Next.js + Auth', typescriptStrict: true, securityScanLevel: 'Extreme Critical', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },

  // —— API / backend ——
  {
    id: 'rest_api',
    name: 'Generic REST API',
    category: 'backend',
    positivePrompt:
      'Design and implement a REST API with clear resources, status codes, pagination, and error shape. TypeScript Node preferred unless user specifies otherwise.',
    settings: { targetEnvironment: 'Node.js ESM API', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'graphql_api',
    name: 'GraphQL API',
    category: 'backend',
    positivePrompt:
      'GraphQL schema + resolvers with TypeScript. Typed context, input validation, and example queries. Prefer code-first or schema-first consistently.',
    settings: { targetEnvironment: 'GraphQL + TypeScript', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'trpc_api',
    name: 'tRPC API',
    category: 'fullstack',
    positivePrompt:
      'tRPC router + procedures with Zod input schemas and end-to-end TypeScript types. Show client usage from React.',
    settings: { targetEnvironment: 'tRPC + React', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'fastify_api',
    name: 'Fastify API',
    category: 'backend',
    positivePrompt:
      'Fastify + TypeScript JSON API with schema validation, plugins, and error handling. ESM modules.',
    settings: { targetEnvironment: 'Fastify + TypeScript', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nestjs_api',
    name: 'NestJS API',
    category: 'backend',
    positivePrompt:
      'NestJS modules, controllers, services, DTOs with class-validator, and TypeScript strict patterns. Clean layered structure.',
    settings: { targetEnvironment: 'NestJS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'fastapi_python',
    name: 'Python FastAPI',
    category: 'backend',
    positivePrompt:
      'FastAPI app with Pydantic models, path/query validation, and OpenAPI-friendly routes. Async where beneficial. No hardcoded secrets.',
    settings: { targetEnvironment: 'Python FastAPI', typescriptStrict: false, securityScanLevel: 'High', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'django_api',
    name: 'Django REST Framework',
    category: 'backend',
    positivePrompt:
      'Django REST Framework serializers, viewsets, and urls. Clear model assumptions and permission notes.',
    settings: { targetEnvironment: 'Django REST', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'websocket_api',
    name: 'WebSocket Service',
    category: 'backend',
    positivePrompt:
      'WebSocket server (Node ws or similar) with TypeScript message types, heartbeat, and reconnect-friendly protocol docs in comments only.',
    settings: { targetEnvironment: 'Node WebSocket + TS', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'grpc_api',
    name: 'gRPC Service',
    category: 'backend',
    positivePrompt:
      'gRPC service definition (.proto) and TypeScript or Go server stub structure. Clear RPC methods and error model.',
    settings: { targetEnvironment: 'gRPC', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'openapi_spec',
    name: 'OpenAPI Specification',
    category: 'backend',
    positivePrompt:
      'Write a complete OpenAPI 3.1 YAML/JSON spec for the described API: paths, schemas, auth, and examples.',
    settings: { targetEnvironment: 'OpenAPI 3.1', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },

  // —— Data / DB ——
  {
    id: 'prisma_schema',
    name: 'Prisma Schema + Client',
    category: 'backend',
    positivePrompt:
      'Prisma schema with relations, indexes, and example TypeScript client usage. Include migration notes in short comments.',
    settings: { targetEnvironment: 'Prisma + TypeScript', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'drizzle_orm',
    name: 'Drizzle ORM',
    category: 'backend',
    positivePrompt:
      'Drizzle ORM schema + queries in TypeScript. Type-safe selects/inserts and example relations.',
    settings: { targetEnvironment: 'Drizzle + TypeScript', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'sql_queries',
    name: 'SQL Query Pack',
    category: 'backend',
    positivePrompt:
      'Idempotent, readable SQL (PostgreSQL dialect unless specified): selects, joins, indexes, and explanatory comments only where needed.',
    settings: { targetEnvironment: 'PostgreSQL SQL', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'mongodb_api',
    name: 'MongoDB + Node API',
    category: 'backend',
    positivePrompt:
      'Node TypeScript API using MongoDB (official driver or Mongoose). Typed documents, indexes, and CRUD routes.',
    settings: { targetEnvironment: 'Node + MongoDB', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'redis_cache',
    name: 'Redis Cache Layer',
    category: 'backend',
    positivePrompt:
      'Redis caching helpers in TypeScript: get/set/invalidate, TTL strategy, and cache-aside pattern around a sample API.',
    settings: { targetEnvironment: 'Node + Redis', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },

  // —— More frontend frameworks ——
  {
    id: 'svelte_app',
    name: 'SvelteKit App',
    category: 'frontend',
    positivePrompt:
      'SvelteKit app with TypeScript. Load functions, components, and Tailwind if useful. Clean file-based routing.',
    settings: { targetEnvironment: 'SvelteKit + TS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'solid_app',
    name: 'SolidJS App',
    category: 'frontend',
    positivePrompt:
      'SolidJS + TypeScript UI with fine-grained reactivity and Tailwind. Signals/stores used idiomatically.',
    settings: { targetEnvironment: 'SolidJS + TS', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'angular_app',
    name: 'Angular App',
    category: 'frontend',
    positivePrompt:
      'Angular standalone components + TypeScript + reactive forms where needed. Services and routing structure.',
    settings: { targetEnvironment: 'Angular', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'tailwind_ui',
    name: 'Tailwind UI Kit',
    category: 'frontend',
    positivePrompt:
      'Pure HTML or React snippets styled only with Tailwind CSS v4 utility classes: cards, nav, forms, buttons. Responsive and accessible.',
    settings: { targetEnvironment: 'Tailwind CSS v4', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'shadcn_ui',
    name: 'shadcn/ui Components',
    category: 'frontend',
    positivePrompt:
      'Compose shadcn/ui-style React + TypeScript + Tailwind components (button, dialog, form). Accessible, typed variants.',
    settings: { targetEnvironment: 'React + shadcn/ui + Tailwind', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },

  // —— Apps by product type ——
  {
    id: 'saas_app',
    name: 'SaaS App Shell',
    category: 'fullstack',
    positivePrompt:
      'SaaS shell: marketing landing + authenticated app area. React + TypeScript + Tailwind, billing/settings placeholders, and typed user model.',
    settings: { targetEnvironment: 'Vite/Next React SaaS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05, optimizationPasses: 2 },
  },
  {
    id: 'ecommerce_store',
    name: 'E-commerce Storefront',
    category: 'frontend',
    positivePrompt:
      'Product listing, product detail, cart, and checkout UI. React + TypeScript + Tailwind. Typed Product/Cart models.',
    settings: { targetEnvironment: 'Vite React storefront', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'blog_cms',
    name: 'Blog / CMS Frontend',
    category: 'frontend',
    positivePrompt:
      'Blog index, post page, and simple CMS editor UI. React or static HTML as appropriate + TypeScript if React. Tailwind typography.',
    settings: { targetEnvironment: 'Blog frontend', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'chat_app',
    name: 'Realtime Chat UI',
    category: 'fullstack',
    positivePrompt:
      'Chat UI with message list, composer, and presence. React + TypeScript + Tailwind; optional WebSocket client types.',
    settings: { targetEnvironment: 'React chat + WS client', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'kanban_app',
    name: 'Kanban Board App',
    category: 'frontend',
    positivePrompt:
      'Kanban board with columns and cards. React + TypeScript + Tailwind, drag-and-drop optional, typed Board state.',
    settings: { targetEnvironment: 'Vite React kanban', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'calendar_app',
    name: 'Calendar / Scheduling UI',
    category: 'frontend',
    positivePrompt:
      'Week/month calendar UI with events. React + TypeScript + Tailwind. Typed Event model and create/edit dialog.',
    settings: { targetEnvironment: 'Vite React calendar', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'file_uploader',
    name: 'File Upload Widget',
    category: 'frontend',
    positivePrompt:
      'Drag-drop file uploader with progress, validation, and TypeScript types. React + Tailwind. Note size/type limits in UI.',
    settings: { targetEnvironment: 'Vite React uploader', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'pdf_report',
    name: 'PDF Report Generator',
    category: 'backend',
    positivePrompt:
      'Generate PDF reports (Node or Python). Structured layout, tables, and headers/footers. Prefer a well-known library and typed inputs.',
    settings: { targetEnvironment: 'Node or Python PDF', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'email_templates',
    name: 'HTML Email Templates',
    category: 'frontend',
    positivePrompt:
      'Responsive HTML email templates with inline CSS, table layout where required for clients, and clear preview text.',
    settings: { targetEnvironment: 'HTML email', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'cli_typescript',
    name: 'TypeScript CLI',
    category: 'backend',
    positivePrompt:
      'Node TypeScript CLI with commander/yargs, subcommands, and exit codes. ESM, strict types.',
    settings: { targetEnvironment: 'Node TS CLI', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'monorepo_package',
    name: 'Monorepo Package',
    category: 'general',
    positivePrompt:
      'Library package with TypeScript, exports map, and example consumer. Clear public API surface.',
    settings: { targetEnvironment: 'TS package', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'docker_compose',
    name: 'Docker Compose Stack',
    category: 'devops',
    positivePrompt:
      'docker-compose.yml for app + db (+ optional redis). Healthchecks, volumes, env files — no real secrets committed.',
    settings: { targetEnvironment: 'Docker Compose', typescriptStrict: false, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'github_actions',
    name: 'GitHub Actions CI',
    category: 'devops',
    positivePrompt:
      'GitHub Actions workflow: install, lint, test, build. Caching and Node/Python setup as relevant.',
    settings: { targetEnvironment: 'GitHub Actions', typescriptStrict: false, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'terraform_module',
    name: 'Terraform Module',
    category: 'devops',
    positivePrompt:
      'Terraform module with variables, outputs, and minimal resources. No hardcoded credentials.',
    settings: { targetEnvironment: 'Terraform', typescriptStrict: false, securityScanLevel: 'High', maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'regex_toolkit',
    name: 'Regex + Parsers',
    category: 'general',
    positivePrompt:
      'Robust regex/parsers with test cases. Prefer readable patterns and named groups. TypeScript or Python as asked.',
    settings: { targetEnvironment: 'Parsers', typescriptStrict: true, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'algorithm_ts',
    name: 'TypeScript Algorithms',
    category: 'general',
    positivePrompt:
      'Implement algorithms/data structures in strict TypeScript with complexity notes in brief comments and simple tests.',
    settings: { targetEnvironment: 'TypeScript', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'web_scraper',
    name: 'Web Scraper Script',
    category: 'backend',
    positivePrompt:
      'Ethical scraper script (Node or Python) with rate limiting, user-agent, and structured extract. Respect robots notes in comments.',
    settings: { targetEnvironment: 'Node/Python scraper', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'bot_discord',
    name: 'Discord Bot',
    category: 'backend',
    positivePrompt:
      'Discord bot (discord.js + TypeScript) with slash commands and typed handlers. Token from env only.',
    settings: { targetEnvironment: 'discord.js + TS', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'bot_telegram',
    name: 'Telegram Bot',
    category: 'backend',
    positivePrompt:
      'Telegram bot with TypeScript or Python, command handlers, and env-based token. Clear message flows.',
    settings: { targetEnvironment: 'Telegram bot', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'game_canvas',
    name: 'Canvas Mini-Game',
    category: 'frontend',
    positivePrompt:
      'Browser canvas mini-game with TypeScript, requestAnimationFrame loop, and keyboard/pointer input. Optional Tailwind chrome around the canvas.',
    settings: { targetEnvironment: 'Canvas + TS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.1 },
  },
  {
    id: 'threejs_scene',
    name: 'Three.js Scene',
    category: 'frontend',
    positivePrompt:
      'Three.js + TypeScript scene: camera, lights, mesh, basic animation. Clean dispose patterns.',
    settings: { targetEnvironment: 'Three.js + TS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.05 },
  },
  {
    id: 'pwa_app',
    name: 'Progressive Web App',
    category: 'frontend',
    positivePrompt:
      'PWA shell: manifest, service worker caching strategy, and React/TS UI with Tailwind. Offline fallback page.',
    settings: { targetEnvironment: 'PWA + React + TS', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'websocket_react',
    name: 'React + WebSocket Client',
    category: 'frontend',
    positivePrompt:
      'React + TypeScript WebSocket client hook with reconnect, typed messages, and Tailwind status indicators.',
    settings: { targetEnvironment: 'React WS client', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'jwt_auth_api',
    name: 'JWT Auth API',
    category: 'backend',
    positivePrompt:
      'JWT access/refresh auth API in TypeScript: register/login, hashed passwords, middleware guard. Env secrets only.',
    settings: { targetEnvironment: 'Express/Fastify JWT', typescriptStrict: true, securityScanLevel: 'Extreme Critical', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'crud_fullstack',
    name: 'CRUD Full-Stack',
    category: 'fullstack',
    positivePrompt:
      'End-to-end CRUD: React + TypeScript + Tailwind UI + REST API + typed models. List/create/edit/delete with validation.',
    settings: { targetEnvironment: 'React + TS + Tailwind + API', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },

  // —— Node.js stacks ——
  {
    id: 'nodejs',
    name: 'Node.js Script',
    category: 'backend',
    positivePrompt:
      'Write clean Node.js (ESM) JavaScript or TypeScript. Prefer built-ins, clear error handling, and a runnable entry file. No unnecessary dependencies.',
    settings: { targetEnvironment: 'Node.js ESM', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_typescript',
    name: 'Node.js + TypeScript',
    category: 'backend',
    positivePrompt:
      'Node.js ESM + TypeScript strict project: tsconfig, typed modules, and a clear main entry. Prefer undici/fetch and node: APIs.',
    settings: { targetEnvironment: 'Node.js ESM + TypeScript', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'nodejs_http',
    name: 'Node.js HTTP Server',
    category: 'backend',
    positivePrompt:
      'Native node:http or node:http2 server with routing helpers, JSON body parsing, and typed handlers if TypeScript. No framework unless asked.',
    settings: { targetEnvironment: 'Node.js http', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_worker',
    name: 'Node.js Worker Threads',
    category: 'backend',
    positivePrompt:
      'Node.js worker_threads pool for CPU work: main thread API, worker file, message types, and graceful shutdown.',
    settings: { targetEnvironment: 'Node.js workers', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_streams',
    name: 'Node.js Streams Pipeline',
    category: 'backend',
    positivePrompt:
      'Node.js stream.pipeline processors for files or HTTP: transform streams, backpressure-aware, error propagation.',
    settings: { targetEnvironment: 'Node.js streams', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_cron',
    name: 'Node.js Cron / Scheduler',
    category: 'backend',
    positivePrompt:
      'Scheduled jobs in Node.js (node-cron or setInterval with leadership notes). Idempotent tasks, logging, and env config.',
    settings: { targetEnvironment: 'Node.js scheduler', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_queue',
    name: 'Node.js Job Queue',
    category: 'backend',
    positivePrompt:
      'Background job queue in Node.js (BullMQ/Bee-Queue style or in-memory for demos). Producers, consumers, retries, and dead-letter notes.',
    settings: { targetEnvironment: 'Node.js queue', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_websocket',
    name: 'Node.js WebSocket Server',
    category: 'backend',
    positivePrompt:
      'ws-based WebSocket server on Node.js with TypeScript message types, rooms/broadcast optional, heartbeat, and clean close.',
    settings: { targetEnvironment: 'Node.js ws', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_file_server',
    name: 'Node.js Static File Server',
    category: 'backend',
    positivePrompt:
      'Secure static file server in Node.js: path traversal guards, content-type mapping, cache headers, optional SPA fallback.',
    settings: { targetEnvironment: 'Node.js static server', typescriptStrict: true, securityScanLevel: 'High', maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_middleware',
    name: 'Express Middleware Pack',
    category: 'backend',
    positivePrompt:
      'Reusable Express middleware: request id, error handler, rate limit stub, CORS, and typed Request extensions in TypeScript.',
    settings: { targetEnvironment: 'Express middleware', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_auth_session',
    name: 'Node.js Session Auth',
    category: 'backend',
    positivePrompt:
      'Session-based auth for Express/Fastify: secure cookies, store interface, login/logout, and CSRF notes. Env-based secrets only.',
    settings: { targetEnvironment: 'Node.js sessions', typescriptStrict: true, securityScanLevel: 'Extreme Critical', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_oauth',
    name: 'Node.js OAuth Client',
    category: 'backend',
    positivePrompt:
      'OAuth 2.0 authorization-code flow helper in Node.js TypeScript: state/PKCE, token exchange, and refresh. No hardcoded client secrets.',
    settings: { targetEnvironment: 'Node.js OAuth', typescriptStrict: true, securityScanLevel: 'Extreme Critical', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_email',
    name: 'Node.js Email Sender',
    category: 'backend',
    positivePrompt:
      'Transactional email sender in Node.js (nodemailer or fetch to a provider API). Templates, typed payloads, env credentials.',
    settings: { targetEnvironment: 'Node.js email', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_logging',
    name: 'Node.js Structured Logging',
    category: 'backend',
    positivePrompt:
      'Structured logger for Node.js (pino-style): levels, child loggers, request bindings, and JSON output.',
    settings: { targetEnvironment: 'Node.js logging', typescriptStrict: true, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_config',
    name: 'Node.js Config Loader',
    category: 'backend',
    positivePrompt:
      'Typed config loader from env + optional JSON/YAML with zod/valibot validation and fail-fast on missing required keys.',
    settings: { targetEnvironment: 'Node.js config', typescriptStrict: true, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_testing',
    name: 'Node.js Test Suite',
    category: 'testing',
    positivePrompt:
      'Vitest or node:test suite for Node.js/TypeScript modules: unit tests, mocks, and table-driven cases.',
    settings: { targetEnvironment: 'Vitest / node:test', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_esm_package',
    name: 'Node.js ESM Package',
    category: 'backend',
    positivePrompt:
      'Publishable ESM package: package.json exports, TypeScript types, dual notes if needed, and minimal API surface.',
    settings: { targetEnvironment: 'Node.js package', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'koa_api',
    name: 'Koa API',
    category: 'backend',
    positivePrompt:
      'Koa + TypeScript API with composable middleware, typed context state, and JSON routes.',
    settings: { targetEnvironment: 'Koa + TypeScript', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'hono_api',
    name: 'Hono API',
    category: 'backend',
    positivePrompt:
      'Hono API (Node or edge-style) with TypeScript, validators, and typed routes. Keep it small and fast.',
    settings: { targetEnvironment: 'Hono + TypeScript', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'socketio_server',
    name: 'Socket.IO Server',
    category: 'backend',
    positivePrompt:
      'Socket.IO server with TypeScript event maps, rooms, auth hook, and a minimal client example.',
    settings: { targetEnvironment: 'Socket.IO + TS', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },

  // —— Python stacks ——
  {
    id: 'python',
    name: 'Python Script',
    category: 'backend',
    positivePrompt:
      'Clean Python 3.10+ script with a main guard, argparse or simple CLI, type hints where helpful, and stdlib-first dependencies.',
    settings: { targetEnvironment: 'Python 3.10+', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_package',
    name: 'Python Package',
    category: 'backend',
    positivePrompt:
      'Installable Python package layout: pyproject.toml, src layout, __init__, and a small public API with type hints.',
    settings: { targetEnvironment: 'Python package', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_typing',
    name: 'Python Typed Module',
    category: 'backend',
    positivePrompt:
      'Fully typed Python module (typing / | unions), protocols if useful, and mypy-friendly annotations. No untyped dict soup.',
    settings: { targetEnvironment: 'Python typing', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_asyncio',
    name: 'Python asyncio Service',
    category: 'backend',
    positivePrompt:
      'asyncio application: tasks, queues, graceful shutdown, and aiohttp or asyncio streams as needed. Python 3.10+.',
    settings: { targetEnvironment: 'Python asyncio', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_httpx',
    name: 'Python HTTP Client',
    category: 'backend',
    positivePrompt:
      'httpx or requests client wrapper with timeouts, retries, typed response models (pydantic optional), and clear errors.',
    settings: { targetEnvironment: 'Python HTTP client', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'flask_api',
    name: 'Flask API',
    category: 'backend',
    positivePrompt:
      'Flask JSON API with blueprints, error handlers, and plain functions or simple services. Env config, no secrets in code.',
    settings: { targetEnvironment: 'Flask', typescriptStrict: false, securityScanLevel: 'High', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'starlette_api',
    name: 'Starlette API',
    category: 'backend',
    positivePrompt:
      'Starlette ASGI app with routes, middleware, and JSON endpoints. Prefer clear structure over frameworks-on-frameworks.',
    settings: { targetEnvironment: 'Starlette', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_celery',
    name: 'Celery Workers',
    category: 'backend',
    positivePrompt:
      'Celery tasks + worker config patterns: retries, idempotency, and a sample producer. Redis/Rabbit as broker notes only.',
    settings: { targetEnvironment: 'Celery', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_sqlalchemy',
    name: 'SQLAlchemy Models',
    category: 'backend',
    positivePrompt:
      'SQLAlchemy 2.0 style models and sessions with type hints. CRUD helpers and relationship examples.',
    settings: { targetEnvironment: 'SQLAlchemy 2', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_pydantic',
    name: 'Pydantic Models',
    category: 'backend',
    positivePrompt:
      'Pydantic v2 models with validation, aliases, and model_json_schema-friendly design. Include example parses.',
    settings: { targetEnvironment: 'Pydantic v2', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_pytest',
    name: 'pytest Suite',
    category: 'testing',
    positivePrompt:
      'pytest tests with fixtures, parametrize, and clear names. Prefer testing behaviour over internals.',
    settings: { targetEnvironment: 'pytest', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_dataclass',
    name: 'Python Dataclasses',
    category: 'backend',
    positivePrompt:
      'dataclass-based domain models with slots/kw_only where appropriate and conversion helpers to/from dict.',
    settings: { targetEnvironment: 'Python dataclasses', typescriptStrict: false, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_pathlib',
    name: 'Python File Processing',
    category: 'backend',
    positivePrompt:
      'Robust file/directory processing with pathlib, encoding handling, and safe writes (temp + replace).',
    settings: { targetEnvironment: 'Python pathlib', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_csv_json',
    name: 'Python CSV/JSON ETL',
    category: 'backend',
    positivePrompt:
      'ETL scripts for CSV/JSON: streaming where possible, schema validation, and CLI entry points.',
    settings: { targetEnvironment: 'Python ETL', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_pandas',
    name: 'Pandas Data Pipeline',
    category: 'backend',
    positivePrompt:
      'Pandas pipeline: load, clean, transform, aggregate, export. Clear column contracts and minimal chained magic.',
    settings: { targetEnvironment: 'Pandas', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_numpy',
    name: 'NumPy Computation',
    category: 'backend',
    positivePrompt:
      'NumPy-based numerical code with explicit shapes/dtypes and vectorized operations over Python loops.',
    settings: { targetEnvironment: 'NumPy', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_opencv',
    name: 'OpenCV Image Script',
    category: 'backend',
    positivePrompt:
      'OpenCV (cv2) script for load/process/save images. Clear parameters and BGR/RGB awareness.',
    settings: { targetEnvironment: 'OpenCV Python', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_pillow',
    name: 'Pillow Image Tool',
    category: 'backend',
    positivePrompt:
      'Pillow-based image utility: resize, crop, composite, export. Pathlib I/O and CLI args.',
    settings: { targetEnvironment: 'Pillow', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_selenium',
    name: 'Selenium / Browser Automation',
    category: 'backend',
    positivePrompt:
      'Selenium or Playwright-style automation script with waits, selectors, and cleanup. Prefer Playwright if modern browser automation is implied.',
    settings: { targetEnvironment: 'Browser automation', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_playwright',
    name: 'Playwright Automation',
    category: 'backend',
    positivePrompt:
      'Playwright Python scripts: navigation, locators, screenshots, and robust waits. Async or sync API consistently.',
    settings: { targetEnvironment: 'Playwright Python', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_logging',
    name: 'Python Logging Config',
    category: 'backend',
    positivePrompt:
      'logging module setup with formatters, handlers, and logger hierarchy. JSON optional.',
    settings: { targetEnvironment: 'Python logging', typescriptStrict: false, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_argparse',
    name: 'Python argparse CLI',
    category: 'backend',
    positivePrompt:
      'argparse CLI with subcommands, help text, and typed conversion of args into a Namespace or dataclass.',
    settings: { targetEnvironment: 'Python argparse', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_click',
    name: 'Python Click CLI',
    category: 'backend',
    positivePrompt:
      'Click-based CLI with groups, options, and exit codes. Prefer type hints on commands.',
    settings: { targetEnvironment: 'Python Click', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_typer',
    name: 'Python Typer CLI',
    category: 'backend',
    positivePrompt:
      'Typer CLI with annotated parameters and automatic help. Clean function-per-command structure.',
    settings: { targetEnvironment: 'Python Typer', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_fastapi_fullstack',
    name: 'FastAPI + Frontend Contract',
    category: 'fullstack',
    positivePrompt:
      'FastAPI backend with Pydantic models and a matching TypeScript/React client type contract or OpenAPI-driven shapes.',
    settings: { targetEnvironment: 'FastAPI + TS client types', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0, optimizationPasses: 2 },
  },
  {
    id: 'python_ml_sklearn',
    name: 'scikit-learn Pipeline',
    category: 'backend',
    positivePrompt:
      'scikit-learn pipeline: preprocessing, model, metrics, and train/eval split. Save/load with joblib notes.',
    settings: { targetEnvironment: 'scikit-learn', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_socket',
    name: 'Python Socket Server',
    category: 'backend',
    positivePrompt:
      'socket or asyncio server/client with a simple framing protocol and clean shutdown.',
    settings: { targetEnvironment: 'Python sockets', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_multiprocessing',
    name: 'Python Multiprocessing',
    category: 'backend',
    positivePrompt:
      'multiprocessing Pool/Process patterns for CPU-bound work with queue communication and safe termination.',
    settings: { targetEnvironment: 'Python multiprocessing', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_regex',
    name: 'Python Regex Tools',
    category: 'general',
    positivePrompt:
      'Python regex utilities with verbose flags, named groups, and unit tests for edge cases.',
    settings: { targetEnvironment: 'Python re', typescriptStrict: false, maxOutputTokens: 2048 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_uv',
    name: 'Python uv Project',
    category: 'backend',
    positivePrompt:
      'Python project managed with uv: pyproject.toml, dependency pins, and a clear src layout. Target the selected CPython version.',
    settings: { targetEnvironment: 'Python uv', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_poetry',
    name: 'Poetry Project',
    category: 'backend',
    positivePrompt:
      'Poetry-managed Python project with pyproject.toml, dependency groups, and package layout.',
    settings: { targetEnvironment: 'Poetry', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_django_app',
    name: 'Django App',
    category: 'backend',
    positivePrompt:
      'Django app with models, views, urls, and templates or DRF as requested. Settings via env. Selected Python version.',
    settings: { targetEnvironment: 'Django', typescriptStrict: false, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_tornado',
    name: 'Tornado Server',
    category: 'backend',
    positivePrompt:
      'Tornado web/async handlers with clear RequestHandler subclasses and JSON endpoints.',
    settings: { targetEnvironment: 'Tornado', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_rq',
    name: 'RQ Job Queue',
    category: 'backend',
    positivePrompt:
      'Redis Queue (RQ) workers and job definitions with retries and failure handling notes.',
    settings: { targetEnvironment: 'RQ + Redis', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_matplotlib',
    name: 'Matplotlib Charts',
    category: 'backend',
    positivePrompt:
      'Matplotlib charts saved to file or buffer: clear labels, legends, and reproducible style.',
    settings: { targetEnvironment: 'Matplotlib', typescriptStrict: false, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'python_fastapi_auth',
    name: 'FastAPI JWT Auth',
    category: 'backend',
    positivePrompt:
      'FastAPI JWT auth: password hashing, token issue/verify, dependency guards. Secrets from env only.',
    settings: { targetEnvironment: 'FastAPI JWT', typescriptStrict: false, securityScanLevel: 'Extreme Critical', maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_graphql_yoga',
    name: 'GraphQL Yoga (Node)',
    category: 'backend',
    positivePrompt:
      'GraphQL Yoga server on Node.js with TypeScript schema/resolvers and example queries.',
    settings: { targetEnvironment: 'GraphQL Yoga', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_prisma_api',
    name: 'Node + Prisma API',
    category: 'backend',
    positivePrompt:
      'Express/Fastify + Prisma client CRUD API with TypeScript and schema.prisma.',
    settings: { targetEnvironment: 'Node + Prisma', typescriptStrict: true, maxOutputTokens: 4096 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_puppeteer',
    name: 'Puppeteer Script',
    category: 'backend',
    positivePrompt:
      'Puppeteer automation in Node.js TypeScript: navigation, selectors, screenshots, cleanup.',
    settings: { targetEnvironment: 'Puppeteer', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_sharp',
    name: 'Sharp Image Pipeline',
    category: 'backend',
    positivePrompt:
      'Image pipeline with sharp: resize, format convert, batch folder processing. Node.js + TypeScript.',
    settings: { targetEnvironment: 'Node sharp', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'nodejs_ffmpeg',
    name: 'Node FFmpeg Wrapper',
    category: 'backend',
    positivePrompt:
      'fluent-ffmpeg or child_process FFmpeg wrapper for common convert/trim tasks. Validate paths.',
    settings: { targetEnvironment: 'Node FFmpeg', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'bun_app',
    name: 'Bun App',
    category: 'backend',
    positivePrompt:
      'Bun runtime app or HTTP server with TypeScript. Prefer Bun APIs where they simplify the task.',
    settings: { targetEnvironment: 'Bun', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
  {
    id: 'deno_app',
    name: 'Deno App',
    category: 'backend',
    positivePrompt:
      'Deno TypeScript module or HTTP server using Deno std library and permission flags documented in comments.',
    settings: { targetEnvironment: 'Deno', typescriptStrict: true, maxOutputTokens: 3072 },
    advanced: { temperature: 0.0 },
  },
];

export interface ResolvedCodeConfig {
  profileId: string | null;
  profileName: string;
  positivePrompt: string;
  settings: CodeSettings;
  advanced: CodeAdvanced;
  usedFallback: boolean;
  prompt: string;
}

const SHORTCODE_RE = /\[id:\s*['"]([a-zA-Z0-9_-]+)['"]\s*\]/gi;

export function extractCodeShortcode(text: string): { id: string | null; remainder: string } {
  const raw = String(text || '');
  let found: string | null = null;
  const remainder = raw
    .replace(SHORTCODE_RE, (_, id: string) => {
      if (!found) found = id;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { id: found, remainder };
}

/**
 * Merge a named profile (or shortcode in free text) over GLOBAL_CODE_DEFAULTS.
 * Unknown ids → full safe defaults, usedFallback=true.
 */
export function resolveCodeProfile(
  input:
    | string
    | { id?: string; prompt?: string; pythonVersion?: PythonVersion }
    | null
    | undefined
): ResolvedCodeConfig {
  let id: string | null = null;
  let prompt = '';
  let pythonVersionOverride: PythonVersion | undefined;

  if (typeof input === 'string') {
    const parsed = extractCodeShortcode(input);
    id = parsed.id;
    prompt = parsed.remainder || (parsed.id ? '' : input.trim());
  } else if (input && typeof input === 'object') {
    id = input.id ? String(input.id) : null;
    pythonVersionOverride = input.pythonVersion;
    if (input.prompt) {
      const parsed = extractCodeShortcode(input.prompt);
      if (!id) id = parsed.id;
      prompt = parsed.remainder || (parsed.id ? '' : String(input.prompt).trim());
    }
  }

  const profile = id
    ? GINA_CODE_PROFILES.find((p) => p.id.toLowerCase() === id!.toLowerCase())
    : undefined;

  const usedFallback = Boolean(id) && !profile;

  const settings: CodeSettings = {
    ...GLOBAL_CODE_DEFAULTS.settings,
    ...(profile?.settings || {}),
    ...(pythonVersionOverride ? { pythonVersion: pythonVersionOverride } : {}),
  };

  const isPythonish =
    /python|fastapi|flask|django|pytest|pandas|numpy|opencv|pillow|celery|pydantic|sqlalchemy|starlette|sklearn|playwright|selenium/i.test(
      `${profile?.id || ''} ${settings.targetEnvironment || ''}`
    );

  let positivePrompt = profile?.positivePrompt ?? '';
  if (isPythonish && settings.pythonVersion) {
    positivePrompt = `${positivePrompt} Target CPython ${settings.pythonVersion}; use only features available in that version.`.trim();
  }

  return {
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Standard Code Generation',
    positivePrompt,
    settings,
    advanced: {
      ...GLOBAL_CODE_DEFAULTS.advanced,
      ...(profile?.advanced || {}),
    },
    usedFallback,
    prompt,
  };
}

/** Filter profiles by free-text search (id, name, category, environment). */
export function filterCodeProfiles(query: string): CodeProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_CODE_PROFILES;
  return GINA_CODE_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.settings?.targetEnvironment || ''} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

export const GINA_CODE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'frontend', label: 'Frontend / Web' },
  { id: 'backend', label: 'Backend / API' },
  { id: 'fullstack', label: 'Full-Stack' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'testing', label: 'Testing' },
  { id: 'devops', label: 'DevOps' },
  { id: 'general', label: 'General' },
];

/** All web-related code profiles extracted for Web App Studio */
export const GINA_WEB_APP_CODE_PROFILES: CodeProfile[] = GINA_CODE_PROFILES.filter((p) =>
  p.category === 'frontend' ||
  p.category === 'fullstack' ||
  /web|html|react|vue|next|svelte|tailwind|css|vite|landing|dom|spa|browser|ui|frontend|dashboard|node|express|api|fastapi|flask|websocket|rest|server|http|graphql|wasm/i.test(
    `${p.id} ${p.name} ${p.category} ${p.settings?.targetEnvironment || ''} ${p.positivePrompt}`
  )
);

/** Filter web-app specific code profiles */
export function filterWebAppCodeProfiles(query: string): CodeProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return GINA_WEB_APP_CODE_PROFILES;
  return GINA_WEB_APP_CODE_PROFILES.filter((p) => {
    const hay = `${p.id} ${p.name} ${p.category} ${p.settings?.targetEnvironment || ''} ${p.positivePrompt}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}
