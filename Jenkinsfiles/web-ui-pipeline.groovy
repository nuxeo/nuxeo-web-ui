properties([
    [$class: 'RebuildSettings', autoRebuild: false, rebuildDisabled: false],
    parameters([
            string(name: 'BRANCH', defaultValue: '', description: 'Branch to test, fall-backs on $BASE_BRANCH if not found.', trim: false),
            choice(name: 'BASE_BRANCH', choices: ['maintenance-3.0.x'], description: 'The branch to fallback on when $BRANCH is not found.'),
            string(name: 'SLAVE', defaultValue: 'SLAVE', description: 'Slave label to be used.', trim: false),
            booleanParam(name: 'CLEAN', defaultValue: false, description: 'Run npm cache clean?'),
            booleanParam(name: 'SAUCE_LAB', defaultValue: true, description: 'Should unit tests be run on Sauce Lab (or just Chrome on the slave)?'),
            booleanParam(name: 'CREATE_PR', defaultValue: true, description: 'Should PRs be created if build is successful?'),
            booleanParam(name: 'SKIP_IT_TESTS', defaultValue: false, description: 'Should the functional tests be skipped?'),
            booleanParam(name: 'SKIP_UNIT_TESTS', defaultValue: false, description: 'Should the element\'s tests be skipped?'),
            booleanParam(name: 'GENERATE_METRICS', defaultValue: false, description: 'Should the metrics report be generated?'),
            string(name: 'BROWSER', defaultValue: 'chrome', description: 'The browser to use for functional tests.', trim: false),
            string(name: 'BROWSER_BINARY', defaultValue: '', description: 'The path to the browser binary.', trim: false),
            booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Should fail fast premise be skipped?', trim: false),
            string(name: 'BAIL', defaultValue: '0', description: 'Number of failed features to stop test runner (default value 0 means not applicable).', trim: false),
    ]),
    pipelineTriggers([])
])

currentBuild.setDescription("Branch: $BRANCH -> $BASE_BRANCH")

def createPullRequest(repo, branch = BRANCH, base = BASE_BRANCH) {
    withCredentials([usernamePassword(credentialsId: 'eea4e470-2c5e-468f-ab3a-e6c81fde94c0', passwordVariable: 'GITHUB_PASSWD', usernameVariable: 'GITHUB_TOKEN')]) {
        sh "curl -u \"$GITHUB_TOKEN:$GITHUB_PASSWD\" -H \"Accept: application/vnd.github.symmetra-preview+json\" -d '{\"title\":\"${branch}\",\"base\":\"${base}\", \"head\":\"${branch}\", \"body\": \"This Pull Request looks good!\"}'  https://api.github.com/repos/nuxeo/${repo}/pulls"
    }
}

def rebase_and_merge(branch = BRANCH, base = BASE_BRANCH) {
    sh "git rebase origin/${base}"
    sh "git checkout ${base}"
    sh "git pull --rebase"
    sh "git merge --no-ff origin/${branch} --log"
}

def cloneRebaseAndDir(repo, branch = BRANCH, fallback = BASE_BRANCH) {
    try {
        checkout([
                $class: 'GitSCM',
                branches: [[name: "refs/heads/$branch"]],
                extensions: [
                    [$class: 'RelativeTargetDirectory', relativeTargetDir: repo],
                    [$class: 'CleanBeforeCheckout']],
                userRemoteConfigs: [[url: "git@github.com:nuxeo/${repo}.git"]]])
        if (fallback) {
            dir (repo) {
                rebase_and_merge(branch, fallback)
            }
        }
        return true
    } catch (err) {
        echo "branch ${branch} not found in ${repo}"
        if (fallback != null) {
            echo "checking out ${fallback}"
            cloneRebaseAndDir(repo, fallback, null)
        }
        return false
    }
}

