properties([
    [$class: 'RebuildSettings', autoRebuild: false, rebuildDisabled: false],
    parameters([
            string(name: 'BRANCH', defaultValue: '', description: 'Branch to test, fall-backs on $BASE_BRANCH if not found.', trim: false),
            choice(name: 'BASE_BRANCH', choices: ['master', '10.10', '9.10'], description: 'The branch to fallback on when $BRANCH is not found.'),
            string(name: 'SLAVE', defaultValue: 'SLAVE', description: 'Slave label to be used.', trim: false),
            booleanParam(name: 'CLEAN', defaultValue: false, description: 'Run npm and bower cache clean?'),
            booleanParam(name: 'SAUCE_LAB', defaultValue: true, description: 'Should unit tests be run on Sauce Lab (or just Chrome on the slave)?'),
            booleanParam(name: 'CREATE_PR', defaultValue: true, description: 'Should PRs be created if build is successful?'),
            booleanParam(name: 'SKIP_IT_TESTS', defaultValue: false, description: 'Should the functional tests be skipped?'),
            booleanParam(name: 'SKIP_UNIT_TESTS', defaultValue: false, description: 'Should the element\'s tests be skipped?'),
            booleanParam(name: 'GENERATE_METRICS', defaultValue: false, description: 'Should the metrics report be generated?'),
            string(name: 'BROWSER', defaultValue: 'chrome', description: 'The browser to use for functional tests.', trim: false),
            string(name: 'BROWSER_BINARY', defaultValue: '', description: 'The path to the browser binary.', trim: false),
    ]),
    pipelineTriggers([])
])

currentBuild.setDescription("Branch: $BRANCH -> $BASE_BRANCH")

def runSauceLabTests(repo, sauceCredentialId) {
    if (params.SKIP_UNIT_TESTS) {
        echo 'Tests are skipped'
    } else {
        if (params.SAUCE_LAB) {
            withCredentials([usernamePassword(credentialsId: "$sauceCredentialId", passwordVariable: 'SAUCE_ACCESS_KEY', usernameVariable: 'SAUCE_USERNAME')]) {
                sh "./node_modules/.bin/polymer test -l chrome --plugin sauce --job-name ${repo}-pipeline-$BRANCH --build-number $BUILD_NUMBER"
            }
        } else {
            sh 'npm run test'
        }
    }
}

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

def replaceVersion(dep) {
    def bower_folder = 'bower_components'
    if (fileExists("${bower_folder}/${dep}/bower.json")) {
        sh "rm -rf ${bower_folder}/${dep}"
        sh "rsync -av --exclude='node_modules' --exclude='.git' --exclude='bower_components' ../${dep}/ ${bower_folder}/${dep}"
    }
}

