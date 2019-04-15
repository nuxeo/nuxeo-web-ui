const webdriverio = require('webdriverio');
const sauce = require('./lib/sauce.js');
const { capabilities } = require('./wdio.conf.js');
const fs = require('fs');

function bench() {
    var client = webdriverio.multiremote(capabilities);

    return client.init()
        .url('http://localhost:8080/nuxeo/ui')
        .setValue('#username', 'Administrator')
        .setValue('#password', 'Administrator')
        .click('[name="Submit"]')
        .waitUntil(() => client.execute(() => document.readyState === 'complete'))
        .pause(10000) // wait 10s before gathering all the metrics
        .execute(() => Nuxeo.Performance.report())
        .then((data) => {
            let res = {};
            Object.keys(data).forEach((browser) => {
                res[browser] = data[browser].value;
            });
            fs.writeFileSync(`target/report/metrics.json`, JSON.stringify(res));
        })
        .end()
        .catch((err) => console.log(err));
}

sauce.connect(capabilities)
.then(bench)
.then(() => sauce.close())
.catch((e) => console.error(e));
