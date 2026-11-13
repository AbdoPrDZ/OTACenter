<h1 align="center">OTACenter</h1>

<p align="center">
  <b>Self-hosted app distribution and over-the-air updates for React Native and Expo apps.</b>
</p>

<p align="center">
  <a href="#setup">Setup</a> •
  <a href="#your-first-release">First release</a> •
  <a href="#connect-your-apps">Connect apps</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#docker-reference">Docker</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## What it does

- **Publish apps and versions** — upload APKs, changelogs and screenshots; users install them from a
  public or private app store, or through download links and QR codes.
- **Over-the-air updates** — ship new JavaScript bundles without a store release, to bare React Native
  apps ([`react-ota-client`](https://github.com/AbdoPrDZ/react-ota-client), Android) and Expo apps
  ([`expo-ota-client`](https://github.com/AbdoPrDZ/expo-ota-client), Android and iOS). Updates can be
  optional or forced.
- **Demo releases** — send a version or bundle to testers first, then promote it to everyone.
- **Access control** — users come from your LDAP directory (or local accounts); **domains** decide who
  sees which app; roles and permissions decide who can manage what.
- **Statistics and activity** — downloads, installs and update events per app, version, user and device.

Full documentation is served by the app itself at **`/docs`**.

---

## Setup

Choose one: [run it directly](#run-it-directly) on a machine with PHP and Node, or
[run it with Docker](#run-it-with-docker) — the fastest way is the
[single compose file](#quick-start-one-compose-file).

### Run it directly

**Requirements:** PHP 8.3+ (extensions `ldap`, `zip`, `fileinfo`), Composer 2, Node.js 20+ with npm.
An LDAP server is optional: the super-admin account works without one.

1. **Get the code**

   ```bash
   git clone https://github.com/AbdoPrDZ/OTACenter.git
   cd OTACenter
   ```

2. **Install** — installs PHP and npm packages, creates `.env`, generates the app key, creates the
   database (SQLite by default) and builds the frontend:

   ```bash
   composer run setup
   ```

3. **Configure `.env`** — at minimum:

   ```dotenv
   APP_URL=http://localhost:8000          # the address users and devices will use
   APP_SUPER_ADMIN_LOGIN=superadmin       # the first administrator
   APP_SUPER_ADMIN_PASSWORD=change-me
   ```

   Add the `LDAP_*` values to let directory users sign in, and a `DB_*` block to use MySQL or PostgreSQL
   instead of SQLite (see [Configuration](#configuration)). After changing the database, run
   `php artisan migrate`.

4. **Create roles, permissions and the super-admin account**

   ```bash
   php artisan db:seed
   ```

5. **Start it**

   ```bash
   composer run dev
   ```

   This starts the web server, the queue worker, the log viewer and the Vite dev server together.

6. **Open it** — `http://localhost:8000` (home), `/dashboard` (sign in with the super-admin login),
   `/store` (app store) and `/docs` (documentation).

> **In production**, don't use `composer run dev`. Build the assets once (`npm run build`), serve
> `public/` with nginx or Apache + PHP-FPM, run `php artisan queue:work`, and set `APP_ENV=production`
> and `APP_DEBUG=false`. The Docker setup below does all of this for you.

### Run it with Docker

**Requirements:** Docker Engine 24+ with Compose v2 (`docker compose version`).

#### Quick start: one compose file

No clone needed: Docker builds the image straight from GitHub. Save this as `docker-compose.yml` in an
empty folder, change the values marked `change-me`, and set `APP_KEY` to the output of
`echo "base64:$(openssl rand -base64 32)"`:

```yaml
name: otacenter

x-app: &app
  image: otacenter:latest
  build: https://github.com/AbdoPrDZ/OTACenter.git#main
  restart: unless-stopped
  volumes:
    - storage:/var/www/html/storage
  environment: &env
    APP_ENV: production
    APP_DEBUG: "false"
    APP_URL: http://localhost:8000          # the address users and devices will use
    APP_KEY: base64:change-me               # keep it: changing it signs everyone out
    APP_SUPER_ADMIN_LOGIN: superadmin
    APP_SUPER_ADMIN_PASSWORD: change-me
    LOG_CHANNEL: stderr
    DB_CONNECTION: pgsql
    DB_HOST: db
    DB_DATABASE: otacenter
    DB_USERNAME: otacenter
    DB_PASSWORD: change-me
    QUEUE_CONNECTION: database

services:
  app:
    <<: *app
    ports:
      - "8000:80"
    depends_on:
      db:
        condition: service_healthy

  queue:
    <<: *app
    environment:
      <<: *env
      RUN_MIGRATIONS: "false"
    command: ["php", "artisan", "queue:work", "--tries=3", "--timeout=300"]
    healthcheck:
      disable: true
    depends_on:
      app:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: otacenter
      POSTGRES_USER: otacenter
      POSTGRES_PASSWORD: change-me          # same as DB_PASSWORD
    volumes:
      - db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U otacenter -d otacenter"]
      interval: 5s
      retries: 12

volumes:
  storage:
  db:
```

Then start it and create the administrator:

```bash
docker compose up -d --build
docker compose exec app php artisan db:seed
```

Open `http://localhost:8000/dashboard` and sign in. Add `LDAP_*` values under `environment` for
directory sign-in.

#### Full setup from the repository

The repository's own `docker-compose.yml` adds a scheduler and reads its settings from an env file:

1. **Get the code**

   ```bash
   git clone https://github.com/AbdoPrDZ/OTACenter.git
   cd OTACenter
   ```

2. **Create the Docker env file** — the stack reads `.env.docker`, not `.env`:

   ```bash
   cp .env.docker.example .env.docker
   ```

3. **Edit `.env.docker`** — at minimum:

   ```dotenv
   APP_URL=http://localhost:8000          # the address users and devices will use
   APP_PORT=8000                          # host port
   APP_SUPER_ADMIN_LOGIN=superadmin
   APP_SUPER_ADMIN_PASSWORD=change-me
   DB_PASSWORD=a-strong-password
   ```

   Add the `LDAP_*` values for directory sign-in. For an LDAP server running on the Docker host, use
   `LDAP_HOST=host.docker.internal`.

4. **Build and start** (the first run takes a few minutes):

   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

   Migrations run automatically when the app container starts.

5. **Create roles, permissions and the super-admin account**

   ```bash
   docker compose --env-file .env.docker exec app php artisan db:seed
   ```

6. **Open it** — `http://localhost:8000`, then `/dashboard` to sign in.

The stack runs the app (nginx + PHP-FPM), PostgreSQL, a queue worker and the scheduler. Uploaded files
and the database live in Docker volumes. See the [Docker reference](#docker-reference) for everyday
commands, updates and troubleshooting.

---

## Your first release

All of this happens in the dashboard (`/dashboard`).

1. **Apps → Add app** — name, **package name** (must equal the app's Android package / iOS bundle id),
   summary and logo.
2. **Open the app → Add version**
   - **Client:** *React Native* (`react-ota-client`) or *Expo* (`expo-ota-client`).
   - **Name:** the version, e.g. `1.0.0`. For Expo it must equal the app's `runtimeVersion`.
   - **API key:** any secret string; the app sends it with every update request.
   - **APK:** the installer (optional for Expo).
3. **Make the version available** — **Activate** it (everyone) or **Demo** it (testers only).
4. **Domains → Add domain**, bind the app and the users who should see it. A domain marked **Public**
   lists its apps on the public store at `/store`.
5. **Ship updates** — upload a bundle on the version (**Add bundle**) and **Activate** it, or publish it
   from the command line (see below). Devices on that version get it on their next check.

To test with a few people first, see [Demo releases](#demo-releases).

---

## Connect your apps

| Your app | Client package | Guide |
| --- | --- | --- |
| Bare React Native (Android) | [`react-ota-client`](https://github.com/AbdoPrDZ/react-ota-client) | `/docs/client-sdk` |
| Expo (Android and iOS) | [`expo-ota-client`](https://github.com/AbdoPrDZ/expo-ota-client) | `/docs/expo-sdk` |

Each app is configured with the server URL and the version's API key. Building and uploading a bundle:

```bash
# bare React Native: build the archive, then upload it in the dashboard (Version → Add bundle)
npx react-ota-client release

# Expo: build, upload and activate in one step
npx expo-ota-client login -u <admin> -P <password>   # prints a token; export it as OTA_TOKEN
npx expo-ota-client publish --activate               # or --demo for testers only
```

### Demo releases

1. **Domains → edit a domain →** turn on **Demo releases**, bind the app, and add the testers as members.
2. **Users → a tester → Demo access → Create link code**, and have the tester enter the code in the app
   (`<OTADemoAccessScreen>` in Expo apps).
3. Publish with **Demo** instead of **Activate** (or `npx expo-ota-client publish --demo`).
4. When it's ready, **Promote to public**. **Withdraw demo** sends testers back to the public release.

---

## Configuration

Set these in `.env` (or `.env.docker` with Docker). After changing them in production, run
`php artisan config:clear` (Docker: recreate the containers, see below).

**Application**

| Key | Notes |
|-----|-------|
| `APP_URL` | The public address of the server. Apps and download links use it. |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` on a live server. |
| `APP_SUPER_ADMIN_LOGIN` / `APP_SUPER_ADMIN_PASSWORD` | The first administrator, created by `db:seed`. |
| `DB_CONNECTION` | `sqlite` (default), `mysql` or `pgsql`, with `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`. |
| `CONTACT_EMAIL` | Optional: where the site's contact form sends messages. |

**LDAP** (optional — sign-in for directory users)

| Key | Example |
|-----|---------|
| `LDAP_HOST` / `LDAP_PORT` | `ldap.corp.local` / `389` |
| `LDAP_BASE_DN` | `dc=corp,dc=local` |
| `LDAP_USERNAME` / `LDAP_PASSWORD` | the bind account |
| `LDAP_LOGIN_SUFFIX` | appended to the typed login, e.g. `@corp.local` |
| `LDAP_TLS` / `LDAP_STARTTLS` | `false` |

Accounts with a local password (such as the super-admin) sign in without LDAP.

**Expo updates** (optional)

| Key | Default | Notes |
|-----|---------|-------|
| `OTA_EXPO_SIGNING_KEY` | — | Path to a private key (from `npx expo-ota-client cert`). When set, updates are signed for apps built with the matching certificate. |
| `OTA_EXPO_SIGNING_KEY_ID` | `main` | Must match the app's `codeSigningKeyId`. |
| `OTA_EXPO_ASSET_URL_TTL` | `1440` | How long update download links stay valid, in minutes. |

The full list is in `/docs/reference/environment`.

---

## Docker reference

```bash
docker compose ps                                    # status and health
docker compose logs -f app                           # application logs
docker compose exec app php artisan <command>        # run an artisan command
docker compose down                                  # stop (data is kept)
```

**Changed `.env.docker`?** Recreate the containers, since production caches its configuration:

```bash
docker compose --env-file .env.docker up -d --force-recreate app queue scheduler
```

**Updating to a new version:**

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

**Data** lives in two volumes: `otacenter-storage` (uploaded APKs, bundles, images, logs) and
`otacenter-db` (PostgreSQL). Back up both together. `docker compose down -v` deletes them.

**Behind a reverse proxy:** the container serves plain HTTP on `APP_PORT`. Terminate TLS in your proxy
(nginx, Caddy, Traefik…) and set `APP_URL` to the public `https://` address.

**Troubleshooting**

| Problem | Fix |
|---------|-----|
| Edits to `.env.docker` have no effect | Always pass `--env-file .env.docker` when starting, then recreate the containers (above). |
| `port is already allocated` | Change `APP_PORT` in `.env.docker`. |
| The app container keeps restarting | Check `docker compose logs app`; usually the database settings or a failed migration. |
| LDAP on the Docker host is unreachable | Use `LDAP_HOST=host.docker.internal` (on Linux also add `extra_hosts: ["host.docker.internal:host-gateway"]`). |
| Large uploads fail with `413` | Raise `client_max_body_size` in `docker/nginx/default.conf` and the upload limits in `docker/php.ini` (512 MB by default), then rebuild. |

More detail (services, boot steps, SQLite or an external database): `/docs/guides/docker`.

---

## Development

```bash
composer run dev       # server, queue, logs and Vite with hot reload
composer test          # PHPUnit feature tests
npm test               # Vitest frontend tests
npm run build          # production assets
```

The backend is Laravel 13 (PHP 8.3+); the frontend is React 19 + TypeScript with Vite and Tailwind CSS
v4. The device API lives in `routes/ota_client.php`, the admin API and pages in `routes/web.php`, the
documentation in `resources/js/apps/docs/content/`. Architecture and contributor notes are under
`/docs/architecture`, `/docs/frontend` and `/docs/guides/contributing`.

---

## License

Copyright (C) 2026 [AbdoPrDZ](https://github.com/AbdoPrDZ)

OTACenter is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
for more details.

[GPL-3.0-or-later](LICENSE) — full text in [`LICENSE`](LICENSE), as declared in `composer.json`.
