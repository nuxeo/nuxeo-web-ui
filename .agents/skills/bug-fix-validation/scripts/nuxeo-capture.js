'use strict';

/**
 * nuxeo-capture.js — evidence capture harness for Nuxeo Web UI validation runs.
 *
 * Copied into <validation-workspace>/harness/ by validation-init.sh. A scenario
 * script requires it, drives the UI, and gets screenshots, an mp4, a HAR, console
 * output, a network log and performance metrics written into the Evidence tree.
 *
 *   const { session } = require('./nuxeo-capture');
 *   (async () => {
 *     const s = await session({ label: 'after', phase: 'After', base: process.env.NX_VAL_FIXED_URL });
 *     await s.login();
 *     await s.goto('/ui/#!/browse/default-domain');
 *     await s.shot('01-browse');
 *     await s.finish();
 *   })();
 *
 * Environment: NX_VAL_EVIDENCE, NX_VAL_TICKET, NX_VAL_LOG (set by env.sh),
 * optionally NX_VAL_CHROME to override the browser binary.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

/**
 * puppeteer-screen-recorder pins its peer to puppeteer 19, which predates the
 * `browser: 'firefox'` launch option, so the Chrome pass stays on the pinned pair
 * and the second engine comes from an aliased modern install
 * (`puppeteer-modern@npm:puppeteer@^25`), added by `validation-init.sh --with-firefox`.
 */
function driverFor(browserName) {
  if (browserName === 'chrome') {
    return puppeteer;
  }
  try {
    // eslint-disable-next-line import-x/no-unresolved, global-require
    return require('puppeteer-modern');
  } catch (cause) {
    throw new Error(
      `session(): browser '${browserName}' needs the modern puppeteer alias. Run:\n` +
        `  bash .cursor/skills/bug-fix-validation/scripts/validation-init.sh $NX_VAL_TICKET --with-firefox`,
      { cause },
    );
  }
}

const EVIDENCE = process.env.NX_VAL_EVIDENCE || path.resolve(__dirname, '..', 'Evidence');
const TICKET = process.env.NX_VAL_TICKET || 'validation';
const RUN_LOG = process.env.NX_VAL_LOG;

const ensureDir = (p) => (fs.mkdirSync(p, { recursive: true }), p);

