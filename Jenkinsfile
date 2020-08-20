/*
 * (C) Copyright 2019 Nuxeo (http://nuxeo.com/) and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *     Nelson Silva <nsilva@nuxeo.com>
 */
properties([
  [$class: 'GithubProjectProperty', projectUrlStr: 'https://github.com/nuxeo/nuxeo-web-ui/'],
  [$class: 'BuildDiscarderProperty', strategy: [$class: 'LogRotator', daysToKeepStr: '60', numToKeepStr: '60', artifactNumToKeepStr: '5']],
])

void setGitHubBuildStatus(String context, String message, String state) {
  if (env.DRY_RUN != "true") {
    step([
      $class: 'GitHubCommitStatusSetter',
      reposSource: [$class: 'ManuallyEnteredRepositorySource', url: 'https://github.com/nuxeo/nuxeo-web-ui'],
      contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: context],
      statusResultSource: [$class: 'ConditionalStatusResultSource', results: [[$class: 'AnyBuildResult', message: message, state: state]]],
    ])
  }
}

// Replaces environment variables present in the given yaml file and then runs skaffold build on it.
void skaffoldBuild(String yaml = 'skaffold.yaml') {
  sh """
    envsubst < ${yaml} > ${yaml}~gen
    skaffold build -f ${yaml}~gen
  """
}

void dockerPublish(String image) {
  String src = "${DOCKER_REGISTRY}/${ORG}/${image}:${VERSION}"
  String target = "${PUBLIC_DOCKER_REGISTRY}/${ORG}/${image}:${VERSION}"
  echo "Pushing ${target}"
  sh """
    docker pull $src
    docker tag $src $target
    docker push $target
  """
}

def isPullRequest() {
  return BRANCH_NAME =~ /PR-.*/
}

def getPackageVersion() {
  container('mavennodejs') {
    return sh(script: 'npx -c \'echo "$npm_package_version"\'', returnStdout: true).trim()
  }
}

def getReleaseVersion() {
  def preid = 'rc'
  def nextPromotion = getPackageVersion().replace("-SNAPSHOT", "")
  def version = "${nextPromotion}-${preid}.0" // first version ever

  // find the latest tag if any
  sh "git fetch origin 'refs/tags/v${nextPromotion}*:refs/tags/v${nextPromotion}*'"
  def tag = sh(returnStdout: true, script: "git tag --sort=taggerdate --list 'v${nextPromotion}*' | tail -1 | tr -d '\n'")
  if (tag) {
    container('mavennodejs') {
      version = sh(returnStdout: true, script: "npx semver -i prerelease --preid ${preid} ${tag} | tr -d '\n'")
    }
  }
  return version
}

def getPullRequestVersion() {
  return getPackageVersion() + "-${BRANCH_NAME}"
}

def getVersion() {
  return isPullRequest() ? getPullRequestVersion() : getReleaseVersion()
}

