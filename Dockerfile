FROM packages.nuxeo.com:5000/nuxeo/nginx-centos7:0.0.1

COPY server/nginx.conf /etc/nginx/nginx.conf
COPY dist/ ui/