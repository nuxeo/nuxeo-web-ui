OS := $(shell uname)

preview:
ifeq ($(OS),Darwin)
	sed -i "" -e "s/version:.*/version: $(PREVIEW_VERSION)/" Chart.yaml
	sed -i "" -e "s/version:.*/version: $(PREVIEW_VERSION)/" ../*/Chart.yaml
	sed -i "" -e "s|repository:.*|repository: $(NUXEO_IMAGE_NAME)|" values.yaml
	sed -i "" -e "s/tag:.*/tag: $(NUXEO_IMAGE_NAME_VERSION)/" values.yaml
else ifeq ($(OS),Linux)
	sed -i -e "s/version:.*/version: $(PREVIEW_VERSION)/" Chart.yaml
	sed -i -e "s/version:.*/version: $(PREVIEW_VERSION)/" ../*/Chart.yaml
	sed -i -e "s|repository:.*|repository: $(NUXEO_IMAGE_NAME)|" values.yaml
	sed -i -e "s/tag:.*/tag: $(NUXEO_IMAGE_VERSION)/" values.yaml
else
	echo "platfrom $(OS) not supported to release from"
	exit -1
endif
	jx step helm build
	mkdir target && helm template . --output-dir target
