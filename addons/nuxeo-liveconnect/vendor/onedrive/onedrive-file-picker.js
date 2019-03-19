/* eslint-disable */
(function(f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd) {
    define([], f);
  } else {
    let g;
    if (typeof window !== 'undefined') {
      g = window;
    } else if (typeof global !== 'undefined') {
      g = global;
    } else if (typeof self !== 'undefined') {
      g = self;
    } else {
      g = this;
    }
    g.OneDriveFilePicker = f();
  }
})(() => {
  let define;
  let module;
  let exports;
  return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          const a = typeof require === 'function' && require;
          if (!u && a) return a(o, !0);
          if (i) return i(o, !0);
          const f = new Error(`Cannot find module '${o}'`);
          throw ((f.code = 'MODULE_NOT_FOUND'), f);
        }
        const l = (n[o] = { exports: {} });
        t[o][0].call(
          l.exports,
          (e) => {
            const n = t[o][1][e];
            return s(n || e);
          },
          l,
          l.exports,
          e,
          t,
          n,
          r,
        );
      }
      return n[o].exports;
    }
    var i = typeof require === 'function' && require;
    for (let o = 0; o < r.length; o++) s(r[o]);
    return s;
  })(
    {
      1: [
        function(require, module, exports) {
          (function(process, global) {
            /*!
             * @overview es6-promise - a tiny implementation of Promises/A+.
             * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
             * @license   Licensed under MIT license
             *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
             * @version   3.1.2
             */

            (function() {
              function lib$es6$promise$utils$$objectOrFunction(x) {
                return typeof x === 'function' || (typeof x === 'object' && x !== null);
              }

              function lib$es6$promise$utils$$isFunction(x) {
                return typeof x === 'function';
              }

              function lib$es6$promise$utils$$isMaybeThenable(x) {
                return typeof x === 'object' && x !== null;
              }

              let lib$es6$promise$utils$$_isArray;
              if (!Array.isArray) {
                lib$es6$promise$utils$$_isArray = function(x) {
                  return Object.prototype.toString.call(x) === '[object Array]';
                };
              } else {
                lib$es6$promise$utils$$_isArray = Array.isArray;
              }

              const lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
              let lib$es6$promise$asap$$len = 0;
              let lib$es6$promise$asap$$vertxNext;
              let lib$es6$promise$asap$$customSchedulerFn;

              let lib$es6$promise$asap$$asap = function asap(callback, arg) {
                lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
                lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
                lib$es6$promise$asap$$len += 2;
                if (lib$es6$promise$asap$$len === 2) {
                  // If len is 2, that means that we need to schedule an async flush.
                  // If additional callbacks are queued before the queue is flushed, they
                  // will be processed by this flush that we are scheduling.
                  if (lib$es6$promise$asap$$customSchedulerFn) {
                    lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
                  } else {
                    lib$es6$promise$asap$$scheduleFlush();
                  }
                }
              };

              function lib$es6$promise$asap$$setScheduler(scheduleFn) {
                lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
              }

              function lib$es6$promise$asap$$setAsap(asapFn) {
                lib$es6$promise$asap$$asap = asapFn;
              }

              const lib$es6$promise$asap$$browserWindow = typeof window !== 'undefined' ? window : undefined;
              const lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
              const lib$es6$promise$asap$$BrowserMutationObserver =
                lib$es6$promise$asap$$browserGlobal.MutationObserver ||
                lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
              const lib$es6$promise$asap$$isNode =
                typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

              // test for web worker but not in IE10
              const lib$es6$promise$asap$$isWorker =
                typeof Uint8ClampedArray !== 'undefined' &&
                typeof importScripts !== 'undefined' &&
                typeof MessageChannel !== 'undefined';

              // node
              function lib$es6$promise$asap$$useNextTick() {
                // node version 0.10.x displays a deprecation warning when nextTick is used recursively
                // see https://github.com/cujojs/when/issues/410 for details
                return function() {
                  process.nextTick(lib$es6$promise$asap$$flush);
                };
              }

              // vertx
              function lib$es6$promise$asap$$useVertxTimer() {
                return function() {
                  lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
                };
              }

              function lib$es6$promise$asap$$useMutationObserver() {
                let iterations = 0;
                const observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
                const node = document.createTextNode('');
                observer.observe(node, { characterData: true });

                return function() {
                  node.data = iterations = ++iterations % 2;
                };
              }

              // web worker
              function lib$es6$promise$asap$$useMessageChannel() {
                const channel = new MessageChannel();
                channel.port1.onmessage = lib$es6$promise$asap$$flush;
                return function() {
                  channel.port2.postMessage(0);
                };
              }

              function lib$es6$promise$asap$$useSetTimeout() {
                return function() {
                  setTimeout(lib$es6$promise$asap$$flush, 1);
                };
              }

              var lib$es6$promise$asap$$queue = new Array(1000);
              function lib$es6$promise$asap$$flush() {
                for (let i = 0; i < lib$es6$promise$asap$$len; i += 2) {
                  const callback = lib$es6$promise$asap$$queue[i];
                  const arg = lib$es6$promise$asap$$queue[i + 1];

                  callback(arg);

                  lib$es6$promise$asap$$queue[i] = undefined;
                  lib$es6$promise$asap$$queue[i + 1] = undefined;
                }

                lib$es6$promise$asap$$len = 0;
              }

              function lib$es6$promise$asap$$attemptVertx() {
                try {
                  const r = require;
                  const vertx = r('vertx');
                  lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
                  return lib$es6$promise$asap$$useVertxTimer();
                } catch (e) {
                  return lib$es6$promise$asap$$useSetTimeout();
                }
              }

              let lib$es6$promise$asap$$scheduleFlush;
              // Decide what async method to use to triggering processing of queued callbacks:
              if (lib$es6$promise$asap$$isNode) {
                lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
              } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
                lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
              } else if (lib$es6$promise$asap$$isWorker) {
                lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
              } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
                lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
              } else {
                lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
              }
              function lib$es6$promise$then$$then(onFulfillment, onRejection) {
                const parent = this;
                const state = parent._state;

                if (
                  (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment) ||
                  (state === lib$es6$promise$$internal$$REJECTED && !onRejection)
                ) {
                  return this;
                }

                const child = new this.constructor(lib$es6$promise$$internal$$noop);
                const result = parent._result;

                if (state) {
                  const callback = arguments[state - 1];
                  lib$es6$promise$asap$$asap(() => {
                    lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
                  });
                } else {
                  lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
                }

                return child;
              }
              const lib$es6$promise$then$$default = lib$es6$promise$then$$then;
              function lib$es6$promise$promise$resolve$$resolve(object) {
                /* jshint validthis:true */
                const Constructor = this;

                if (object && typeof object === 'object' && object.constructor === Constructor) {
                  return object;
                }

                const promise = new Constructor(lib$es6$promise$$internal$$noop);
                lib$es6$promise$$internal$$resolve(promise, object);
                return promise;
              }
              const lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;

              function lib$es6$promise$$internal$$noop() {}

              const lib$es6$promise$$internal$$PENDING = void 0;
              var lib$es6$promise$$internal$$FULFILLED = 1;
              var lib$es6$promise$$internal$$REJECTED = 2;

              const lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

              function lib$es6$promise$$internal$$selfFulfillment() {
                return new TypeError('You cannot resolve a promise with itself');
              }

              function lib$es6$promise$$internal$$cannotReturnOwn() {
                return new TypeError('A promises callback cannot return that same promise.');
              }

              function lib$es6$promise$$internal$$getThen(promise) {
                try {
                  return promise.then;
                } catch (error) {
                  lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
                  return lib$es6$promise$$internal$$GET_THEN_ERROR;
                }
              }

              function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
                try {
                  then.call(value, fulfillmentHandler, rejectionHandler);
                } catch (e) {
                  return e;
                }
              }

              function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
                lib$es6$promise$asap$$asap((promise) => {
                  let sealed = false;
                  const error = lib$es6$promise$$internal$$tryThen(
                    then,
                    thenable,
                    (value) => {
                      if (sealed) {
                        return;
                      }
                      sealed = true;
                      if (thenable !== value) {
                        lib$es6$promise$$internal$$resolve(promise, value);
                      } else {
                        lib$es6$promise$$internal$$fulfill(promise, value);
                      }
                    },
                    (reason) => {
                      if (sealed) {
                        return;
                      }
                      sealed = true;

                      lib$es6$promise$$internal$$reject(promise, reason);
                    },
                    `Settle: ${promise._label || ' unknown promise'}`,
                  );

                  if (!sealed && error) {
                    sealed = true;
                    lib$es6$promise$$internal$$reject(promise, error);
                  }
                }, promise);
              }

              function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
                if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
                  lib$es6$promise$$internal$$fulfill(promise, thenable._result);
                } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
                  lib$es6$promise$$internal$$reject(promise, thenable._result);
                } else {
                  lib$es6$promise$$internal$$subscribe(
                    thenable,
                    undefined,
                    (value) => {
                      lib$es6$promise$$internal$$resolve(promise, value);
                    },
                    (reason) => {
                      lib$es6$promise$$internal$$reject(promise, reason);
                    },
                  );
                }
              }

              function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
                if (
                  maybeThenable.constructor === promise.constructor &&
                  then === lib$es6$promise$then$$default &&
                  constructor.resolve === lib$es6$promise$promise$resolve$$default
                ) {
                  lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
                } else if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
                  lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
                } else if (then === undefined) {
                  lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
                } else if (lib$es6$promise$utils$$isFunction(then)) {
                  lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
                } else {
                  lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
                }
              }

              function lib$es6$promise$$internal$$resolve(promise, value) {
                if (promise === value) {
                  lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
                } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
                  lib$es6$promise$$internal$$handleMaybeThenable(
                    promise,
                    value,
                    lib$es6$promise$$internal$$getThen(value),
                  );
                } else {
                  lib$es6$promise$$internal$$fulfill(promise, value);
                }
              }

              function lib$es6$promise$$internal$$publishRejection(promise) {
                if (promise._onerror) {
                  promise._onerror(promise._result);
                }

                lib$es6$promise$$internal$$publish(promise);
              }

              function lib$es6$promise$$internal$$fulfill(promise, value) {
                if (promise._state !== lib$es6$promise$$internal$$PENDING) {
                  return;
                }

                promise._result = value;
                promise._state = lib$es6$promise$$internal$$FULFILLED;

                if (promise._subscribers.length !== 0) {
                  lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
                }
              }

              function lib$es6$promise$$internal$$reject(promise, reason) {
                if (promise._state !== lib$es6$promise$$internal$$PENDING) {
                  return;
                }
                promise._state = lib$es6$promise$$internal$$REJECTED;
                promise._result = reason;

                lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
              }

              function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
                const subscribers = parent._subscribers;
                const { length } = subscribers;

                parent._onerror = null;

                subscribers[length] = child;
                subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
                subscribers[length + lib$es6$promise$$internal$$REJECTED] = onRejection;

                if (length === 0 && parent._state) {
                  lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
                }
              }

              function lib$es6$promise$$internal$$publish(promise) {
                const subscribers = promise._subscribers;
                const settled = promise._state;

                if (subscribers.length === 0) {
                  return;
                }

                let child;
                let callback;
                const detail = promise._result;

                for (let i = 0; i < subscribers.length; i += 3) {
                  child = subscribers[i];
                  callback = subscribers[i + settled];

                  if (child) {
                    lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
                  } else {
                    callback(detail);
                  }
                }

                promise._subscribers.length = 0;
              }

              function lib$es6$promise$$internal$$ErrorObject() {
                this.error = null;
              }

              const lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

              function lib$es6$promise$$internal$$tryCatch(callback, detail) {
                try {
                  return callback(detail);
                } catch (e) {
                  lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
                  return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
                }
              }

              function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
                const hasCallback = lib$es6$promise$utils$$isFunction(callback);
                let value;
                let error;
                let succeeded;
                let failed;

                if (hasCallback) {
                  value = lib$es6$promise$$internal$$tryCatch(callback, detail);

                  if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
                    failed = true;
                    error = value.error;
                    value = null;
                  } else {
                    succeeded = true;
                  }

                  if (promise === value) {
                    lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
                    return;
                  }
                } else {
                  value = detail;
                  succeeded = true;
                }

                if (promise._state !== lib$es6$promise$$internal$$PENDING) {
                  // noop
                } else if (hasCallback && succeeded) {
                  lib$es6$promise$$internal$$resolve(promise, value);
                } else if (failed) {
                  lib$es6$promise$$internal$$reject(promise, error);
                } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
                  lib$es6$promise$$internal$$fulfill(promise, value);
                } else if (settled === lib$es6$promise$$internal$$REJECTED) {
                  lib$es6$promise$$internal$$reject(promise, value);
                }
              }

              function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
                try {
                  resolver(
                    (value) => {
                      lib$es6$promise$$internal$$resolve(promise, value);
                    },
                    (reason) => {
                      lib$es6$promise$$internal$$reject(promise, reason);
                    },
                  );
                } catch (e) {
                  lib$es6$promise$$internal$$reject(promise, e);
                }
              }

              function lib$es6$promise$promise$all$$all(entries) {
                return new lib$es6$promise$enumerator$$default(this, entries).promise;
              }
              const lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
              function lib$es6$promise$promise$race$$race(entries) {
                /* jshint validthis:true */
                const Constructor = this;

                const promise = new Constructor(lib$es6$promise$$internal$$noop);

                if (!lib$es6$promise$utils$$isArray(entries)) {
                  lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
                  return promise;
                }

                const { length } = entries;

                function onFulfillment(value) {
                  lib$es6$promise$$internal$$resolve(promise, value);
                }

                function onRejection(reason) {
                  lib$es6$promise$$internal$$reject(promise, reason);
                }

                for (let i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
                  lib$es6$promise$$internal$$subscribe(
                    Constructor.resolve(entries[i]),
                    undefined,
                    onFulfillment,
                    onRejection,
                  );
                }

                return promise;
              }
              const lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
              function lib$es6$promise$promise$reject$$reject(reason) {
                /* jshint validthis:true */
                const Constructor = this;
                const promise = new Constructor(lib$es6$promise$$internal$$noop);
                lib$es6$promise$$internal$$reject(promise, reason);
                return promise;
              }
              const lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

              let lib$es6$promise$promise$$counter = 0;

              function lib$es6$promise$promise$$needsResolver() {
                throw new TypeError(
                  'You must pass a resolver function as the first argument to the promise constructor',
                );
              }

              function lib$es6$promise$promise$$needsNew() {
                throw new TypeError(
                  "Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.",
                );
              }

              const lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
              /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
              function lib$es6$promise$promise$$Promise(resolver) {
                this._id = lib$es6$promise$promise$$counter++;
                this._state = undefined;
                this._result = undefined;
                this._subscribers = [];

                if (lib$es6$promise$$internal$$noop !== resolver) {
                  typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
                  this instanceof lib$es6$promise$promise$$Promise
                    ? lib$es6$promise$$internal$$initializePromise(this, resolver)
                    : lib$es6$promise$promise$$needsNew();
                }
              }

              lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
              lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
              lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
              lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
              lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
              lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
              lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

              lib$es6$promise$promise$$Promise.prototype = {
                constructor: lib$es6$promise$promise$$Promise,

                /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
                then: lib$es6$promise$then$$default,

                /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
                catch: function(onRejection) {
                  return this.then(null, onRejection);
                },
              };
              var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
              function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
                this._instanceConstructor = Constructor;
                this.promise = new Constructor(lib$es6$promise$$internal$$noop);

                if (Array.isArray(input)) {
                  this._input = input;
                  this.length = input.length;
                  this._remaining = input.length;

                  this._result = new Array(this.length);

                  if (this.length === 0) {
                    lib$es6$promise$$internal$$fulfill(this.promise, this._result);
                  } else {
                    this.length = this.length || 0;
                    this._enumerate();
                    if (this._remaining === 0) {
                      lib$es6$promise$$internal$$fulfill(this.promise, this._result);
                    }
                  }
                } else {
                  lib$es6$promise$$internal$$reject(this.promise, this._validationError());
                }
              }

              lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
                return new Error('Array Methods must be provided an Array');
              };

              lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
                const { length } = this;
                const input = this._input;

                for (let i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
                  this._eachEntry(input[i], i);
                }
              };

              lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
                const c = this._instanceConstructor;
                const { resolve } = c;

                if (resolve === lib$es6$promise$promise$resolve$$default) {
                  const then = lib$es6$promise$$internal$$getThen(entry);

                  if (then === lib$es6$promise$then$$default && entry._state !== lib$es6$promise$$internal$$PENDING) {
                    this._settledAt(entry._state, i, entry._result);
                  } else if (typeof then !== 'function') {
                    this._remaining--;
                    this._result[i] = entry;
                  } else if (c === lib$es6$promise$promise$$default) {
                    const promise = new c(lib$es6$promise$$internal$$noop);
                    lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
                    this._willSettleAt(promise, i);
                  } else {
                    this._willSettleAt(
                      new c((resolve) => {
                        resolve(entry);
                      }),
                      i,
                    );
                  }
                } else {
                  this._willSettleAt(resolve(entry), i);
                }
              };

              lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
                const { promise } = this;

                if (promise._state === lib$es6$promise$$internal$$PENDING) {
                  this._remaining--;

                  if (state === lib$es6$promise$$internal$$REJECTED) {
                    lib$es6$promise$$internal$$reject(promise, value);
                  } else {
                    this._result[i] = value;
                  }
                }

                if (this._remaining === 0) {
                  lib$es6$promise$$internal$$fulfill(promise, this._result);
                }
              };

              lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
                const enumerator = this;

                lib$es6$promise$$internal$$subscribe(
                  promise,
                  undefined,
                  (value) => {
                    enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
                  },
                  (reason) => {
                    enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
                  },
                );
              };
              function lib$es6$promise$polyfill$$polyfill() {
                let local;

                if (typeof global !== 'undefined') {
                  local = global;
                } else if (typeof self !== 'undefined') {
                  local = self;
                } else {
                  try {
                    local = Function('return this')();
                  } catch (e) {
                    throw new Error('polyfill failed because global object is unavailable in this environment');
                  }
                }

                const P = local.Promise;

                if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
                  return;
                }

                local.Promise = lib$es6$promise$promise$$default;
              }
              const lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

              const lib$es6$promise$umd$$ES6Promise = {
                Promise: lib$es6$promise$promise$$default,
                polyfill: lib$es6$promise$polyfill$$default,
              };

              /* global define:true module:true window: true */
              if (typeof define === 'function' && define.amd) {
                define(() => lib$es6$promise$umd$$ES6Promise);
              } else if (typeof module !== 'undefined' && module.exports) {
                module.exports = lib$es6$promise$umd$$ES6Promise;
              } else if (typeof this !== 'undefined') {
                this.ES6Promise = lib$es6$promise$umd$$ES6Promise;
              }

              lib$es6$promise$polyfill$$default();
            }.call(this));
          }.call(
            this,
            require('_process'),
            typeof global !== 'undefined'
              ? global
              : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
              ? window
              : {},
          ));
        },
        { _process: 3 },
      ],
      2: [
        function(require, module, exports) {
          const hasOwn = Object.prototype.hasOwnProperty;
          const toStr = Object.prototype.toString;

          const isArray = function isArray(arr) {
            if (typeof Array.isArray === 'function') {
              return Array.isArray(arr);
            }

            return toStr.call(arr) === '[object Array]';
          };

          const isPlainObject = function isPlainObject(obj) {
            if (!obj || toStr.call(obj) !== '[object Object]') {
              return false;
            }

            const hasOwnConstructor = hasOwn.call(obj, 'constructor');
            const hasIsPrototypeOf =
              obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
            // Not own constructor property must be Object
            if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
              return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.
            let key;
            for (key in obj) {
              /**/
            }

            return typeof key === 'undefined' || hasOwn.call(obj, key);
          };

          module.exports = function extend() {
            let options;
            let name;
            let src;
            let copy;
            let copyIsArray;
            let clone;
            let target = arguments[0];
            let i = 1;
            const { length } = arguments;
            let deep = false;

            // Handle a deep copy situation
            if (typeof target === 'boolean') {
              deep = target;
              target = arguments[1] || {};
              // skip the boolean and the target
              i = 2;
            } else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
              target = {};
            }

            for (; i < length; ++i) {
              options = arguments[i];
              // Only deal with non-null/undefined values
              if (options != null) {
                // Extend the base object
                for (name in options) {
                  src = target[name];
                  copy = options[name];

                  // Prevent never-ending loop
                  if (target !== copy) {
                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                      if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && isArray(src) ? src : [];
                      } else {
                        clone = src && isPlainObject(src) ? src : {};
                      }

                      // Never move original objects, clone them
                      target[name] = extend(deep, clone, copy);

                      // Don't bring in undefined values
                    } else if (typeof copy !== 'undefined') {
                      target[name] = copy;
                    }
                  }
                }
              }
            }

            // Return the modified object
            return target;
          };
        },
        {},
      ],
      3: [
        function(require, module, exports) {
          // shim for using process in browser

          const process = (module.exports = {});
          let queue = [];
          let draining = false;
          let currentQueue;
          let queueIndex = -1;

          function cleanUpNextTick() {
            draining = false;
            if (currentQueue.length) {
              queue = currentQueue.concat(queue);
            } else {
              queueIndex = -1;
            }
            if (queue.length) {
              drainQueue();
            }
          }

          function drainQueue() {
            if (draining) {
              return;
            }
            const timeout = setTimeout(cleanUpNextTick);
            draining = true;

            let len = queue.length;
            while (len) {
              currentQueue = queue;
              queue = [];
              while (++queueIndex < len) {
                if (currentQueue) {
                  currentQueue[queueIndex].run();
                }
              }
              queueIndex = -1;
              len = queue.length;
            }
            currentQueue = null;
            draining = false;
            clearTimeout(timeout);
          }

          process.nextTick = function(fun) {
            const args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
              for (let i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
              }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
              setTimeout(drainQueue, 0);
            }
          };

          // v8 likes predictible objects
          function Item(fun, array) {
            this.fun = fun;
            this.array = array;
          }
          Item.prototype.run = function() {
            this.fun.apply(null, this.array);
          };
          process.title = 'browser';
          process.browser = true;
          process.env = {};
          process.argv = [];
          process.version = ''; // empty string to avoid regexp issues
          process.versions = {};

          function noop() {}

          process.on = noop;
          process.addListener = noop;
          process.once = noop;
          process.off = noop;
          process.removeListener = noop;
          process.removeAllListeners = noop;
          process.emit = noop;

          process.binding = function(name) {
            throw new Error('process.binding is not supported');
          };

          process.cwd = function() {
            return '/';
          };
          process.chdir = function(dir) {
            throw new Error('process.chdir is not supported');
          };
          process.umask = function() {
            return 0;
          };
        },
        {},
      ],
      4: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _promise = require('./deps/promise');

          const _promise2 = _interopRequireDefault(_promise);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          /**
           * The Api class used to fetch information for OneDrive REST APIs.
           *
           * It's not meant to be used directly.
           */

          const Api = (function() {
            /**
             * Creates a new Api instance.
             * @param {object} options - The configuration options.
             * @param {string} [options.baseURL=https://api.onedrive.com/v1.0] - Base URL of OneDrive REST APIs.
             * @param {string} [options.accessToken=YOUR_ACCESS_TOKEN] - The access token to use.
             */

            function Api(options) {
              _classCallCheck(this, Api);

              this._baseURL = options.baseURL;
              this._accessToken = options.accessToken;
              this._business = options.business;
            }

            _createClass(Api, [
              {
                key: 'fetchRootChildren',
                value: function fetchRootChildren() {
                  return this._fetch(`/drive/root/children${this._business ? '' : '?expand=thumbnails'}`);
                },
              },
              {
                key: 'fetchChildren',
                value: function fetchChildren(itemId) {
                  return this._fetch(`/drive/items/${itemId}/children${this._business ? '' : '?expand=thumbnails'}`);
                },
              },
              {
                key: 'search',
                value: function search(_search) {
                  return this._fetch(
                    `/drive/root/view.search?q=${encodeURI(_search)}${this._business ? '' : '&expand=thumbnails'}`,
                  );
                },
              },
              {
                key: '_fetch',
                value: function _fetch(path) {
                  const _this = this;

                  return new _promise2.default((resolve, reject) => {
                    jQuery.ajax({
                      url: _this._baseURL + path,
                      type: 'GET',
                      beforeSend: function beforeSend(xhr) {
                        xhr.setRequestHeader('Authorization', `Bearer ${_this._accessToken}`);
                      },
                      success: function success(data) {
                        resolve(data);
                      },
                      error: function error(jqXHR, textStatus, errorThrown) {
                        reject(errorThrown);
                      },
                    });
                  });
                },
              },
            ]);

            return Api;
          })();

          exports.default = Api;
          module.exports = exports.default;
        },
        { './deps/promise': 7 },
      ],
      5: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _breadcrumbItem = require('./html/breadcrumb-item');

          const _breadcrumbItem2 = _interopRequireDefault(_breadcrumbItem);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          /**
           * The BreadcrumbItemView class used to build the view.
           *
           * It's not meant to be used directly.
           */

          const BreadcrumbItemView = (function() {
            /**
             * Creates a new BreadcrumbItemView instance.
             * @param {object} itemData - The OneDrive item data for this item.
             */

            function BreadcrumbItemView() {
              const itemData = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

              _classCallCheck(this, BreadcrumbItemView);

              this._itemData = itemData;
            }

            /**
             * Gets the id of item.
             * @return {string} Item id.
             */

            _createClass(BreadcrumbItemView, [
              {
                key: 'getId',
                value: function getId() {
                  return this._itemData.id;
                },
              },
              {
                key: 'build',
                value: function build() {
                  const _item = jQuery(_breadcrumbItem2.default);
                  _item.data('item', this._itemData);
                  _item.find('a').html(this._itemData.name);
                  return _item;
                },
              },
            ]);

            return BreadcrumbItemView;
          })();

          exports.default = BreadcrumbItemView;
          module.exports = exports.default;
        },
        { './html/breadcrumb-item': 8 },
      ],
      6: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _breadcrumb2 = require('./html/breadcrumb');

          const _breadcrumb3 = _interopRequireDefault(_breadcrumb2);

          const _breadcrumbItemView = require('./breadcrumb-item-view');

          const _breadcrumbItemView2 = _interopRequireDefault(_breadcrumbItemView);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          const ROOT_ID = 'ROOT';
          const SEARCH_ID = 'SEARCH';

          /**
           * The BreadcrumbView class used to build the view.
           *
           * It's not meant to be used directly.
           */

          const BreadcrumbView = (function() {
            /**
             * Creates a new BreadcrumbView instance.
             */

            function BreadcrumbView() {
              _classCallCheck(this, BreadcrumbView);

              this._items = [new _breadcrumbItemView2.default({ id: ROOT_ID, name: 'Home', root: true })];
            }

            /**
             * Add a new item to the breadcrumb.
             * @param {object} itemData - The OneDrive item data for this breadcrumb item.
             * @return {BreadcrumbItemView} The added item.
             */

            _createClass(BreadcrumbView, [
              {
                key: 'addItem',
                value: function addItem() {
                  const itemData = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

                  const item = new _breadcrumbItemView2.default(itemData);
                  this._items.push(item);
                  return item;
                },

                /**
                 * Adds a new item as a search item to the breadcrumb.
                 * @param {string} search - The search input submitted by user.
                 * @return {BreadcrumbItemView} The added item.
                 */
              },
              {
                key: 'addSearch',
                value: function addSearch(search) {
                  const item = new _breadcrumbItemView2.default({ id: SEARCH_ID, name: 'Your search', search });
                  this._items.push(item);
                  return item;
                },

                /**
                 * Sets the current directory to item owning the input id. Which is equivalent to remove all elements after this one.
                 * @param {string} itemId - The item id.
                 */
              },
              {
                key: 'setCurrent',
                value: function setCurrent(itemId) {
                  const items = this._items;
                  this._items = [];
                  let _iteratorNormalCompletion = true;
                  let _didIteratorError = false;
                  let _iteratorError;

                  try {
                    for (
                      var _iterator = items[Symbol.iterator](), _step;
                      !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
                      _iteratorNormalCompletion = true
                    ) {
                      const item = _step.value;

                      this._items.push(item);
                      if (item.getId() === itemId) {
                        break;
                      }
                    }
                  } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                      }
                    } finally {
                      if (_didIteratorError) {
                        throw _iteratorError;
                      }
                    }
                  }
                },

                /**
                 * Reinitialize the breadcrumb.
                 */
              },
              {
                key: 'reinit',
                value: function reinit() {
                  this.setCurrent(ROOT_ID);
                },
              },
              {
                key: 'build',
                value: function build() {
                  const _breadcrumb = jQuery(_breadcrumb3.default);
                  let _element = _breadcrumb.find('[onedrive-insert-breadcrumb-items]');
                  if (_element.length === 0) {
                    _element = _breadcrumb;
                  }
                  let _iteratorNormalCompletion2 = true;
                  let _didIteratorError2 = false;
                  let _iteratorError2;

                  try {
                    for (
                      var _iterator2 = this._items[Symbol.iterator](), _step2;
                      !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
                      _iteratorNormalCompletion2 = true
                    ) {
                      const item = _step2.value;

                      _element.append(item.build());
                    }
                    // Mark the last as active
                  } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                      }
                    } finally {
                      if (_didIteratorError2) {
                        throw _iteratorError2;
                      }
                    }
                  }

                  _element
                    .children('.odfp-breadcrumb-item')
                    .last()
                    .addClass('odfp-active');
                  return _breadcrumb;
                },
              },
            ]);

            return BreadcrumbView;
          })();

          exports.default = BreadcrumbView;
          module.exports = exports.default;
        },
        { './breadcrumb-item-view': 5, './html/breadcrumb': 9 },
      ],
      7: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _es6Promise = require('es6-promise');

          const _es6Promise2 = _interopRequireDefault(_es6Promise);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          _es6Promise2.default.polyfill();

          exports.default = Promise;
          module.exports = exports.default;
        },
        { 'es6-promise': 1 },
      ],
      8: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });
          const breadcrumbItem = '<li class="odfp-breadcrumb-item">\n  <a href="#">Breadcrumb Item</a>\n</li>';

          exports.default = breadcrumbItem;
          module.exports = exports.default;
        },
        {},
      ],
      9: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });
          const breadcrumb = '<ol class="odfp-breadcrumb" onedrive-insert-breadcrumb-items></ol>';

          exports.default = breadcrumb;
          module.exports = exports.default;
        },
        {},
      ],
      10: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });
          const item =
            '<div class="odfp-item">\n  <div class="odfp-thumbnail">\n    <div class="odfp-picture"></div>\n    <div class="odfp-icon"></div>\n  </div>\n  <div class="odfp-name"></div>\n</div>';

          exports.default = item;
          module.exports = exports.default;
        },
        {},
      ],
      11: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });
          const picker =
            '<div class="onedrive-file-picker">\n  <div class="odfp-body">\n    <div class="odfp-header">\n      <span>Select a file</span>\n      <span class="odfp-close">Close</span>\n    </div>\n    <div class="odfp-content">\n      <div class="odfp-search">\n        <input class="odfp-search-input" type="text" />\n        <input class="odfp-search-submit odfp-button" type="submit" value="Search" />\n      </div>\n      <div onedrive-insert-breadcrumb></div>\n      <div class="odfp-grid" onedrive-insert-items></div>\n    </div>\n    <div class="odfp-footer">\n      <input class="odfp-select odfp-button" type="submit" value="Select" />\n    </div>\n  </div>\n</div>';

          exports.default = picker;
          module.exports = exports.default;
        },
        {},
      ],
      12: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _onedriveFilePicker = require('./onedrive-file-picker');

          const _onedriveFilePicker2 = _interopRequireDefault(_onedriveFilePicker);

          const _promise = require('./deps/promise');

          const _promise2 = _interopRequireDefault(_promise);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          _onedriveFilePicker2.default.promiseLibrary(_promise2.default);

          exports.default = _onedriveFilePicker2.default;
          module.exports = exports.default;
        },
        { './deps/promise': 7, './onedrive-file-picker': 14 },
      ],
      13: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _item2 = require('./html/item');

          const _item3 = _interopRequireDefault(_item2);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          /**
           * The ItemView class used to build the view.
           *
           * It's not meant to be used directly.
           */

          const ItemView = (function() {
            /**
             * Creates a new ItemView instance.
             * @param {object} itemData - The OneDrive item data for this item.
             */

            function ItemView() {
              const itemData = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

              _classCallCheck(this, ItemView);

              this._itemData = itemData;
            }

            _createClass(ItemView, [
              {
                key: 'build',
                value: function build() {
                  const _item = jQuery(_item3.default);
                  _item.addClass('odfp-item');
                  _item.data('item', this._itemData);
                  _item.find('.odfp-name').append(this._itemData.name);
                  const { thumbnails } = this._itemData;
                  if (thumbnails && thumbnails.length > 0) {
                    _item
                      .find('.odfp-thumbnail .odfp-picture')
                      .attr('style', `background-image: url("${thumbnails[0].medium.url}");`);
                    _item.find('.odfp-thumbnail .odfp-icon').hide();
                  } else {
                    _item.find('.odfp-thumbnail .odfp-picture').hide();
                    if (this._itemData.folder) {
                      _item.find('.odfp-thumbnail .odfp-icon').addClass('icon-folder-open');
                    } else if (this._itemData.video) {
                      _item.find('.odfp-thumbnail .odfp-icon').addClass('icon-file-video');
                    } else if (this._itemData.audio) {
                      _item.find('.odfp-thumbnail .odfp-icon').addClass('icon-file-audio');
                    } else if (this._itemData.image || this._itemData.photo) {
                      _item.find('.odfp-thumbnail .odfp-icon').addClass('icon-file-image');
                    } else {
                      _item.find('.odfp-thumbnail .odfp-icon').addClass('icon-doc-text');
                    }
                  }
                  if (this._itemData.folder) {
                    _item.data('folder', 'true');
                  }
                  return _item;
                },
              },
            ]);

            return ItemView;
          })();

          exports.default = ItemView;
          module.exports = exports.default;
        },
        { './html/item': 10 },
      ],
      14: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _api = require('./api');

          const _api2 = _interopRequireDefault(_api);

          const _pickerView = require('./picker-view');

          const _pickerView2 = _interopRequireDefault(_pickerView);

          const _extend = require('extend');

          const _extend2 = _interopRequireDefault(_extend);

          const _promise = require('./deps/promise');

          const _promise2 = _interopRequireDefault(_promise);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          const ONEDRIVE_FILE_PICKER_ID = 'onedrive-file-picker';
          const DEFAULT_OPTS = {
            id: ONEDRIVE_FILE_PICKER_ID,
            // For OneDrive for Business put your resource endpoint here: https://{tenant}-my.sharepoint.com/_api/v2.0
            baseURL: 'https://api.onedrive.com/v1.0',
            accessToken: null,
          };

          const OneDriveFilePicker = (function() {
            /**
             * Creates a new OneDriveFilePicker instance.
             * @param {object} opts - The configuration options.
             * @param {string} [opts.baseURL=https://api.onedrive.com/v1.0] - Base URL of OneDrive REST APIs.
             * @param {string} [opts.accessToken=YOUR_ACCESS_TOKEN] - The access token to use.
             */

            function OneDriveFilePicker() {
              const opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

              _classCallCheck(this, OneDriveFilePicker);

              const options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);
              this._id = options.id;
              this._jQuerySelector = `#${this._id}`;
              this._api = new _api2.default({
                baseURL: options.baseURL,
                accessToken: options.accessToken,
                business: opts.baseURL !== DEFAULT_OPTS.baseURL,
              });
              this._picker = new _pickerView2.default();
              this.Promise = OneDriveFilePicker.Promise || _promise2.default;
            }

            _createClass(OneDriveFilePicker, [
              {
                key: 'select',
                value: function select() {
                  const _this = this;

                  if (jQuery(this._jQuerySelector).length === 0) {
                    jQuery('body').append(`<div id="${this._id}"></div>`);
                  }
                  return this._api.fetchRootChildren().then((res) => {
                    jQuery(_this._jQuerySelector).replaceWith(_this._buildPicker(res.value));
                    _this._applyHandler();
                    const select = new _this.Promise((resolve) => {
                      jQuery(`${_this._jQuerySelector} input.odfp-select`).click((event) => {
                        if (jQuery(event.currentTarget).hasClass('odfp-active')) {
                          const activeItem = jQuery(`${_this._jQuerySelector} .odfp-item.odfp-active`);
                          if (activeItem.data('folder') === 'true') {
                            _this._api.fetchChildren(activeItem.data('item').id).then((children) => {
                              _this._replaceItems(children.value);
                            });
                          } else {
                            const activeItemData = activeItem.data('item');
                            _this.close();
                            resolve({ action: 'select', item: activeItemData });
                          }
                        }
                      });
                    });
                    const close = new _this.Promise((resolve) => {
                      jQuery(`${_this._jQuerySelector} span.odfp-close`).click(() => {
                        _this.close();
                        resolve({ action: 'close' });
                      });
                    });
                    return _this.Promise.race([select, close]);
                  });
                },
              },
              {
                key: 'close',
                value: function close() {
                  jQuery(this._jQuerySelector).hide();
                },
              },
              {
                key: '_buildPicker',
                value: function _buildPicker(items) {
                  const _this2 = this;

                  this._picker.clearItems();
                  items.forEach((item) => {
                    _this2._picker.addItem(item);
                  });
                  return this._picker.build().attr('id', ONEDRIVE_FILE_PICKER_ID);
                },

                /**
                 * Applies handler on all items.
                 */
              },
              {
                key: '_applyHandler',
                value: function _applyHandler() {
                  const _this3 = this;

                  const items = jQuery(`${this._jQuerySelector} .odfp-item`);
                  // Navigation
                  items.dblclick((event) => {
                    const item = jQuery(event.currentTarget);
                    if (item.data('folder') === 'true') {
                      (function() {
                        const itemData = item.data('item');
                        _this3._api.fetchChildren(itemData.id).then((res) => {
                          _this3._picker.addItemToBreadcrumb(itemData);
                          _this3._replaceItems(res.value);
                        });
                      })();
                    }
                  });
                  // Selection
                  jQuery(`${this._jQuerySelector} input.odfp-select`).removeClass('odfp-active');
                  items.click((event) => {
                    items.removeClass('odfp-active');
                    jQuery(event.currentTarget).addClass('odfp-active');
                    jQuery(`${_this3._jQuerySelector} input.odfp-select`).addClass('odfp-active');
                  });
                  // Breadcrumb
                  jQuery(`${this._jQuerySelector} .odfp-breadcrumb .odfp-breadcrumb-item`).click((event) => {
                    const item = jQuery(event.currentTarget);
                    if (!item.hasClass('odfp-active')) {
                      (function() {
                        const itemData = item.data('item');
                        const itemId = itemData.id;
                        let promise;
                        if (itemData.root) {
                          promise = _this3._api.fetchRootChildren();
                        } else if (itemData.search) {
                          promise = _this3._api.search(itemData.search);
                        } else {
                          promise = _this3._api.fetchChildren(itemId);
                        }
                        promise.then((res) => {
                          _this3._picker.setBreadcrumbTo(itemId);
                          _this3._replaceItems(res.value);
                        });
                      })();
                    }
                  });
                  // Search
                  const searchInputId = `${this._jQuerySelector} .odfp-search .odfp-search-input`;
                  const submitInputId = `${this._jQuerySelector} .odfp-search .odfp-search-submit`;
                  jQuery(searchInputId).keypress((event) => {
                    if (event.which === 13) {
                      event.preventDefault();
                      jQuery(submitInputId).click();
                    }
                  });
                  jQuery(submitInputId).click(() => {
                    const search = jQuery(searchInputId).val();
                    _this3._api.search(search).then((res) => {
                      _this3._picker.reinitBreadcrumb();
                      _this3._picker.addSearchToBreadcrumb(search);
                      _this3._replaceItems(res.value);
                    });
                  });
                },

                /**
                 * Replaces items in the dom and applies the handlers.
                 */
              },
              {
                key: '_replaceItems',
                value: function _replaceItems(items) {
                  const content = this._buildPicker(items).find('.odfp-content');
                  jQuery(`${this._jQuerySelector} .odfp-content`).replaceWith(content);
                  this._applyHandler();
                },
              },
            ]);

            return OneDriveFilePicker;
          })();

          /**
           * Sets the Promise library class to use.
           */

          OneDriveFilePicker.promiseLibrary = function(promiseLibrary) {
            OneDriveFilePicker.Promise = promiseLibrary;
          };

          exports.default = OneDriveFilePicker;
          module.exports = exports.default;
        },
        { './api': 4, './deps/promise': 7, './picker-view': 15, extend: 2 },
      ],
      15: [
        function(require, module, exports) {
          Object.defineProperty(exports, '__esModule', {
            value: true,
          });

          const _createClass = (function() {
            function defineProperties(target, props) {
              for (let i = 0; i < props.length; i++) {
                const descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
              }
            }
            return function(Constructor, protoProps, staticProps) {
              if (protoProps) defineProperties(Constructor.prototype, protoProps);
              if (staticProps) defineProperties(Constructor, staticProps);
              return Constructor;
            };
          })();

          const _breadcrumbView = require('./breadcrumb-view');

          const _breadcrumbView2 = _interopRequireDefault(_breadcrumbView);

          const _itemView = require('./item-view');

          const _itemView2 = _interopRequireDefault(_itemView);

          const _picker2 = require('./html/picker');

          const _picker3 = _interopRequireDefault(_picker2);

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError('Cannot call a class as a function');
            }
          }

          /**
           * The PickerView class used to build the view.
           *
           * It's not meant to be used directly.
           */

          const PickerView = (function() {
            /**
             * Creates a new PickerView instance.
             */

            function PickerView() {
              _classCallCheck(this, PickerView);

              this._breadcrumb = new _breadcrumbView2.default();
              this._items = [];
            }

            /**
             * Add a new item to the grid.
             * @param {object} itemData - The OneDrive item data for this item.
             */

            _createClass(PickerView, [
              {
                key: 'addItem',
                value: function addItem() {
                  const itemData = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

                  const item = new _itemView2.default(itemData);
                  this._items.push(item);
                  return item;
                },

                /**
                 * Clears the items.
                 */
              },
              {
                key: 'clearItems',
                value: function clearItems() {
                  this._items = [];
                },

                /**
                 * Adds an item to the breadcrumb.
                 * @param {object} itemData - The item data.
                 */
              },
              {
                key: 'addItemToBreadcrumb',
                value: function addItemToBreadcrumb(itemData) {
                  this._breadcrumb.addItem(itemData);
                },

                /**
                 * Adds a search item to the breadcrumb.
                 * @param {string} search - The search request.
                 */
              },
              {
                key: 'addSearchToBreadcrumb',
                value: function addSearchToBreadcrumb(search) {
                  this._breadcrumb.addSearch(search);
                },

                /**
                 * Sets the current directory to the item owning the input id.
                 * @param {string} itemId - The item id to set as current directory.
                 */
              },
              {
                key: 'setBreadcrumbTo',
                value: function setBreadcrumbTo(itemId) {
                  this._breadcrumb.setCurrent(itemId);
                },

                /**
                 * Reinitialize the breadcrumb.
                 */
              },
              {
                key: 'reinitBreadcrumb',
                value: function reinitBreadcrumb() {
                  this._breadcrumb.reinit();
                },

                /**
                 * Builds the picker.
                 */
              },
              {
                key: 'build',
                value: function build() {
                  const _picker = jQuery(_picker3.default);
                  const _insertBreadcrumb = _picker.find('[onedrive-insert-breadcrumb]');
                  _insertBreadcrumb.append(this._breadcrumb.build());
                  const _insertItems = _picker.find('[onedrive-insert-items]');
                  let _iteratorNormalCompletion = true;
                  let _didIteratorError = false;
                  let _iteratorError;

                  try {
                    for (
                      var _iterator = this._items[Symbol.iterator](), _step;
                      !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
                      _iteratorNormalCompletion = true
                    ) {
                      const item = _step.value;

                      _insertItems.append(item.build());
                    }
                  } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                      }
                    } finally {
                      if (_didIteratorError) {
                        throw _iteratorError;
                      }
                    }
                  }

                  return _picker;
                },
              },
            ]);

            return PickerView;
          })();

          exports.default = PickerView;
          module.exports = exports.default;
        },
        { './breadcrumb-view': 6, './html/picker': 11, './item-view': 13 },
      ],
    },
    {},
    [12],
  )(12);
});
