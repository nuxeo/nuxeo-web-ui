ARG SERVER_IMAGE=nuxeo-web-ui/server
FROM $SERVER_IMAGE

COPY dist/ ui/