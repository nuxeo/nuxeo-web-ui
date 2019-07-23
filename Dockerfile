# XXX: can't sequence kaniko builds so image might not be ready yet!
# ARG SERVER_IMAGE=nuxeo-web-ui/server
# FROM $SERVER_IMAGE
FROM nginx
COPY server/nginx.conf /etc/nginx/nginx.conf

COPY dist/ ui/