# Roster

## Dev Environment Setup

### Prerequisites

- Node
- Docker/Docker Desktop
- https://nodejs.org/en/download
  - **note:** node will include npm (node package manager) which we'll use to install `yarn` in the next step
- Node Version Manager - nvm/fnm/asdf
- Yarn
  - Run `npm i -g yarn`
- Twilio CLI
  - `brew tap twilio/brew && brew install twilio`

### Bootstrapping

- Clone the repo
- Run `yarn` to install dependencies
- Ensure Docker is running
- Start Supabase with `npx supabase start`
- Copy `.env.local.example` to `.env.local` file (if one doesn't exist already) in the root directory of the app
- Ask #eng-team on slack for the current required variables
- Add them to `.env.local` and save your changes
- Copy the Supabase anon key and service role key from the supabase start/status command

## Local Development Workflow

- Make sure you don't have any uncommitted changes in your current branch 
- Check out `develop` branch
- Run `git pull` to get the latest changes
- Check out your new feature branch `git checkout -b <your-branch-name>`
- Run `yarn install` to install the dependencies (in case anything changed)
- Make sure your local supabase is running. (Started with `npx supabase start`)
  - Ensure Docker is running
- Apply the latest migrations locally with `yarn run migrate-local`
- Start/restart the dev processes with:
  - Next: `yarn dev`
  - Inngest: `yarn dev-inngest`
  - Twilio: `yarn dev-twilio`
- Open up Mailpit (to catch emails from the app) at: http://127.0.0.1:54324

The `dev-all` command will concurrently run:

- Next.js development server
- Inngest development server
- Will create a ngrok tunnel and setup a Twilio webhook for the tunnel

### Local Development URLs

- [Next.js App — localhost:3030](http://localhost:3030)
- [Inngest Dashboard — localhost:8288](http://127.0.0.1:8288)
- [Inbucket (Email Trap/Interceptor) - localhost:54324](http://127.0.0.1:54324/)

## Creating Migrations

### Creating a migration with SQL (Recommended)


Step 1: Make sure your local database is up to date (having applied the existing migrations already).
`yarn run migrate-local`

Step 2: Create a new migration file.

```bash
supabase migration new name_of_change_goes_here
```

Step 3: Add SQL to the migration file.

...

Step 4: Attempt to apply locally

```bash
yarn run migrate-local
```

Step 5: Regenerate TypeScript types for the updated database schema.

```bash
yarn run generate-supabase-types
```

### Creating a migration using diff

(Might be risky. Might not generate a correct or full SQL migration.)

Step 1: Make sure your local database is up to date (having applied the existing migrations already).
`yarn run migrate-local`

Step 2: Make a change in the table editor in your local supabase.

Step 3: Generate a migration using a diff

```bash
yarn generate-migration YOUR_MIGRATION_NAME_HERE
```

Step 4: Mark your local migrations as up to date

```bash
supabase migration repair --local --status applied
```

:warning: DO NOT FORGET the `--local` flag.

Step 5: Regenerate TypeScript types for the updated database schema.

```bash
yarn run generate-supabase-types
```

## Apply Migrations to Staging

After merging a PR from the `develop` branch to the `staging` branch...

Step 1: Make sure you are on the `staging` branch.

Step 2: Do a dry run of the migrations

```bash
yarn run migrate-staging-dry
```

Step 3: Run Migrations

```bash
yarn run migrate-staging
```

## Apply Migrations to Production

***Before*** merging a PR from the `staging` branch to the `main` branch...

Step 1: Make sure you are on the `staging` branch.

Step 2: Do a dry run of the migrations

```bash
yarn run migrate-production-dry
```

Step 3: Run Migrations

```bash
yarn run migrate-production
```

## Deploying migrations to staging

1. Merge your PR from develop into staging
2. Check out the staging branch locally
3. Run migrations with `yarn run migrate-staging`

## Troubleshooting Migrations

Potential scenarios
* Made local database changes, merged changes into staging without running local migrations/marking applied, ran migrations on staging after merge.

General things to consider
* Are we using the right command and connection?
* Is supabase running locally?
* Is there a mismatch with the versions of supabase CLI running (which can also affect the local environment started)?

### General things to debug

#### Check the status of migrations locally

```bash
./node_modules/.bin/supabase migration list --local
```

Should show an output like...

```
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20240210212014 │ 20240210212014 │ 2024-02-10 21:20:14
    20240210214114 │ 20240210214114 │ 2024-02-10 21:41:14
    20240210215447 │ 20240210215447 │ 2024-02-10 21:54:47
    20240210232940 │ 20240210232940 │ 2024-02-10 23:29:40
    20240212143746 │ 20240212143746 │ 2024-02-12 14:37:46
...
```

#### Check the migrations list in supabase dashboard for local, staging, and production

https://supabase.com/dashboard/project/olpxfmziygcupcyiubjm/database/migrations

### "Remote migration versions not found in local migrations directory"

Example:

```
$ yarn run migrate-local
yarn run v1.22.22
$ supabase migration up --local
WARN: no SMS provider is enabled. Disabling phone login
Connecting to local database...
Remote migration versions not found in local migrations directory.

Make sure your local git repo is up-to-date. If the error persists, try repairing the migration history table:
supabase migration repair --status reverted 20250508104527

And update local migrations to match remote database:
supabase db pull

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

Solution (in one case):
You might need to pull the latest down for the branch you are on.


## Additional Reference

- [Next.js](https://nextjs.org/): React framework for building the application
- [React](https://reactjs.org/): UI library
- [TypeScript](https://www.typescriptlang.org/): Typed JavaScript
- [Tailwind CSS](https://tailwindcss.com/): Utility-first CSS framework
- [Supabase](https://supabase.io/): Backend as a Service for database and authentication
- [Inngest](https://www.inngest.com/): Function orchestration platform
- [Twilio](https://www.twilio.com/): Communication APIs
- [Sentry](https://sentry.io/): Error tracking and performance monitoring
- [Formik](https://formik.org/): Form management library
- [React Query](https://react-query.tanstack.com/): Data fetching library
- [Uppy](https://uppy.io/): File uploader
- [OpenWeather](https://openweathermap.org/): Weather forecast APIs
