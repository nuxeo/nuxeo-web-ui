# NXP-27732: need Docker 17.05+ (only 17.03 avail on GKE)
# ARG SERVER_IMAGE=nuxeo-web-ui/server
# FROM $SERVER_IMAGE
FROM nginx
COPY server/nginx.conf /etc/nginx/nginx.conf

COPY dist/ ui/