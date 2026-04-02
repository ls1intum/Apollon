# Project Structure

Here is a brief overview of the Apollon2 monorepo structure:

```
apollon2/
├── standalone/
│   ├── server/
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   └── webapp/
│       ├── src/
│       ├── package.json
│       └── ...
├── library
│   ├── src/
│   ├── package.json
|   └── ...
│
├── .nvmrc                # Specifies the Node.js version
├── .prettierrc           # Configuration file for formating typescript files
├── commitlint.config.mj  # Checking commit messages in format
└── README.md             # Project documentation
```

## Package Overview

### Library Package

The `library` package contains the core Apollon editor components and utilities that can be used as a standalone library.

### Standalone Server

The `standalone/server` package provides the REST API, WebSocket relay, and diagram persistence (Redis) for the Apollon application.

### Standalone Webapp

The `standalone/webapp` package contains the web application that uses the library package.
