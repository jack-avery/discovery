# Capstone Project

## Usage

This project uses [Docker](https://www.docker.com) w/ docker-compose-v2 and a Makefile for easy administration.

If you're on Windows, you will first need to install **WSL**. You can follow Microsoft's installation instructions [here](https://learn.microsoft.com/en-us/windows/wsl/install). The default distribution of **Ubuntu** is probably fine, and these installation instructions will be geared towards it.

To install these requirements on Ubuntu Linux:
- Open a Terminal window.
- Update local cache: `sudo apt-get update`
- Download dependencies: `sudo apt-get install -y docker.io docker-compose-v2 make`

Users of other Linux distributions: it is expected you know what you are doing.

### Running
1. Clone the repository
2. Copy `conf/caddy/Caddyfile.sample` to `conf/caddy/Caddyfile` (`localhost` is fine locally)
3. Copy `.env.sample` to `.env` and set secrets / `DB_PASSWORD`
4. Copy `front/.env.sample` to `front/.env`
5. `make initdb` - fresh volume, migrate, seed **dev** users (local only)
6. `make build`
7. `make up`

After code changes: `make build reup`.
After a new migration is merged: `make upgrade` (or just `make up`; the backend entrypoint runs `db upgrade`).
Never run `make initdb` on a database you care about.

Remember to run `make build reup` after every change in order for changes to reflect.

> TODO: The above workflow needs some work. See https://github.com/jack-avery/discovery/issues/35.
