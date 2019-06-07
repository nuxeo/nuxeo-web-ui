# Builds docker images
REGISTRY ?= dockerpriv.nuxeo.com:443
VERSION ?= $(shell npm run --silent info:version)

.PHONY: docker_ui 

docker_ui: dist docker_server
	docker build -t nuxeo-web-ui:$(VERSION) .

dist:
	npm run build

docker_server:
	docker build -t nuxeo-web-ui/server:$(VERSION) server

push:
	docker tag nuxeo-web-ui:$(VERSION) $(REGISTRY)/nuxeo-web-ui:$(VERSION)
	docker push $(REGISTRY)/nuxeo-web-ui:$(VERSION)
	docker tag nuxeo-web-ui/server:$(VERSION) $(REGISTRY)/nuxeo-web-ui/server:$(VERSION)
	docker push $(REGISTRY)/nuxeo-web-ui/server:$(VERSION)
