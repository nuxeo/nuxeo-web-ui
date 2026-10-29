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

/** HTTP status the REST API answers with when the submitted change token is stale. */
export const CONFLICT_STATUS = 409;

/**
 * Optimistic locking for document writes.
 *
 * The REST API returns a `changeToken` with every document read and, when the platform runs with
 * `nuxeo.changetoken.enabled=true`, rejects a write whose token no longer matches the stored one
 * with a 409. A payload that carries no token is always accepted, so without this behavior the
 * last writer silently overwrites everybody else.
 *
 * Hosts must supply `notify` (`NotifyBehavior`) and `i18n` (`I18nBehavior`, also mixed in by
 * `FormatBehavior`).
 *
 * @polymerBehavior Nuxeo.OptimisticLockingBehavior
 */
export const NuxeoOptimisticLockingBehavior = {
  /**
   * Adds the loaded document's change token to a document update payload.
   *
   * `doc` defaults to the host's `document`. The token is omitted when the document was read
   * without one, which keeps the request valid against a platform that has optimistic locking
   * turned off.
   */
  withChangeToken(data, doc) {
    const source = doc || this.document;
    if (source?.changeToken) {
      data.changeToken = source.changeToken;
    }
    return data;
  },

  /**
   * Updates document properties with the loaded change token and shared conflict handling.
   *
   * `onSuccess` runs after the host document is refreshed and before `document-updated` fires.
   */
  updateDocumentProperties(properties, onSuccess, doc) {
    const source = doc || this.document;
    this.$.doc.data = this.withChangeToken(
      {
        'entity-type': 'document',
        repository: source.repository,
        uid: source.uid,
        properties,
      },
      source,
    );
    return this.$.doc
      .put()
      .then((response) => {
        this.document = response;
        if (onSuccess) {
          onSuccess(response);
        }
        this.fire('document-updated');
        return response;
      })
      .catch((err) => this.rejectUnlessConflict(err));
  },

  /** Whether a failed document write was rejected because someone else changed the document. */
  isConflictError(error) {
    return !!error && error.status === CONFLICT_STATUS;
  },

  /**
   * Reports a stale-write conflict and reloads the document from the server.
   *
   * Returns whether `error` was a conflict, so a caller that has its own error handling can skip
   * it:
   *
   *     .catch((err) => {
   *       if (this.handleConflictError(err)) {
   *         return;
   *       }
   *       // ...its own handling...
   *     });
   *
   * Callers with nothing else to do should use `rejectUnlessConflict` instead.
   */
  handleConflictError(error) {
    if (!this.isConflictError(error)) {
      return false;
    }
    this.notify({ message: this.i18n('documentUpdate.conflict') });
    // `nuxeo-app` refreshes the current document on `document-updated`, which is what brings the
    // view back in sync with the server.
    this.fire('document-updated');
    return true;
  },

  /**
   * Swallows a conflict (already reported and reloaded) and rethrows anything else, so a caller
   * with no error handling of its own only needs:
   *
   *     .catch((err) => this.rejectUnlessConflict(err));
   */
  rejectUnlessConflict(error) {
    if (!this.handleConflictError(error)) {
      throw error;
    }
  },
};
