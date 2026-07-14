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

The ideal end-goal of this project is such so that users can simply:

1. Clone the repository: `git clone https://github.com/jack-avery/discovery`
2. Set environment variables in the `docker-compose.yml` file
3. Copy the sample Caddyfile to `conf/caddy/Caddyfile` and configure Caddy
4. Create the initial database with `make initdb`
5. Run the application with `make up`

## Development

The back-end is MariaDB with Flask, the front-end is a Vite web application.

For quick-start, copy the sample Caddyfile into the same directory and replace `example.com` with `localhost`.

After running the above steps in "Running", the application should be available at `localhost` in your browser.