function logLine(message) {
  const line = `${new Date().toISOString()} | ${message}\n`;
  process.stdout.write(line);
  if (RUN_LOG) {
    try {
      fs.appendFileSync(RUN_LOG, line);
    } catch (_) {
      /* the log is best-effort; never fail a capture because of it */
    }
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.NX_VAL_CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  // undefined => puppeteer falls back to its own downloaded Chrome.
  return found || undefined;
}

/**
 * Injected before any page script runs.
 * - `automationReady`: Web UI defers bootstrap until an `automation-ready` signal
 *   when navigator.webdriver is true, so headless hangs on a blank page without it.
 * - `locale`: index.js reads navigator.language once at bootstrap to pick both the
 *   message bundle and the RTL direction, so the override has to land before it runs.
 * - `__deepAll`/`__visible`: Web UI content is buried in nested shadow roots, and
 *   hidden duplicate dialogs sit next to the live ones, so a flat querySelector
 *   either finds nothing or finds the invisible copy.
 */
function installPageHelpers(locale) {
  window.automationReady = true;
  if (locale) {
    Object.defineProperty(navigator, 'language', { get: () => locale, configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => [locale], configurable: true });
  }
  window.__deepAll = (root, acc) => {
    const start = root || document;
    const out = acc || [];
    start.querySelectorAll('*').forEach((node) => {
      out.push(node);
      if (node.shadowRoot) {
        window.__deepAll(node.shadowRoot, out);
      }
    });
    return out;
  };
  window.__visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poll(fn, { timeout = 15000, interval = 250, what = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out after ${timeout}ms waiting for ${what}`);
    }
    await sleep(interval);
  }
}

const SENSITIVE_HEADER = /^(authorization|cookie|set-cookie|proxy-authorization|x-auth-token|x-nuxeo-token)$/i;

const headerValue = (name, value) => (SENSITIVE_HEADER.test(name) ? '<redacted>' : String(value));

const asHeaders = (headers = {}) =>
  Object.entries(headers).map(([name, value]) => {
    return { name, value: headerValue(name, value) };
  });

/** Collects CDP network events into a HAR 1.2 document and a flat jsonl log. */
function networkRecorder() {
  const pending = new Map();
  const done = [];

  const attach = async (cdp) => {
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', (e) => {
      pending.set(e.requestId, {
        id: e.requestId,
        url: e.request.url,
        method: e.request.method,
        requestHeaders: e.request.headers,
        startedDateTime: new Date(e.wallTime * 1000).toISOString(),
        startTs: e.timestamp,
        type: e.type,
      });
    });
    cdp.on('Network.responseReceived', (e) => {
      const entry = pending.get(e.requestId);
      if (entry) {
        entry.status = e.response.status;
        entry.statusText = e.response.statusText;
        entry.responseHeaders = e.response.headers;
        entry.mimeType = e.response.mimeType;
        entry.type = e.type || entry.type;
      }
    });
    cdp.on('Network.loadingFinished', (e) => {
      const entry = pending.get(e.requestId);
      if (entry) {
        entry.ms = Math.max(0, Math.round((e.timestamp - entry.startTs) * 1000));
        entry.size = e.encodedDataLength;
        done.push(entry);
        pending.delete(e.requestId);
      }
    });
    cdp.on('Network.loadingFailed', (e) => {
      const entry = pending.get(e.requestId);
      if (entry) {
        entry.ms = Math.max(0, Math.round((e.timestamp - entry.startTs) * 1000));
        entry.failed = e.errorText;
        entry.status = entry.status || 0;
        done.push(entry);
        pending.delete(e.requestId);
      }
    });
  };

  const toHar = () => {
    return {
      log: {
        version: '1.2',
        creator: { name: 'nuxeo-capture', version: '1.0' },
        entries: done.map((e) => {
          return {
            startedDateTime: e.startedDateTime,
            time: e.ms || 0,
            request: {
              method: e.method,
              url: e.url,
              httpVersion: 'HTTP/1.1',
              headers: asHeaders(e.requestHeaders),
              queryString: [],
              cookies: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: {
              status: e.status || 0,
              statusText: e.statusText || (e.failed ? 'failed' : ''),
              httpVersion: 'HTTP/1.1',
              headers: asHeaders(e.responseHeaders),
              cookies: [],
              content: { size: e.size || 0, mimeType: e.mimeType || '' },
              redirectURL: '',
              headersSize: -1,
              bodySize: e.size || 0,
            },
            cache: {},
            timings: { send: 0, wait: e.ms || 0, receive: 0 },
            _resourceType: e.type,
            _error: e.failed,
          };
        }),
      },
    };
  };

  const toJsonl = () =>
    done
      .map((e) =>
        JSON.stringify({
          method: e.method,
          url: e.url,
          status: e.status || 0,
          type: e.type,
          ms: e.ms || 0,
          size: e.size || 0,
          error: e.failed,
        }),
      )
      .join('\n');

  return { attach, toHar, toJsonl, entries: done };
}

/**
 * Opens a recorded browser session.
 *
 * @param {object} opts
 * @param {string} opts.base       Server root, e.g. http://localhost:8100/nuxeo (required).
 * @param {string} [opts.label]    Run label used in filenames (e.g. 'before' / 'after' / 'ar').
 * @param {string} [opts.phase]    Screenshot folder: 'Before' or 'After'.
 * @param {string} [opts.locale]   BCP-47 tag forced onto navigator.language, e.g. 'fr', 'ar', 'he'.
 * @param {string} [opts.browser]  'chrome' (default) or 'firefox'.
 * @param {boolean} [opts.video]   Record an mp4 (Chrome only; default true).
 */
async function session(opts = {}) {
  const {
    base,
    label = 'run',
    phase = 'After',
    locale,
    browser: browserName = 'chrome',
    video = true,
    viewport = { width: 1280, height: 800 },
    headless = 'new',
  } = opts;

  if (!base) {
    throw new Error('session(): `base` is required, e.g. process.env.NX_VAL_FIXED_URL');
  }

  const shotDir = ensureDir(path.join(EVIDENCE, phase));
  ['Videos', 'Console', 'Network', 'Logs'].forEach((d) => ensureDir(path.join(EVIDENCE, d)));

  const isChrome = browserName === 'chrome';
  const driver = driverFor(browserName);
  const launchOptions = {
    headless: isChrome ? headless : true,
    args: [`--window-size=${viewport.width},${viewport.height}`],
  };
  if (isChrome) {
    launchOptions.executablePath = chromeExecutable();
    launchOptions.args.push('--no-sandbox');
  } else {
    launchOptions.browser = browserName;
  }
  if (locale) {
    launchOptions.args.push(`--lang=${locale}`);
  }

  const browser = await driver.launch(launchOptions);
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(installPageHelpers, locale);
  await page.setViewport(viewport);
  await page.setCacheEnabled(false);

  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) =>
    consoleLines.push(`[requestfailed] ${r.url()} ${r.failure() && r.failure().errorText}`),
  );

  // HAR collection and screen recording both ride on CDP, which only Chrome exposes.
  // A Firefox pass therefore yields screenshots and console output, not video/HAR.
  const net = networkRecorder();
  if (isChrome) {
    await net.attach(await page.target().createCDPSession());
  }

  let recorder = null;
  const recordVideo = video && isChrome;
  const videoPath = path.join(EVIDENCE, 'Videos', `${TICKET}-${label}.mp4`);
  if (recordVideo) {
    recorder = new PuppeteerScreenRecorder(page, { fps: 25, videoFrame: viewport });
    await recorder.start(videoPath);
  } else if (video && !isChrome) {
    logLine(`capture[${label}] ${browserName} has no CDP screencast — screenshots only, no mp4/HAR`);
  }

  let shotIndex = 0;
  const metrics = [];
  logLine(
    `capture[${label}] started against ${base} (phase ${phase}, ${browserName}${locale ? `, locale ${locale}` : ''})`,
  );

  const api = {
    page,
    browser,
    base,
    log: (message) => logLine(`capture[${label}] ${message}`),

    async waitForApp(timeout = 30000) {
      await poll(() => page.evaluate(() => !!document.querySelector('nuxeo-app')), {
        timeout,
        what: 'nuxeo-app to bootstrap',
      });
      await sleep(1500); // let the first layout settle before a screenshot
    },

    async goto(target, { waitForApp = true } = {}) {
      const url = /^https?:/.test(target) ? target : `${base}${target.startsWith('/') ? '' : '/'}${target}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      if (waitForApp) {
        await api.waitForApp().catch(() => api.log(`no nuxeo-app on ${url} (login page or error page?)`));
      }
      return url;
    },

    /** Logs in through login.jsp when the server redirects there. Fields are
     *  #username / #password — not input[name=username]. */
    async login(user = 'Administrator', password = 'Administrator') {
      await api.goto('/ui/', { waitForApp: false });
      const needsLogin = await page.evaluate(() => !!document.querySelector('#username'));
      if (!needsLogin) {
        api.log('already authenticated');
        await api.waitForApp().catch(() => {});
        return;
      }
      await page.type('#username', user, { delay: 60 });
      await page.type('#password', password, { delay: 60 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
        page.click('.login_button, input[type=submit]'),
      ]);
      await api.waitForApp();
      api.log(`logged in as ${user}`);
    },

    async shot(name) {
      shotIndex += 1;
      const file = path.join(shotDir, `${String(shotIndex).padStart(2, '0')}-${name}.png`);
      await page.screenshot({ path: file });
      api.log(`screenshot ${path.relative(EVIDENCE, file)}`);
      return file;
    },

    /** Runs `fn(nodesAcrossAllShadowRoots, ...args)` in the page. */
    async deepEval(fn, ...args) {
      return page.evaluate(
        (source, rest) => {
          // eslint-disable-next-line no-new-func
          const f = new Function(`return (${source})`)();
          return f(window.__deepAll(), ...rest);
        },
        fn.toString(),
        args,
      );
    },

    /** Clicks the first VISIBLE node matching `predicate(el)` by coordinates. */
    async deepClick(predicate, { timeout = 15000, what = 'element' } = {}) {
      const point = await poll(
        () =>
          page.evaluate((source) => {
            // eslint-disable-next-line no-new-func
            const f = new Function(`return (${source})`)();
            const el = window.__deepAll().filter(window.__visible).find(f);
            if (!el) {
              return null;
            }
            const r = el.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }, predicate.toString()),
        { timeout, what },
      );
      await page.mouse.click(point.x, point.y);
      api.log(`clicked ${what} at ${Math.round(point.x)},${Math.round(point.y)}`);
    },

    async type(text, delay = 90) {
      await page.keyboard.type(text, { delay });
    },

    async press(key) {
      await page.keyboard.press(key);
    },

    wait: sleep,

    async metrics(tag = 'snapshot') {
      if (!isChrome) {
        return null; // page.metrics() is CDP-only
      }
      const m = await page.metrics();
      metrics.push({ tag, at: new Date().toISOString(), ...m });
      return m;
    },

    /** What index.js resolved from navigator.language: text direction and message bundle. */
    async direction() {
      return page.evaluate(() => {
        return {
          dir: document.documentElement.dir,
          lang: document.documentElement.lang,
          i18nLanguage: window.nuxeo && window.nuxeo.I18n && window.nuxeo.I18n.language,
        };
      });
    },

    /**
     * Visible strings that still look like raw i18n keys (`label.foo.bar`), i.e. a
     * message missing from the active locale bundle. Reported per key with a sample.
     */
    async rawI18nKeys() {
      return page.evaluate(() => {
        const KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){1,}$/;
        const seen = new Map();
        window
          .__deepAll()
          .filter(window.__visible)
          .forEach((el) => {
            Array.from(el.childNodes)
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .forEach((n) => {
                const text = n.textContent.trim();
                if (KEY.test(text) && !seen.has(text)) {
                  seen.set(text, el.tagName.toLowerCase());
                }
              });
          });
        return Array.from(seen, ([key, tag]) => {
          return { key, tag };
        });
      });
    },

    /**
     * Dependency-free accessibility smoke probe across all shadow roots. It catches the
     * defects a UI change usually introduces — it does not replace keyboard and
     * screen-reader verification, which stay manual.
     */
    async a11yProbe() {
      return page.evaluate(() => {
        const nodes = window.__deepAll().filter(window.__visible);
        const name = (el) =>
          (
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.getAttribute('alt') ||
            el.textContent ||
            ''
          ).trim();
        const isControl = (el) =>
          ['button', 'a', 'paper-button', 'paper-icon-button', 'paper-fab'].includes(el.tagName.toLowerCase()) ||
          ['button', 'link'].includes(el.getAttribute('role'));
        const sample = (list) =>
          list.slice(0, 5).map((el) => {
            return { tag: el.tagName.toLowerCase(), id: el.id || null, cls: el.className || null };
          });

        const imagesWithoutAlt = nodes.filter((el) => el.tagName === 'IMG' && !el.hasAttribute('alt'));
        const unnamedControls = nodes.filter((el) => isControl(el) && !name(el));
        const unlabelledInputs = nodes.filter(
          (el) =>
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) &&
            el.type !== 'hidden' &&
            !el.getAttribute('aria-label') &&
            !el.getAttribute('aria-labelledby') &&
            !(el.id && el.getRootNode().querySelector(`label[for="${el.id}"]`)),
        );
        const positiveTabindex = nodes.filter((el) => Number(el.getAttribute('tabindex')) > 0);

        return {
          htmlLang: document.documentElement.lang || null,
          htmlDir: document.documentElement.dir || null,
          imagesWithoutAlt: { count: imagesWithoutAlt.length, sample: sample(imagesWithoutAlt) },
          unnamedControls: { count: unnamedControls.length, sample: sample(unnamedControls) },
          unlabelledInputs: { count: unlabelledInputs.length, sample: sample(unlabelledInputs) },
          positiveTabindex: { count: positiveTabindex.length, sample: sample(positiveTabindex) },
        };
      });
    },

    async finish() {
      if (recorder) {
        await recorder.stop();
        api.log(`video ${path.relative(EVIDENCE, videoPath)}`);
      }
      await api.metrics('final').catch(() => {});

      const write = (rel, data) => {
        const file = path.join(EVIDENCE, rel);
        fs.writeFileSync(file, data);
        api.log(`wrote ${rel}`);
      };
      write(path.join('Console', `${label}.log`), `${consoleLines.join('\n')}\n`);
      if (isChrome) {
        write(path.join('Network', `${label}.jsonl`), `${net.toJsonl()}\n`);
        write(path.join('Network', `${label}.har`), JSON.stringify(net.toHar(), null, 2));
        write(path.join('Logs', `${label}-metrics.json`), JSON.stringify(metrics, null, 2));
      }

      const errors = consoleLines.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
      api.log(`${net.entries.length} requests, ${consoleLines.length} console lines, ${errors.length} errors`);
      await browser.close();
      return { errors, requests: net.entries.length, video: recordVideo ? videoPath : null };
    },
  };

  return api;
}

module.exports = { session, logLine };
