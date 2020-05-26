/*
 * (C) Copyright 2014 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Nelson Silva <nsilva@nuxeo.com>
 */

/**
 * Wrapper for nuxeo.Request
 */
class Request {
  constructor(conn, path = '') {
    this.path = path;
    this.conn = conn;
    this._params = {};
    this._headers = {};
  }

  get params() {
    return this._params;
  }

  get headers() {
    return this._headers;
  }

  set enrichers(lst) {
    this.headers['enrichers-document'] = lst.join(',');
  }

  execute(method = 'get', path, params = {}) {
    return this.conn
      .request(path || this.path)
      .repositoryName(undefined)
      .headers(this._headers)
      .queryParams(Object.assign({}, this._params, params))
      [method]();
  }
}

export { Request };
