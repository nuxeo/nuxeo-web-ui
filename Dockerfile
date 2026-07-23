# Single deployable image for EKS: the Nuxeo server with the Web UI marketplace
# package (built from this repo) installed, so one image serves both the REST/API
# backend and the Web UI at /nuxeo/ui.
#
# The base Nuxeo server image/tag is parameterized so each LTS line points at the
# matching server version (e.g. 2023 for LTS-2023, 2025 for LTS-2025). Override
# NUXEO_IMAGE at build time to target a specific registry/tag.
ARG NUXEO_IMAGE=docker-private.packages.nuxeo.com/nuxeo/nuxeo:2025
FROM ${NUXEO_IMAGE}

USER root
# Locally-built Web UI marketplace package (mvn clean install output).
COPY --chown=900:0 plugin/web-ui/marketplace/target/nuxeo-web-ui-marketplace-*.zip \
     /home/nuxeo/local-packages/
USER 900

# Install the Web UI marketplace package offline.
RUN /install-packages.sh --offline /home/nuxeo/local-packages/nuxeo-web-ui-marketplace-*.zip
