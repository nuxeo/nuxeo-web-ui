const JsonFormatter = require('cucumber').Listener.JsonFormatter(),
      mkdirp = require('mkdirp'),
      path = require('path'),
      fs = require('fs');

module.exports = function JsonOutputHook() {
  const reportFilePath = process.env.CUCUMBER_REPORT_PATH;
  if (reportFilePath) {
    JsonFormatter.log = function (json) {
      if (!json || json === '[]') {
        return;
      }
      if (fs.existsSync(reportFilePath)) {
        const allResults = JSON.parse(fs.readFileSync(reportFilePath).toString());
        allResults.push(JSON.parse(json)[0]);
        fs.writeFileSync(reportFilePath, JSON.stringify(allResults));
      } else {
        mkdirp.sync(path.dirname(reportFilePath));
        fs.writeFileSync(reportFilePath, json);
      }
    };
    this.registerListener(JsonFormatter);
  }
};
