/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved.
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Shared template query helpers for WEBUI-1736 accessibility layout tests.
 *
 * These utilities parse a component's declarative template (either a `<dom-module>`
 * HTML file or a `html\`...\`` tagged template literal inside a `.js` element) without
 * instantiating the element, so tests can assert on the static DOM structure.
 */

/** Recursively collect all elements matching selector, descending into <template> content. */
export function queryAllDeep(root, selector) {
  const results = [];
  root.querySelectorAll(selector).forEach((el) => results.push(el));
  root.querySelectorAll('template').forEach((t) => {
    results.push(...queryAllDeep(t.content, selector));
  });
  return results;
}

/**
 * Fetch a `<dom-module>` based element and return its main `<template>` element.
 * @param {string} url the URL of the `.html` file to fetch
 * @param {string} moduleId the id of the `<dom-module>` whose template should be returned
 * @returns {Promise<HTMLTemplateElement>} the `<template>` element (use `.content` to traverse)
 */
export async function loadDomModuleTemplate(url, moduleId) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const selector = `dom-module#${moduleId} template`;
  const tmpl = doc.querySelector(selector);
  if (!tmpl) {
    throw new Error(`Template not found for selector "${selector}" in ${url}`);
  }
  return tmpl;
}

/**
 * Fetch a `.js` element and parse the first `html\`...\`` tagged template literal into DOM.
 * @param {string} url the URL of the `.js` file to fetch
 * @returns {Promise<Element>} a wrapper element containing the parsed template markup
 */
export async function loadHtmlLiteralTemplate(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const jsText = await response.text();
  const htmlTagIdx = jsText.indexOf('html`');
  if (htmlTagIdx === -1) {
    throw new Error(`html\` template literal not found in ${url}`);
  }
  const htmlEndIdx = jsText.indexOf('`', htmlTagIdx + 5);
  if (htmlEndIdx <= htmlTagIdx) {
    throw new Error(`Closing \` for html\` template literal not found in ${url}`);
  }
  const templateHtml = jsText.substring(htmlTagIdx + 5, htmlEndIdx);
  const doc = new DOMParser().parseFromString(`<div>${templateHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) {
    throw new Error(`Failed to parse html\` template literal from ${url}`);
  }
  return root;
}
