const fs = require('fs');
const { multiremote } = require('webdriverio');
var selenium = require('selenium-standalone');

async function runSelenium() {
    return new Promise((resolve, reject) => selenium.install({}, function(err) {
        if (err) {
            debugger;
            reject();
        } else {
            selenium.start(function(err, proc) {
                if (err) {
                    proc.kill();
                    reject()
                } else {
                    resolve(proc);
                }
            })
        }
    }));
}

async function bench() {
    const selenium = await runSelenium();
    var client = multiremote({
        chrome: {
            desiredCapabilities: {
                browserName: 'chrome',
            }
        },
        firefox: {
            desiredCapabilities: {
                browserName: 'firefox',
            }
        },
        safari: {
            desiredCapabilities: {
                browserName: 'safari',
            }
        },
    });
    return client.init()
        /* .setNetworkConditions({}, 'Good 3G') */
        .url('http://localhost:8080/nuxeo/ui/#!/browse/default-domain/workspaces/demo')
        .setValue('#username', 'Administrator')
        .setValue('#password', 'Administrator')
        .click('[name="Submit"]')
        /* .waitUntil(() => client.execute(() => document.readyState === 'complete')) */
        .pause(10000) // wait 10s before gathering all the metrics
        .execute(() => Nuxeo.Performance.report())
        .then((data) => {
            let res = {};
            Object.keys(data).forEach((browser) => {
                res[browser] = data[browser].value;
            });
            fs.writeFileSync(`report/metrics.json`, JSON.stringify(res));
        })
        .end()
        .catch((err) => console.log(err))
        .finally(() => selenium.kill());
}

bench().catch((e) => console.error(e));
