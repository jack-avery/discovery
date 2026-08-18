# Discovery

Local resource mapping platform.

## Running

Docker Compose runs three services:

- `front` - Caddy (static UI + reverse proxy to the API)
- `back` - Flask API
- `db` - MySQL 8

- [Docker Desktop](https://www.docker.com) (Windows/macOS) or Docker Engine + Compose v2 (Linux)
- On Linux you can also install `make` and use the Makefile targets below

Windows does **not** require WSL or `make`. Use the Docker Compose commands.

1. Clone the repository and `cd` into it.

2. Copy the sample config files:

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

3. Fill out **root** `.env` and replace every placeholder:

   - `SECRET_KEY`, `JWT_SECRET_KEY`
   - `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters)
   - `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`
   - `CORS_ORIGINS=http://localhost,https://localhost`

   Fill out `front/.env` from the example.

   Modify `conf/caddy/Caddyfile`, replacing `localhost` with your domain.

   > A development build `Caddyfile` can stay `localhost` with `tls internal`.

5. If you edited `back/entrypoint.sh` on Windows, convert line endings once:

   ```powershell
   docker run --rm -v "${PWD}/back:/work" alpine dos2unix /work/entrypoint.sh
   ```

6. Build and start the application.

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

7. If `back` exits or `https://localhost/api/v1/health` returns 502, MySQL is still finishing first-time init. Retry:

   ```powershell
   docker compose up -d back
   ```

   Wait ~15 seconds and check again.

8. Verify:

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

## Updating

1. Pull the latest changes: `git pull`
2. Perform step 6 of **Running** again.
