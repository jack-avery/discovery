# Capstone Project

## Usage

### Dependencies

This project uses the following tools:
- [Docker](https://www.docker.com) w/ docker-compose-v2
- [Just](https://github.com/casey/just)

If you're on Windows, you will first need to install **WSL**. You can follow Microsoft's installation instructions [here](https://learn.microsoft.com/en-us/windows/wsl/install). The default distribution of **Ubuntu** is probably fine, and these installation instructions will be geared towards it.

If you're on MacOS, Docker is available from their website, Just is available through MacPorts, and Ansible is available through Python3's `pipx`. (Note from Jack: I don't have a Mac so I cannot get more detailed installation steps)

To install these requirements on Ubuntu:
- Open a Terminal window.
- Update local cache: `sudo apt-get update`
- Download dependencies: `sudo apt-get install -y docker.io docker-compose-v2 just`

Users of other distributions: it is expected you know what you are doing.

Your environment should now be ready to go.

### Running

The ideal end-goal of this project is such so that users can simply:

1. Clone the repository: `git clone https://github.com/jack-avery/discovery`
2. Set environment variables in the `docker-compose.yml` file
3. Run the application with `docker compose up -d`

## Development

### Running

First, install the dependencies. See the **Dependencies** section.

The project provides a **Justfile** for easy administration.

1. Initialize the database: `just initdb`
2. Build the front-end (if it is not already built): `just front`
3. Compose up the application: `just up`

The application, when ran using the default environment (`local`), should be available at http://localhost:80.

> The Justfile is purely for local development; Ansible will handle remote deployment.

There are a few different general good-practice things to follow to make development easy:

1. **Do not perform your development on the `main` branch.** This prevents merge conflicts when multiple people attempt to push different histories.
2. **Commit more**. Smaller commits make it easier to `git bisect` exactly *which change* introduced an issue.
3. **Not mandatory, but following [Conventional Commit Messages](https://www.conventionalcommits.org/en/v1.0.0/) can make things easier to track**
