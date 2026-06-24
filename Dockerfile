# Combined Nuxeo Web UI image: bundles the nginx server and the built UI assets
# into a single self-contained image that can be deployed directly (e.g. to EKS),
# without requiring a separately built/pushed server base image.
ARG SERVER_IMAGE=docker.packages.nuxeo.com/nuxeo/nginx-centos7:0.0.1
FROM $SERVER_IMAGE

COPY server/nginx.conf /etc/nginx/nginx.conf
COPY dist/ ui/