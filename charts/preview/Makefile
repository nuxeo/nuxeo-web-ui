OS := $(shell uname)

preview:
ifeq ($(OS),Darwin)
	sed -i "" -e "s/version:.*/version: $(PREVIEW_VERSION)/" Chart.yaml
	sed -i "" -e "s/version:.*/version: $(PREVIEW_VERSION)/" ../*/Chart.yaml
	sed -i "" -e "s|repository:.*|repository: $(DOCKER_REGISTRY)\/$(ORG)\/nuxeo-web-ui|" values.yaml
	sed -i "" -e "s/tag:.*/tag: $(PREVIEW_VERSION)/" values.yaml
else ifeq ($(OS),Linux)
	sed -i -e "s/version:.*/version: $(PREVIEW_VERSION)/" Chart.yaml
	sed -i -e "s/version:.*/version: $(PREVIEW_VERSION)/" ../*/Chart.yaml
	sed -i -e "s|repository:.*|repository: $(DOCKER_REGISTRY)\/$(ORG)\/nuxeo-web-ui|" values.yaml
	sed -i -e "s/tag:.*/tag: $(PREVIEW_VERSION)/" values.yaml
else
	echo "platfrom $(OS) not supported to release from"
	exit -1
endif
	helm init --client-only --stable-repo-url=https://charts.helm.sh/stable
	helm repo add chartmuseum.jenkins-x.io https://jenkins-x-charts.github.io/v2/
	helm repo add jenkins-x-chartmuseum http://jenkins-x-chartmuseum:8080
	helm repo add nx-platform https://chartmuseum.platform.dev.nuxeo.com
	helm  dependency update .
