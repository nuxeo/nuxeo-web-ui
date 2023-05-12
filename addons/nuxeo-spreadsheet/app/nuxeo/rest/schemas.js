/*
 * ©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
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
 */
import { Request } from './request';

const PATH = '/config/schemas/';

/**
 * REST Schemas
 */
class Schemas extends Request {
  constructor(connection) {
    super(connection, PATH);
  }

  fetch(schemas) {
    const data = [];
    return this.execute().then((entries) => {
      for (const entry of entries) {
        const key = entry['@prefix'] || entry.name;
        if (schemas.indexOf(key) !== -1) {
          data[key] = { name: entry.name };
        }
      }

      const promises = schemas.map((s) => this._fetchFieldsBySchema(data[s].name));

      return Promise.all(promises).then((values) => {
        for (const value of values) {
          const key = value['@prefix'] || value.name;
          data[key].fields = value.fields;
        }
        return data;
      });
    });
  }

  _fetchFieldsBySchema(schema) {
    return this.execute('get', `${PATH}/${schema}`, { 'fetch.schema': 'fields' });
  }
}

export { Schemas };
