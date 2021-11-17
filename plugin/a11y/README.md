# Nuxeo Web UI - Accessibility

This project runs automated accessibility tests on Nuxeo Web UI.

## Setup

```
npm install
```

## Run tests

To run the tests agains a running Nuxeo server:

```
npm run test
```

The server URL can be paremeterized using the `NUXEO_URL` environment variable. In case the instance of Web UI runs on
a separate server, it can be configured using the `NUXEO_WEB_UI_URL` environment variable. E.g.:

```
NUXEO_WEB_UI_URL=http://localhost:5000/ NUXEO_URL=http://localhost:8080/nuxeo/ npm run test
```

The tests can be run in development mode, which assume a nuxeo server running locally (http://localhost:8080/nuxeo/) and
Web UI being served in development mode from port 5000 (http://localhost:5000/):

```
npm run test:dev
```

You can also run a specific spec file, instead of running the whole suite:

```
npm run test -- --spec ./path/to/spec/file
# or
npm run test:dev -- --spec ./path/to/spec/file
```
