/**
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
  Gabriel Barata <gbarata@nuxeo.com>
*/

export const LiveConnectBehavior = {
  properties: {
    clientId: {
      type: String,
    },
    authorizationURL: {
      type: String,
    },
    providerId: {
      type: String,
    },
    userId: {
      type: String,
    },
    isUserAuthorized: {
      type: Boolean,
      value: false,
      notify: true,
    },
    isAvailable: {
      type: Boolean,
      value: false,
      notify: true,
    },
  },

  generateBlobKey(fileId) {
    if (!this.providerId) {
      throw new Error('failed to generate key: providerId not defined');
    }
    if (!this.userId) {
      throw new Error('failed to generate key: userId not defined');
    }
    if (!fileId) {
      throw new Error('failed to generate key: fileId not defined');
    }
    return `${this.providerId}:${this.userId}:${fileId}`;
  },

  notifyBlobPick(blobs) {
    this.fire('nx-blob-picked', { blobs: Array.isArray(blobs) ? blobs : [blobs] });
  },

  /**
   * Origins allowed to post a message back to this window while an OAuth2 popup is open.
   *
   * The popup is sent to the provider's authorization page, but the window that ends up calling
   * `window.opener.postMessage` is the Nuxeo OAuth2 callback page the provider redirects to, and it
   * posts with a `*` target. Its origin is the one of the `redirect_uri` carried by the
   * authorization URL, and it falls back to the Nuxeo server this element is connected to. The
   * current origin is always accepted: a same-origin script already has full access to this window.
   *
   * Note this is only half of the check: `openPopup` also requires the message to come from the
   * popup window it opened, so another window on an allowed origin cannot inject a token.
   */
  _allowedMessageOrigins(url) {
    const origins = new Set([window.location.origin]);
    const addOrigin = (value) => {
      if (!value) {
        return;
      }
      try {
        origins.add(new URL(value, window.location.href).origin);
      } catch {
        // not a resolvable URL, nothing to allow
      }
    };
    const resource = this.$?.oauth2;
    const connection = resource?.$?.nx;
    addOrigin(connection?.url);
    try {
      addOrigin(new URL(url, window.location.href).searchParams.get('redirect_uri'));
    } catch {
      // authorization URL not parseable, rely on the connection origin
    }
    return origins;
  },

  openPopup(url, options) {
    const settings = {
      width: '1000',
      height: '650',
      onClose() {},
      onMessageReceive() {},
    };

    if (options) {
      Object.assign(settings, options);
    }

    const left = window.screenX + window.outerWidth / 2 - settings.width / 2;
    const top = window.screenY + window.outerHeight / 2 - settings.height / 2;

    const popup = window.open(
      url,
      'popup',
      `height=${settings.height},width=${settings.width},top=${top},left=${left}`,
    );

    // if the popup could not be opened (e.g. blocked by the browser) there is no window to
    // authenticate messages against and nothing to poll; notify the caller and bail out rather
    // than registering a listener and a timer that would never be cleared.
    if (!popup) {
      if (typeof settings.onClose === 'function') {
        settings.onClose();
      }
      return;
    }

    // the popup is opened before the listener is registered so that the listener can authenticate the
    // sender against it; nothing can be posted in between, both statements run in the same task
    let listener;
    if (typeof settings.onMessageReceive === 'function') {
      const allowedOrigins = this._allowedMessageOrigins(url);
      listener = function (event) {
        if (event.source !== popup || !allowedOrigins.has(event.origin)) {
          return;
        }
        settings.onMessageReceive(event);
      };
      window.addEventListener('message', listener);
    }

    const checkCompleted = setInterval(() => {
      if (!popup.closed) {
        return;
      }

      clearInterval(checkCompleted);
      if (typeof settings.onClose === 'function') {
        settings.onClose();
      }
      window.removeEventListener('message', listener);
    }, 100);
  },

  updateProviderInfo() {
    if (!this.$.oauth2) {
      throw new Error('Missing OAuth2 resource');
    }
    this.$.oauth2.path = `oauth2/provider/${this.providerId}`;
    return this.$.oauth2.get().then((response) => {
      this.clientId = response.clientId;
      this.authorizationURL = response.authorizationURL;
      this.isUserAuthorized = response.isAuthorized;
      this.userId = response.userId;
      this.isAvailable = response.isAvailable;
    });
  },

  getToken() {
    if (!this.$.oauth2) {
      throw new Error('Missing OAuth2 resource');
    }
    this.$.oauth2.path = `oauth2/provider/${this.providerId}/token`;
    return this.$.oauth2.get();
  },

  // extension point
  openPicker() {
    throw new Error('not implemented');
  },
};
