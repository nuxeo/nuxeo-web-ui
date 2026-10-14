/*
 * ©2023 Hyland Software, Inc. and its affiliates. All rights reserved.
 * All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Lesser General Public
 * License (LGPL) version 2.1.
 */

const CONFLICT_STATUS = 409;

/**
 * Stamps the row's current change token onto an update payload.
 *
 * A payload collects its values when the cell is edited but is only sent later, and a save that
 * lands in between bumps the row's token. The token therefore has to be read when the payload is
 * submitted, not when it is built, or the next write is rejected as a stale one of our own.
 */
export function stampChangeToken(dirtyDocument, document) {
  if (document?.changeToken) {
    dirtyDocument.changeToken = document.changeToken;
  }
  return dirtyDocument;
}

export function createDirtyDocument(document) {
  return stampChangeToken(
    {
      'entity-type': 'document',
      uid: document.uid,
    },
    document,
  );
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

/**
 * Takes the pending updates out of `dirty` and returns them as the batch to send.
 *
 * Edits reuse whatever entry they find for a row, so an entry left in place while its request is
 * running would be mutated after it had already been serialized, and then dropped when the request
 * cleared the row. Vacating the slots means a later edit opens a fresh entry that survives the
 * save in flight and is picked up by the next one.
 */
export function detachDirtyBatch(dirty) {
  const batch = Object.entries(dirty);
  batch.forEach(([uid]) => delete dirty[uid]);
  return batch;
}

/**
 * Puts a payload that failed to save back into `dirty`, so the row stays flagged and its values
 * are retried instead of being lost with the request.
 *
 * An edit made while the request was running has already opened a fresh entry. Its values are the
 * newer ones, so they win, and they inherit the error that `dirtyRenderer` paints the row with.
 */
export function restoreUnsavedRow(dirty, uid, dirtyDocument) {
  const newerEdit = dirty[uid];
  dirty[uid] = newerEdit ? Object.assign(dirtyDocument, newerEdit) : dirtyDocument;
}
