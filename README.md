# Capstone Project

RRCRC community asset mapping platform. Docker Compose runs three services:

- `front` - Caddy (static UI + reverse proxy to the API)
- `back` - Flask API
- `db` - MySQL 8

Schema comes from Flask-Migrate (`flask db upgrade`). `schema.sql` has been deleted.
The MySQL user comes from `.env`. Roles and the first admin come from Flask CLI.

## Prerequisites

- [Docker Desktop](https://www.docker.com) (Windows/macOS) or Docker Engine + Compose v2 (Linux)
- On Linux you can also install `make` and use the Makefile targets below

Windows does **not** require WSL or `make`. Use the Docker Compose commands.

## First-time setup

1. Clone the repository and `cd` into it.

2. Create local config files (these are gitignored):

   ```powershell
   copy .env.sample .env
   copy front\.env.example front\.env
   copy conf\caddy\Caddyfile.sample conf\caddy\Caddyfile
   ```

   Linux/macOS:

   ```bash
   cp .env.sample .env
   cp front/.env.example front/.env
   cp conf/caddy/Caddyfile.sample conf/caddy/Caddyfile
   ```

3. Edit **root** `.env` and replace every placeholder:

   - `SECRET_KEY`, `JWT_SECRET_KEY`
   - `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters)
   - `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`
   - `CORS_ORIGINS=http://localhost,https://localhost`

   Edit `front/.env` from the example (MapTiler / frontend keys).

   Local `Caddyfile` can stay `localhost` with `tls internal`.

4. If you edited `back/entrypoint.sh` on Windows, convert line endings once:

   ```powershell
   docker run --rm -v "${PWD}/back:/work" alpine dos2unix /work/entrypoint.sh
   ```

5. Build the frontend, then start the stack.

   **Windows (no Make):**

   ```powershell
   cd front
   docker run -it --rm -u1000 -v "${PWD}:/app" node:24-alpine sh -c "cd /app && npm i && npm run build"
   cd ..
   docker compose build
   docker compose up -d
   ```

   **Linux / WSL (Make):**

   ```bash
   make build
   make up
   ```

   On first boot the backend entrypoint runs `flask db upgrade`, `seed-roles`, and `seed-admin`.
   You do **not** need `make initdb` for a normal deploy.

6. If `back` exits or `https://localhost/api/v1/health` returns 502, MySQL is still finishing first-time init. Retry:

   ```powershell
   docker compose up -d back
   ```

   Wait ~15 seconds and check again.

7. Verify:

   Windows:

   ```powershell
   docker compose ps -a
   curl.exe -k -i https://localhost/api/v1/health
   curl.exe -k -i https://localhost/api/v1/health/db
   ```

   Linux/macOS:

   ```bash
   docker compose ps -a
   curl -k -i https://localhost/api/v1/health
   curl -k -i https://localhost/api/v1/health/db
   ```

   Open **https://localhost** (Caddy redirects HTTP → HTTPS). Accept the local certificate warning. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Day-to-day (keep existing data)

```powershell
git pull
cd front
docker run -it --rm -u1000 -v "${PWD}:/app" node:24-alpine sh -c "cd /app && npm i && npm run build"
cd ..
docker compose build
docker compose up -d
```

Or with Make: `make build reup`.

The entrypoint applies any new migrations on start. **Never** run `docker compose down -v` or `make initdb` on a database you care about or want to keep. Those delete the MySQL volume and not intended unless you know it is needed.

| Goal | Command |
| --- | --- |
| Start | `docker compose up -d` |
| Stop (keep data) | `docker compose down` |
| Rebuild backend only | `docker compose build back` then `up -d` |
| Extra demo users (`*@rrcrc.dev`) | `docker compose run --rm --entrypoint flask back --app run.py seed-dev` |
| Wipe DB and start over | `docker compose down -v` then `up -d` |

## Makefile (Linux / WSL)

| Target | What it does |
| --- | --- |
| `make build` | Frontend production build + `docker compose build` |
| `make up` / `make down` / `make reup` | Start / stop / restart (does **not** delete volumes) |
| `make upgrade` | `flask db upgrade` |
| `make seed` | `flask seed-dev` (demo accounts only) |
| `make initdb` | Deletes volumes, migrates, seeds admin - **local reset only** |

## What is created automatically

- MySQL database + user: `DB_NAME`, `DB_USER`, `DB_PASSWORD` in Compose
- Tables: Alembic revision via `flask db upgrade`
- Roles: `flask seed-roles`
- First administrator: `ADMIN_*` via `flask seed-admin` (skipped if that email already exists)

Do not commit `.env`, `front/.env`, or `conf/caddy/Caddyfile`.