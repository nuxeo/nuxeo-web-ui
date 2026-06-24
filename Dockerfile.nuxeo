# Single deployable image for EKS: the Nuxeo server with the Web UI marketplace
# package (built from this repo) installed, so one image serves both the REST/API
# backend and the Web UI at /nuxeo/ui.
#
# The base Nuxeo server image/tag is parameterized so each LTS line points at the
# matching server version (e.g. 2023 for LTS-2023, 2025 for LTS-2025). Override
# NUXEO_IMAGE at build time to target a specific registry/tag.
ARG NUXEO_IMAGE=docker-private.packages.nuxeo.com/nuxeo/nuxeo:2023
FROM ${NUXEO_IMAGE}

# Optional space/comma-separated Nuxeo Connect marketplace packages to also install
# at build time (e.g. server-side addons). Requires a valid NUXEO_CLID at build time.
ARG NUXEO_SERVER_PACKAGES=""

USER root
# Locally-built Web UI marketplace package (mvn clean install output).
COPY --chown=900:0 plugin/web-ui/marketplace/target/nuxeo-web-ui-marketplace-*.zip \
     /home/nuxeo/local-packages/
USER 900

# Install the Web UI package offline, plus any Connect packages when provided.
RUN /install-packages.sh --offline /home/nuxeo/local-packages/nuxeo-web-ui-marketplace-*.zip \
 && if [ -n "${NUXEO_SERVER_PACKAGES}" ]; then /install-packages.sh ${NUXEO_SERVER_PACKAGES}; fi
