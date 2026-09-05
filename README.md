# Skill Saga

A private, mobile-first story adventure for young heroes. A guardian unlocks the
household, creates child profiles, assigns each child a repository-backed saga,
and lets them solve playful challenges while their progress and rewards persist.

Built with Next.js 16, React 19, Tailwind CSS 4, Supabase, Zod, and Vitest.

## Local setup

Requirements: Node.js 22 or newer, npm, and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in every value. Use a long,
   unique guardian password and generate `SESSION_SECRET` with at least 32
   random characters.

3. Apply the database migration:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Add weekly content

Create a saga once, then add numbered levels to it:

```bash
npm run saga:new -- --id saga-3 --title "The Moon-Mail Mystery" \
  --summary "Deliver a mysterious parcel among the stars." \
  --audience-note "Ages 6-8" --cover-image "moon"
npm run level:new -- --saga saga-3 --id moon-mail-arrival \
  --title "The First Parcel" --date 2026-09-14
npm run sagas:validate
```

See [`docs/saga-authoring.md`](docs/saga-authoring.md) for the JSON structure,
task types, personalization placeholders, and authoring rules.

## Checks

```bash
npm run sagas:validate
npm test
npm run typecheck
npm run lint
npm run build
```
