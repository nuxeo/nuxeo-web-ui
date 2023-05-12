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
 */

export function i18n(key) {
  // XXX: cheating a bit and reusing top level i18n
  const nuxeo = (window.parent || window).nuxeo;
  return (nuxeo && nuxeo.I18n && nuxeo.I18n.translate && nuxeo.I18n.translate(`spreadsheet.${key}`)) || key;
}
