# NXP-27732: need Docker 17.05+ (only 17.03 avail on GKE)
# ARG SERVER_IMAGE=nuxeo-web-ui/server
# FROM $SERVER_IMAGE
FROM nginx
COPY server/nginx.conf /etc/nginx/nginx.conf

COPY dist/ ui/

ENTRYPOINT \
  sed -i -e "s|\$BASE_URL|$BASE_URL|g" /ui/index.html && \
  sed -i -e "s|\[\"\$NUXEO_PACKAGES\"\]|\"$NUXEO_PACKAGES\"|g" /ui/index.html && \ 
  exec nginx -g 'daemon off;'
