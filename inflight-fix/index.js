// Simple, safe replacement for inflight package
// Avoids memory leaks and security issues

const reqs = Object.create(null);

function inflightFix(key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb);
    return null;
  }

  reqs[key] = [cb];

  // Return a function that will execute all queued callbacks
  return function executeCallbacks(...args) {
    const callbacks = reqs[key];
    delete reqs[key];

    callbacks.forEach((callback) => {
      callback(...args);
    });
  };
}

module.exports = inflightFix;
