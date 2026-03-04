# Capstone Project

## Usage

### Setting up your environment

This project uses the following tools:
- [Docker](https://www.docker.com) w/ docker-compose-v2
- [Just](https://github.com/casey/just)

... and will probably eventually be using [Ansible](https://github.com/ansible/ansible) for deployment

If you're on Windows, you will first need to install **WSL**. You can follow Microsoft's installation instructions [here](https://learn.microsoft.com/en-us/windows/wsl/install). The default distribution of **Ubuntu** is probably fine, and these installation instructions will be geared towards it.

If you're on MacOS, Docker is available from their website, Just is available through MacPorts, and Ansible is available through Python3's `pipx`. (Note from Jack: I don't have a Mac so I cannot get more detailed installation steps)

To install these requirements on Ubuntu:
- Open a Terminal window.
- Update local cache: `sudo apt-get update`
- Download dependencies: `sudo apt-get install -y docker.io docker-compose-v2 ansible just`

Users of other distributions: it is expected you know what you are doing.

Your environment should now be ready to go.

> Ansible doesn't trust WSL mounted `ansible.cfg` files; this is because of the default permission masks that WSL applies. If you plan to run deployments you will probably need to [configure WSL's automount permissions](https://learn.microsoft.com/en-us/windows/wsl/wsl-config).

### Running

The project provides a **Justfile** for easy administration.

1. Initialize the database: `just initdb`
2. Compose up the application: `just up`

The application, when ran using the default environment (`local`), should be available at http://localhost:80.

Pulled database schema changes can be applied by running `just initdb` again.
