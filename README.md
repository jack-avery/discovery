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

1. Clone the repository: `git clone https://github.com/jack-avery/discovery`
2. Set environment variables in the `docker-compose.yml` file
3. Copy the sample Caddyfile to `conf/caddy/Caddyfile` and configure the Caddy domain. For local development, `localhost` will work.
5. Create the initial database with `make initdb`
6. Copy `front/.env.sample` to `front/.env` and fill out appropriate variables.
7. Copy `.env.sample` to `.env` and fill out appropriate variables.
8. Build necessary application resources with `make build`
9. Run the application with `make up`

Remember to run `make build reup` after every change in order for changes to reflect.

> TODO: The above workflow needs some work. See https://github.com/jack-avery/discovery/issues/35.