pipeline {
  agent {
    label "jenkins-maven-nodejs-nuxeo"
  }
  environment {
    ORG = 'nuxeo'
    APP_NAME = 'nuxeo-web-ui'
    CONNECT_URL = 'https://nos-preprod-connect.nuxeocloud.com/nuxeo'
    VERSION = getVersion()
  }
  stages {
    stage('Update package version') {
      steps {
        container('mavennodejs') {
          echo """
          ---------------------------------
          Update package version ${VERSION}
          ---------------------------------
          """
          script {
            def snapshotVersion = getPackageVersion()
            sh "find . -type f -not -path './node_modules/*' -regex '.*\\.\\(yaml\\|sample\\|xml\\)' -exec sed -i 's/${snapshotVersion}/${VERSION}/g' {} \\;"
          }
          sh "npm version ${VERSION} --no-git-tag-version"
          dir('packages/nuxeo-web-ui-ftest') {
            sh "npm version ${VERSION} --no-git-tag-version"
          }
        }
      }
    }
    stage('Install dependencies and run lint') {
      steps {
        setGitHubBuildStatus('webui/install', 'Install dependencies and run lint', 'PENDING')
        container('mavennodejs') {
          echo """
          ---------------------------------
          Install dependencies and run lint
          ---------------------------------"""
          script {
            def nodeVersion = sh(script: 'node -v', returnStdout: true).trim()
            echo "node version: ${nodeVersion}"
          }
          sh 'npm install'
          dir('packages/nuxeo-web-ui-ftest') {
            sh 'npm install'
          }
          sh 'npm run lint'
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/install', 'Install dependencies and run lint', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/install', 'Install dependencies and run lint', 'FAILURE')
        }
      }
    }
    stage('Webpack build') {
      steps {
        setGitHubBuildStatus('webui/webpack', 'Webpack build', 'PENDING')
        container('mavennodejs') {
          echo """
          ------------
          Build Web UI
          ------------"""
          sh 'npm run build'
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/webpack', 'Webpack build', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/webpack', 'Webpack build', 'FAILURE')
        }
      }
    }
    stage('Run unit tests') {
      steps {
        setGitHubBuildStatus('webui/test', 'Unit tests', 'PENDING')
        container('mavennodejs') {
          script {
            SAUCE_ACCESS_KEY = sh(script: 'jx step credential -s saucelabs-web-ui -k key', , returnStdout: true).trim()
          }
          withEnv(["SAUCE_USERNAME=nuxeo-web-ui", "SAUCE_ACCESS_KEY=$SAUCE_ACCESS_KEY"]) {
            echo """
            --------------
            Run unit tests
            --------------"""
            sh 'npm run test'
          }
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/test', 'Unit tests', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/test', 'Unit tests', 'FAILURE')
        }
      }
    }
    stage('Nuxeo package build') {
      steps {
        setGitHubBuildStatus('webui/package', 'Nuxeo package build', 'SUCCESS')
        container('mavennodejs') {
          echo """
          --------------------------
          Build Nuxeo Web UI Package
          --------------------------"""
          sh 'mvn install -DskipInstall -DskipBuild'
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/package', 'Nuxeo package build', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/package', 'Nuxeo package build', 'FAILURE')
        }
      }
    }
    stage('Functional tests') {
      steps {
        setGitHubBuildStatus('webui/ftests', 'Functional Tests', 'PENDING')
        container('mavennodejs') {
          script {
            echo """
            --------------------------
            Run Nuxeo Web UI Functional Tests
            --------------------------"""
            sh 'mvn -B -nsu -f plugin/itests/addon install'
            sh 'mvn -B -nsu -f plugin/itests/marketplace install'
            try {
              sh 'mvn -B -nsu -f ftest install'
            } finally {
              try {
                archiveArtifacts allowEmptyArchive: true, artifacts: '**/reports/*,**/log/*.log, **/target/cucumber-reports/*.json, **/nxserver/config/distribution.properties, **/failsafe-reports/*, **/target/results/*.html, **/target/screenshots/*.png, plugin/web-ui/marketplace/target/nuxeo-web-ui-marketplace-*.zip, plugin/itests/marketplace/target/nuxeo-web-ui-marketplace-*.zip, plugin/metrics/target/report/*'
                cucumber fileIncludePattern: '**/*.json', jsonReportDirectory: 'ftest/target/cucumber-reports/', sortingMethod: 'NATURAL'
              } catch (err) {
                echo hudson.Functions.printThrowable(err)
              }
            }
          }
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/ftests', 'Functional Tests', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/ftests', 'Functional Tests', 'FAILURE')
        }
      }
    }
    stage('Git commit, tag and push') {
      when {
        allOf {
          not {
            branch 'PR-*'
          }
          not {
            environment name: 'DRY_RUN', value: 'true'
          }
        }
      }
      steps {
        container('mavennodejs') {
          echo """
          --------
          Git commit, tag and push
          --------
          """
          sh """
            #!/usr/bin/env bash -xe
            # create the Git credentials
            jx step git credentials
            git config credential.helper store
            git add package-lock.json packages/nuxeo-web-ui-ftest/package-lock.json
            git commit -a -m "Release ${VERSION}"
            git tag -a v${VERSION} -m "Release ${VERSION}"
            git push origin v${VERSION}
          """
        }
      }
    }
    stage('Publish Nuxeo Packages') {
      when {
        allOf {
          not {
            branch 'PR-*'
          }
          not {
            environment name: 'DRY_RUN', value: 'true'
          }
        }
      }
      steps {
        setGitHubBuildStatus('webui/publish/packages', 'Upload Nuxeo Packages', 'PENDING')
        container('mavennodejs') {
          echo """
          -------------------------------------------------
          Upload Nuxeo Packages to ${CONNECT_URL}
          -------------------------------------------------"""
          withCredentials([usernameColonPassword(credentialsId: 'connect-preprod', variable: 'CONNECT_PASS')]) {
            sh """
              PACKAGE="plugin/web-ui/marketplace/target/nuxeo-web-ui-marketplace-${VERSION}.zip"
              curl -i -u "$CONNECT_PASS" -F package=@\$PACKAGE "$CONNECT_URL"/site/marketplace/upload?batch=true
            """
          }
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/publish/packages', 'Upload Nuxeo Packages', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/publish/packages', 'Upload Nuxeo Packages', 'FAILURE')
        }
      }
    }
    stage('Publish Web UI FTest Framework') {
      when {
        allOf {
          not {
            branch 'PR-*'
          }
          not {
            environment name: 'DRY_RUN', value: 'true'
          }
        }
      }
      steps {
        setGitHubBuildStatus('webui/publish/ftest', 'Upload Nuxeo Packages', 'PENDING')
        container('mavennodejs') {
          echo """
          -----------------
          Publishing to npm
          -----------------"""
          script {
            def token = sh(script: 'jx step credential -s public-npm-token -k token', returnStdout: true).trim()
            sh "echo '//packages.nuxeo.com/repository/:_authToken=${token}' >> ~/.npmrc"
            dir('packages/nuxeo-web-ui-ftest') {
              sh 'npm publish --@nuxeo:registry=https://packages.nuxeo.com/repository/npm-public --tag SNAPSHOT'
            }
          }
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/publish/packages', 'Upload Nuxeo Packages', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/publish/packages', 'Upload Nuxeo Packages', 'FAILURE')
        }
      }
    }
    stage('Build and deploy Docker images') {
      when {
        not {
          environment name: 'DRY_RUN', value: 'true'
        }
      }
      steps {
        setGitHubBuildStatus('webui/docker', 'Build Docker images', 'PENDING')
        container('mavennodejs') {
          echo """
          ------------------------------
          Build and deploy Docker images
          ------------------------------
          Image tag: ${VERSION}
          """
          dir('server') {
            skaffoldBuild()
          }
          skaffoldBuild()
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/docker', 'Build Docker images', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/docker', 'Build Docker images', 'FAILURE')
        }
      }
    }
    stage('Deploy Preview') {
      when {
        allOf {
          branch 'PR-*'
          not {
            environment name: 'DRY_RUN', value: 'true'
          }
        }
      }
      steps {
        container('mavennodejs') {
          withEnv(["PREVIEW_VERSION=$VERSION"]) {
            echo """
            -----------------
            Deploying preview 
            -----------------
            """
            dir('charts/preview') {
              sh "make preview" // does some env subst before "jx step helm build"
              sh "jx preview"
            }
          }
        }
      }
    }
    /* stage('Publish Docker Images') {
      when {
        allOf {
          not {
            branch 'PR-*'
          }
          not {
            environment name: 'DRY_RUN', value: 'true'
          }
        }
      }
      steps {
        setGitHubBuildStatus('webui/publish', 'Publish Docker images', 'PENDING')
        container('mavennodejs') {
          withEnv(["VERSION=${VERSION}"]) {
            echo """
            ---------------------
            Publish Docker images
            ---------------------
            """
            dockerPublish("nuxeo-web-ui/server")
            dockerPublish("nuxeo-web-ui")
            dockerPublish("nuxeo-web-ui/dev")
          }
        }
      }
      post {
        success {
          setGitHubBuildStatus('webui/publish', 'Publish Docker images', 'SUCCESS')
        }
        failure {
          setGitHubBuildStatus('webui/publish', 'Publish Docker images', 'FAILURE')
        }
      }
    } */
  }
  post {
    always {
      script {
        if (BRANCH_NAME == 'master') {
          // update JIRA issue
          step([$class: 'JiraIssueUpdater', issueSelector: [$class: 'DefaultIssueSelector'], scm: scm])
        }
      }
    }
  }
}
