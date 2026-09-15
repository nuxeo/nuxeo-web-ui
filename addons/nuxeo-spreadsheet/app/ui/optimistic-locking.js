/*
 * ©2023 Hyland Software, Inc. and its affiliates. All rights reserved.
 * All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Lesser General Public
 * License (LGPL) version 2.1.
 */

const CONFLICT_STATUS = 409;

export function createDirtyDocument(document) {
  const dirtyDocument = {
    'entity-type': 'document',
    uid: document.uid,
  };
  if (document.changeToken) {
    dirtyDocument.changeToken = document.changeToken;
  }
  return dirtyDocument;
}

/**
 * Copies the change token the server returned for a saved row back onto the loaded document.
 *
 * The spreadsheet never refetches after a save, so without this the row keeps the token it was
 * originally fetched with. Because supplying a token bumps the user half of it, the next edit to
 * that same row would be rejected as a stale write even though nobody else touched it.
 */
export function applySavedChangeToken(document, response) {
  if (document && response?.changeToken) {
    document.changeToken = response.changeToken;
  }
}

export function markSaveError(dirtyDocument, error) {
  dirtyDocument._error = error;
  return error?.status === CONFLICT_STATUS;
}
