# Loonar

## For Developers

### Installing Moon

We use [Moon](https://moonrepo.dev/) as the monorepo package for managing this repository.

For Linux/Mac you can install Moon with the following:

```bash
curl -fsSL https://moonrepo.dev/install/moon.sh | bash
```
After Moon is installed, you'll need to add Moon to your path. Copy and paste the following in your command line or add it to your profile:

```bash
export PATH="$HOME/.moon/bin:$PATH"
```

Please see [here](https://moonrepo.dev/docs/install) to view more options for installing Moon.

The basics usage of moon in our mono repo is to have central commands which run specific functions within each repository. The standard utility is `moon run <project-name>:<task-name>` or `moon <project-name>:<task-name>`. When we have multiple projects with the same task names, we can run each matching task by using `moon :<task-name>`. This allows us to run the server and client simultaneously with one command, allows us to install all necessary packages in all repository in one command, and allows us to have a central place for designing such tasks. You can find the various tasks for each repository in the `apss/<project>/moon.yml` file. Additionally, the `.moon/workspace.yml` file also indicates the project name for each application. For instance, the `apps/client` repository has the project name `client` while the `apps/docs-website` repository has the project name `docs`.

### Installing Repository Dependencies

#### Requirements

The following are required for each repository to work effectively:

```
Node>=20.11.1
Python>=3.11.6
```

Once moon is set up, you can install all necessary packages for each of the repositories by calling this function:

```bash
moon :install
```

Note: If you run the install function, this will set up a Python virtual environment for your server. If you accidentally end up running the install function without upgrading Python, you may run into issues even after you upgrade Python because the virtual environment will be on the old version. To alleviate this, please remove the `apps/server/.venv` directory, then run the install function again.

### Running the Application

To run the client and server simultaneously, you can do the following:

```
moon :run
```

This will run both the client and server. This sill not automatically start the documentation website. To run the documentation website, we can do this:

```
moon :run-docs
```

To build the server and client, we run `moon :build`. Similarly, `moon :build-docs` will build the documentation website.
