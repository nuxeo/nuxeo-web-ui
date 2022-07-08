# @license
# (C) Copyright Nuxeo Corp. (http://nuxeo.com/)

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/bash

# Run in a clean directory passing in a GitHub org, repo and tag/branch name
if [ "$#" -ne 2 ]; then
    echo "maven-deploy.sh <root> <verion>"
    exit 1
fi

ROOT=$1
VERSION=$2
GROUPID=org.nuxeo.web.ui.studio
ARTIFACTID=view-designer-catalog

MVN_REPO_ID=public-releases
MVN_REPO_URL=http://mavenin.nuxeo.com/nexus/content/repositories/public-releases
if [[ $VERSION == *-SNAPSHOT ]]; then
    MVN_REPO_ID=public-snapshots
    MVN_REPO_URL=http://mavenin.nuxeo.com/nexus/content/repositories/public-snapshots
fi

pushd $ROOT
zip -r $ARTIFACTID-$VERSION.zip nuxeo-web-ui data hints catalog.json
mvn deploy:deploy-file -Dfile=$ARTIFACTID-$VERSION.zip -DgroupId=$GROUPID -DartifactId=$ARTIFACTID -Dversion=$VERSION -Dpackaging=zip -DrepositoryId=$MVN_REPO_ID -Durl=$MVN_REPO_URL
popd
