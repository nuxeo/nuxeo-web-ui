## Nuxeo Web UI

Nuxeo Web UI is the standard web application for the [Nuxeo Platform](https://www.hyland.com/en/products/nuxeo-platform), built with [Polymer 3](https://polymer-library.polymer-project.org/) and leveraging [nuxeo-elements](https://github.com/nuxeo/nuxeo-elements), our library of custom web components.

### Prerequisites

- **Node.js** ≥ 22 (see `engines` in `package.json`)
- **npm** (bundled with Node)

### Quick Start

```sh
# Install dependencies
npm install

# Create local environment config
cp .env.sample .env

# Start the dev server (http://localhost:5000, proxies API to localhost:8080)
npm start
```

A running Nuxeo Server is expected at `http://localhost:8080`. To configure CORS, add to `nuxeo.conf`:

```
nuxeo.cors.urls=*
```

### Environment Variables

| Variable | Used by | Description | Default |
|---|---|---|---|
| `NUXEO_PACKAGES` | Webpack, Docker | Addon packages whose bundles are loaded at runtime | empty (no addon bundles loaded; resources are still copied) |
| `NUXEO_URL` | Webpack | URL to connect to Nuxeo server | `/nuxeo` |
| `NUXEO_HOST` | Webpack | Nuxeo host address for dev server proxy | `localhost:8080` |
| `NUXEO_WEB_UI_VERSION` | Docker Compose | Version of Web UI image to build/start | |
| `NUXEO_VERSION` | Docker Compose | Version of Nuxeo server to launch | |

### Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start dev server | `npm start` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Unit tests | `npm test` |
| Functional tests | `npm run ftest` |
| Production build | `npm run build` |
| Bundle analysis | `npm run build:analyze` |
| Maven marketplace | `mvn clean install` |
| Maven + ftests | `mvn clean install -Pftest` |

### Docker Compose

```sh
docker-compose up --build
```

This starts an Nginx proxy, Nuxeo Server, and Web UI. The application will be available at http://localhost:8080/.

### CI

CI is built on [GitHub Actions](https://github.com/features/actions) with workflows for linting, testing, accessibility checks, functional tests, SonarCloud quality scan, and building the marketplace package. PRs tagged `preview` get ephemeral preview environments with cross-repo support for [nuxeo-elements](https://github.com/nuxeo/nuxeo-elements).

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, testing, and development workflow details.

## License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

© Hyland Software, Inc. and its affiliates. All rights reserved.
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

All images, icons, fonts, and videos contained in this folder are copyrighted by Hyland Software, all rights reserved.

## About Hyland

[Hyland](https://www.hyland.com) is a leading content services provider that enables thousands of organizations to deliver better experiences to the people they serve. Learn more at [hyland.com](https://www.hyland.com).
