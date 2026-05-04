# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Reminder & Task Manager (artifacts/reminder-app)

Expo mobile app (light theme). Single-file `app/index.tsx` home screen with no
tabs (Chat/Calls/Files/More were removed).

- **Run from project root**: `npm install` then `npm run dev` (mapped to
  `pnpm --filter @workspace/reminder-app run dev`).
- **Multi-user**: 4 dummy accounts in `context/AuthContext.tsx`
  (alice/alice123, bob/bob123, carol/carol123, david/david123). Each user gets
  private tasks (`reminder.tasks.v2.<userId>`), private settings, and seeded
  starter tasks. Session is persisted in AsyncStorage; `_layout.tsx` redirects
  to `/login` when no user is signed in.
- **Settings page** (`app/settings.tsx`): selectable alarm tones with audio
  preview (uses bundled WAVs in `assets/sounds/` via `expo-audio`), profile
  card, and Sign out button.
- **Time picker**: `components/SimpleTimePicker.tsx` — typeable HH/MM inputs
  with up/down bumpers and AM/PM toggle (replaces the old wheel picker).
- **Task details modal** shows the chosen alarm tone and the snoozed-until
  timestamp; the +5/+10/+15 snooze buttons schedule a notification AND save
  `snoozedUntil` on the task.
- **Notifications**: scheduled with `sound: "default"` (custom tones require a
  dev build, not Expo Go); tone preview uses `expo-audio` with bundled assets.
- **Home header** has a calendar (jump to today), settings gear, and a
  user-avatar shortcut to settings.