timestamps {
    node(SLAVE) {
        try {
            deleteDir()
            def el, datavizel, uiel, webui, webuiitests, plugin, helpers
            if (params.CLEAN) {
                sh 'npm cache clean --force'
            }
            if (cloneRebaseAndDir('nuxeo-elements')) {
                echo 'Need to build nuxeo-elements'
                stage('nuxeo-elements') {
                    withEnv(["FIREFOX_BIN=/opt/build/tools/firefox-63/firefox"]) {
                        dir('nuxeo-elements') {
                            sh 'npm install --no-package-lock && npm run bootstrap -- --no-ci'
                            sh 'npm run lint'
                            if (params.SKIP_UNIT_TESTS) {
                                echo 'Tests are skipped'
                            } else {
                                timeout(30) {
                                    if (params.SAUCE_LAB) {
                                        withCredentials([usernamePassword(credentialsId: "SAUCE_ELEMENTS_ACCESS_KEY", passwordVariable: 'SAUCE_ACCESS_KEY', usernameVariable: 'SAUCE_USERNAME')]) {
                                            sh 'npm run test'
                                        }
                                    } else {
                                        sh 'npm run test'
                                    }
                                }
                            }
                            dir('core') {
                                el = sh(script: 'npm pack 2>&1 | tail -1', returnStdout: true).trim()
                            }
                            dir('dataviz') {
                                datavizel = sh(script: 'npm pack 2>&1 | tail -1', returnStdout: true).trim()
                            }
                            dir('ui') {
                                uiel = sh(script: 'npm pack 2>&1 | tail -1', returnStdout: true).trim()
                            }
                            dir('testing-helpers') {
                                helpers = sh(script: 'npm pack 2>&1 | tail -1', returnStdout: true).trim()
                            }
                        }
                    }
                }
            } else {
                echo 'No need to build nuxeo-elements'
            }
            def mvnHome = tool 'maven-3.3'
            def javaHome = tool 'java-11-openjdk'
            withEnv(["JAVA_HOME=${javaHome}", "MAVEN=${mvnHome}/bin", "PATH=${env.JAVA_HOME}/bin:${env.MAVEN}:${env.PATH}"]) {
                stage('nuxeo-web-ui') {
                    timeout(60) {
                        webui = cloneRebaseAndDir('nuxeo-web-ui')
                        if (webui || el || uiel || datavizel || helpers) {
                            echo 'Need to build nuxeo-web-ui'
                            dir('nuxeo-web-ui') {
                                sh 'npm install --no-package-lock --@nuxeo:registry="https://packages.nuxeo.com/repository/npm-public"'
                                if (el) {
                                    sh "npm install --no-package-lock --@nuxeo:registry=\"https://packages.nuxeo.com/repository/npm-public\" ../nuxeo-elements/core/${el}"
                                }
                                if (datavizel) {
                                    sh "npm install --no-package-lock --@nuxeo:registry=\"https://packages.nuxeo.com/repository/npm-public\" ../nuxeo-elements/dataviz/${datavizel}"
                                }
                                if (uiel) {
                                    sh "npm install --no-package-lock --@nuxeo:registry=\"https://packages.nuxeo.com/repository/npm-public\" ../nuxeo-elements/ui/${uiel}"
                                }
                                if (helpers) {
                                    sh "npm install --no-package-lock --@nuxeo:registry=\"https://packages.nuxeo.com/repository/npm-public\" ../nuxeo-elements/testing-helpers/${helpers}"
                                }
                                try {
                                    withEnv(["NODE_OPTIONS=--max-old-space-size=4096"]) {
                                        def profiles = []
                                        if (!params.SKIP_IT_TESTS) profiles.add('ftest')
                                        if (params.GENERATE_METRICS) profiles.add('metrics')
                                        withCredentials([usernamePassword(credentialsId: 'SAUCE_WEB_UI_ACCESS_KEY', passwordVariable: 'SAUCE_ACCESS_KEY', usernameVariable: 'SAUCE_USERNAME')]) {
                                            sh "mvn clean install ${profiles.isEmpty() ? "" : "-P" + profiles.join(",")} -DskipInstall"
                                        }
                                    }
                                } finally {
                                    archiveArtifacts '**/reports/*,**/log/*.log, **/target/cucumber-reports/*.json, **/nxserver/config/distribution.properties, **/failsafe-reports/*, **/target/results/*.html, **/target/screenshots/*.png, plugin/web-ui/marketplace/target/nuxeo-web-ui-marketplace-*.zip, plugin/itests/marketplace/target/nuxeo-web-ui-marketplace-*.zip, plugin/metrics/target/report/*'
                                }
                            }
                        } else {
                            echo 'No need to build nuxeo-web-ui'
                        }
                    }
                }
                stage('post-build') {
                    if (params.CREATE_PR) {
                        if (el || datavizel || uiel || helpers) {
                            createPullRequest('nuxeo-elements')
                        }
                        if (webui) {
                            createPullRequest('nuxeo-web-ui')
                        }
                    }
                    slackSend channel: '#webui-qa-ci', color: 'good', message: "${env.JOB_NAME} - #${env.BUILD_NUMBER} - $BRANCH Build success (<${env.BUILD_URL}|Open>)"
                }
            }
        } catch(e) {
            currentBuild.result = "FAILURE"
            slackSend channel: '#webui-qa-ci', color: 'danger', message: "${env.JOB_NAME} - #${env.BUILD_NUMBER} - $BRANCH Failure (<${env.BUILD_URL}|Open>)"
            throw e
        }
    }
}
