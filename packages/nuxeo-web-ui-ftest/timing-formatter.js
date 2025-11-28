const { Formatter } = require('@cucumber/cucumber');

class TimingFormatter extends Formatter {
  constructor(options) {
    super(options);

    this.startTimes = new Map();

    options.eventBroadcaster.on('test-case-started', (event) => {
      const uri = event.sourceLocation.uri;
      const ts = event.sourceLocation.line;
      const id = `${uri}:${ts}`;
      this.startTimes.set(id, Date.now());
    });

    options.eventBroadcaster.on('test-case-finished', (event) => {
      const uri = event.sourceLocation.uri;
      const ts = event.sourceLocation.line;
      const id = `${uri}:${ts}`;
      const start = this.startTimes.get(id);
      if (start) {
        const ms = Date.now() - start;
        console.log(`⏱ Feature: ${uri} took ${ms} ms`);
      }
    });
  }
}

module.exports = TimingFormatter;