timestamps {
    node(SLAVE) {
        try {
            deleteDir()
            def VERSIONS_MAPPING = ['10.10': '2.4', '9.10': '2.2']
            def ELEMENTS_BASE_BRANCH = VERSIONS_MAPPING.containsKey(BASE_BRANCH) ? "maintenance-${VERSIONS_MAPPING.get(BASE_BRANCH)}.x" : BASE_BRANCH
            def MP_BASE_BRANCH = VERSIONS_MAPPING.containsKey(BASE_BRANCH) ? "${VERSIONS_MAPPING.get(BASE_BRANCH)}_${BASE_BRANCH}" : BASE_BRANCH
            def el, uiel, webui, webuiitests, plugin
            if (params.CLEAN) {
                sh 'npm cache clean --force && bower cache clean'
            }
            stage('nuxeo-elements') {
                timeout(30) {
                    el = cloneRebaseAndDir('nuxeo-elements', BRANCH, ELEMENTS_BASE_BRANCH)
                    if (el) {
                        echo 'Need to build nuxeo-elements'
                        dir('nuxeo-elements') {
                            sh 'bower install'
                            sh 'npm install && npm run lint'
                            runSauceLabTests('nuxeo-elements', 'SAUCE_ELEMENTS_ACCESS_KEY')
                        }
                    } else {
                        echo 'No need to build nuxeo-elements'
                    }
                }
            }
            stage('nuxeo-ui-elements') {
                timeout(30) {
                    uiel = cloneRebaseAndDir('nuxeo-ui-elements', BRANCH, ELEMENTS_BASE_BRANCH)
                    if (uiel || el) {
                        echo 'Need to build nuxeo-ui-elements'
                        dir('nuxeo-ui-elements') {
                            sh 'bower install'
                            if (el) {
                                replaceVersion('nuxeo-elements')
                            }
                            sh 'npm install && npm run lint'
                            runSauceLabTests('nuxeo-ui-elements', 'SAUCE_UI_ELEMENTS_ACCESS_KEY')
                        }
                    } else {
                        echo 'No need to build nuxeo-ui-elements'
                    }
                }
            }
            def mvnHome = tool 'maven-3.3'
            def javaHome = tool 'java-8-oracle'
            withEnv(["JAVA_HOME=${javaHome}", "MAVEN=${mvnHome}/bin", "PATH=${env.JAVA_HOME}/bin:${env.MAVEN}:${env.PATH}"]) {
                stage('nuxeo-web-ui') {
                    timeout(60) {
                        webui = cloneRebaseAndDir('nuxeo-web-ui')
                        if (webui || el || uiel) {
                            echo 'Need to build nuxeo-web-ui'
                            dir('nuxeo-web-ui') {
                                sh 'bower install'
                                if (el) {
                                    replaceVersion('nuxeo-elements')
                                }
                                if (uiel) {
                                    replaceVersion('nuxeo-ui-elements')
                                }
                                sh 'npm install'
                                sh 'mvn install -DskipInstall'
                                archive 'target/*.jar'
                            }
                        } else {
                            echo 'No need to build nuxeo-web-ui'
                        }
                    }
                }
                stage('nuxeo-web-ui-itests') {
                    timeout(30) {
                        webuiitests = cloneRebaseAndDir('nuxeo-web-ui-itests')
                        if (webuiitests) {
                            echo 'Need to nuxeo-web-ui-itests'
                            dir('nuxeo-web-ui-itests') {
                                sh 'mvn clean install'
                                archive 'target/*.jar'
                            }
                        } else {
                            echo 'No need to build nuxeo-web-ui-itests'
                        }
                    }
                }
                stage('plugin-nuxeo-web-ui') {
                    timeout(60) {
                        plugin = cloneRebaseAndDir('plugin-nuxeo-web-ui', BRANCH, MP_BASE_BRANCH)
                        if (plugin || el || uiel || webuiitests || webui) {
                            echo 'Need to plugin-nuxeo-web-ui'
                            dir('plugin-nuxeo-web-ui') {
                                def profiles = []
                                if (!params.SKIP_IT_TESTS) profiles.add('ftest')
                                if (params.GENERATE_METRICS) profiles.add('metrics')
                                withCredentials([usernamePassword(credentialsId: 'SAUCE_WEB_UI_ACCESS_KEY', passwordVariable: 'SAUCE_ACCESS_KEY', usernameVariable: 'SAUCE_USERNAME')]) {
                                    sh "mvn clean install ${profiles.isEmpty() ? "" : "-P" + profiles.join(",")}"
                                }
                                archive '**/reports/*,**/log/*.log, **/target/cucumber-reports/*.json, **/nxserver/config/distribution.properties, **/failsafe-reports/*, **/target/results/*.html, **/target/screenshots/*.png, marketplace/target/nuxeo-web-ui-marketplace-*-SNAPSHOT.zip, metrics/target/report/*'
                            }
                        } else {
                            echo 'No need to build plugin-nuxeo-web-ui'
                        }
                    }
                }
                stage('post-build') {
                    if (params.CREATE_PR) {
                        if (el) {
                            createPullRequest('nuxeo-elements', BRANCH, ELEMENTS_BASE_BRANCH)
                        }
                        if (uiel) {
                            createPullRequest('nuxeo-ui-elements', BRANCH, ELEMENTS_BASE_BRANCH)
                        }
                        if (webui) {
                            createPullRequest('nuxeo-web-ui')
                        }
                        if (webuiitests) {
                            createPullRequest('nuxeo-web-ui-itests')
                        }
                        if (plugin) {
                            createPullRequest('plugin-nuxeo-web-ui', BRANCH, MP_BASE_BRANCH)
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
