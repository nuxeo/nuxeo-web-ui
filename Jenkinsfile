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
  step([
    $class: 'GitHubCommitStatusSetter',
    reposSource: [$class: 'ManuallyEnteredRepositorySource', url: 'https://github.com/nuxeo/nuxeo-web-ui'],
    contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: context],
    statusResultSource: [$class: 'ConditionalStatusResultSource', results: [[$class: 'AnyBuildResult', message: message, state: state]]],
  ])
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

def WEBUI_VERSION

pipeline {
  agent {
    label "jenkins-maven-nodejs-nuxeo"
  }
  environment {
    ORG = 'nuxeo'
    APP_NAME = 'nuxeo-web-ui'
    // NXBT-2885: need "Pipeline Utility Steps"
    // WEBUI_VERSION = readJSON(file: 'package.json').version
  }
  stages {
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
          sh 'npm install --no-package-lock --@nuxeo:registry=https://packages.nuxeo.com/repository/npm-all/'
          dir('packages/nuxeo-web-ui-ftest') {
            sh 'npm install --no-package-lock'
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
    stage('Build and deploy Docker images') {
      steps {
        setGitHubBuildStatus('webui/docker', 'Build Docker images', 'PENDING')
        container('mavennodejs') {
          script {
            WEBUI_VERSION =  sh(script: 'npx -c \'echo "$npm_package_version"\'', returnStdout: true).trim()
            if (BRANCH_NAME != 'master') {
              WEBUI_VERSION += "-${BRANCH_NAME}";
            }
          }
          withEnv(["VERSION=${WEBUI_VERSION}"]) {
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
        branch 'PR-*'
      }
      steps {
        container('mavennodejs') {
          withEnv(["PREVIEW_VERSION=$WEBUI_VERSION"]) {
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
    stage('Publish Docker Images') {
      when {
        branch 'master'
      }
      steps {
        setGitHubBuildStatus('webui/publish', 'Publish Docker images', 'PENDING')
        container('mavennodejs') {
          withEnv(["VERSION=${WEBUI_VERSION}"]) {
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
    }
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
