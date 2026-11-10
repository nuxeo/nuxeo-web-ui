import { mapSequential } from './util.mjs';

export const STATE_PROPERTY = 'dependabot-ai-triage-state';
export const JOURNAL_PROPERTY = 'dependabot-ai-triage-journal';
// Alerts already reported as closed on GitHub: an index property plus shards of exact per-repository ranges.
export const CLEARED_PROPERTY = 'dependabot-ai-triage-cleared';
// Jira issue properties are limited to 32 768 bytes.
const PROPERTY_BUDGET = 28000;
// One property per run (`<prefix>-<runId>`) so a later run never overwrites a card awaiting a retried delivery.
export const CARD_PROPERTY = 'dependabot-ai-triage-teams-card';
// GitHub allows re-running a workflow run for 30 days; delivery records must outlive that window.
const RETRY_WINDOW_MS = 30 * 864e5;
const LOCK_STALE_HOURS = 6;
const JOURNAL_BUDGET = 28000;
const RESOLVED = new Set(['done', 'failed', 'not-applied']);

export class LockHeldError extends Error {}

function splitId(id) {
  const index = id.lastIndexOf('#');
  return [id.slice(0, index), Number(id.slice(index + 1))];
}

/** Exact membership: closures are kept as sorted, merged [start, end] ranges per repository. */
export function isClearedReported(record, id) {
  const [repository, number] = splitId(id);
  return (record?.repositories?.[repository] ?? []).some(([start, end]) => number >= start && number <= end);
}

function mergeRanges(ranges) {
  const merged = [];
  for (const range of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }
  return merged;
}

export function addCleared(record, ids) {
  const next = { repositories: structuredClone(record?.repositories ?? {}) };
  for (const id of ids) {
    const [repository, number] = splitId(id);
    next.repositories[repository] = mergeRanges([...(next.repositories[repository] ?? []), [number, number]]);
  }
  return next;
}

/** Splits a closure record into parts that each fit in one Jira issue property. */
export function shardCleared(record, budget = PROPERTY_BUDGET) {
  const shards = [];
  let current = { repositories: {} };
  for (const [repository, ranges] of Object.entries(record.repositories)) {
    for (const range of ranges) {
      const candidate = structuredClone(current);
      candidate.repositories[repository] = [...(candidate.repositories[repository] ?? []), range];
      if (JSON.stringify(candidate).length > budget && Object.keys(current.repositories).length) {
        shards.push(current);
        current = { repositories: { [repository]: [range] } };
      } else {
        current = candidate;
      }
    }
  }
  shards.push(current);
  return shards;
}

/** Run state kept on the private control issue (Jira issue properties are not shown in the UI). */
export class ControlState {
  constructor(jira, issueKey) {
    this.jira = jira;
    this.issueKey = issueKey;
    this.state = null;
    this.journal = null;
  }

  async load() {
    this.state = await this.jira.property(this.issueKey, STATE_PROPERTY);
    this.journal = (await this.jira.property(this.issueKey, JOURNAL_PROPERTY)) ?? { schemaVersion: 1, entries: [] };
    return this.state;
  }

  async saveState(changes) {
    const next = { schemaVersion: 1, ...this.state, ...changes };
    if (JSON.stringify(next).length > PROPERTY_BUDGET) {
      throw new Error('Run state would exceed the Jira property size limit; it was not saved.');
    }
    this.state = next;
    await this.jira.setProperty(this.issueKey, STATE_PROPERTY, this.state);
  }

  /**
   * Best-effort cross-run lock. The workflow concurrency group is the primary guard; this protects
   * against a manual run from another ref or a stuck run whose job was cancelled mid-write.
   */
  async acquireLock(runId, now = new Date()) {
    const lock = this.state?.lock;
    if (lock && lock.runId !== runId) {
      const ageHours = (now.getTime() - Date.parse(lock.acquiredAt)) / 3.6e6;
      if (ageHours < LOCK_STALE_HOURS) {
        throw new LockHeldError(`Run ${lock.runId} holds the triage lock (acquired ${lock.acquiredAt}).`);
      }
    }
    await this.saveState({ lock: { runId, acquiredAt: now.toISOString() } });
    const verified = await this.jira.property(this.issueKey, STATE_PROPERTY);
    if (verified?.lock?.runId !== runId) {
      throw new LockHeldError('Another run replaced the triage lock.');
    }
  }

  async releaseLock(runId) {
    await this.load();
    if (this.state?.lock?.runId === runId) {
      await this.saveState({ lock: null });
    }
  }

  /** Keeps the Teams card of a run so a retried delivery sends exactly what that run reported. */
  storeCard(runId, card) {
    return this.jira.setProperty(this.issueKey, `${CARD_PROPERTY}-${runId}`, { runId, card });
  }

  async storedCard(runId) {
    const stored = await this.jira.property(this.issueKey, `${CARD_PROPERTY}-${runId}`);
    return stored?.runId === runId ? stored.card : null;
  }

  /** Best effort: a delivered card is no longer needed. */
  async discardCard(runId) {
    try {
      await this.jira.deleteProperty(this.issueKey, `${CARD_PROPERTY}-${runId}`);
    } catch {
      // A leftover card is harmless; it is only read for a retry of the same run.
    }
  }

  /** Reserved writes, plus unknown outcomes that can be reconciled from Jira (every Jira write records how). */
  pending() {
    return this.journal.entries.filter(
      (entry) => entry.status === 'reserved' || (entry.status === 'uncertain' && entry.recovery),
    );
  }

  /** Closure history: an index property names how many shard properties hold the ranges. */
  async loadCleared() {
    const index = await this.jira.property(this.issueKey, CLEARED_PROPERTY);
    const names = Array.from({ length: index?.shards ?? 0 }, (_, i) => `${CLEARED_PROPERTY}-${i}`);
    const parts = await Promise.all(names.map((name) => this.jira.property(this.issueKey, name)));
    const record = { repositories: {} };
    for (const [repository, ranges] of parts.flatMap((part) => Object.entries(part?.repositories ?? {}))) {
      record.repositories[repository] = mergeRanges([...(record.repositories[repository] ?? []), ...ranges]);
    }
    return record;
  }

  /** Adds newly reported closures; shards are written before the index that makes them visible. */
  async saveCleared(ids) {
    const record = addCleared(await this.loadCleared(), ids);
    const shards = shardCleared(record);
    await mapSequential(shards, (shard, i) => this.jira.setProperty(this.issueKey, `${CLEARED_PROPERTY}-${i}`, shard));
    await this.jira.setProperty(this.issueKey, CLEARED_PROPERTY, { schemaVersion: 2, shards: shards.length });
    return record;
  }

  find(id) {
    return this.journal.entries.find((entry) => entry.id === id);
  }

  async persistJournal() {
    // Keep the property under Jira's size limit by dropping the oldest resolved entries. Reserved and uncertain
    // entries are kept: they are what stops an interrupted write (or Teams send) from being repeated.
    while (JSON.stringify(this.journal).length > JOURNAL_BUDGET) {
      const index = this.journal.entries.findIndex((entry) => this.prunable(entry));
      if (index < 0) {
        throw new Error('Action journal is full of unresolved writes; manual reconciliation required.');
      }
      this.journal.entries.splice(index, 1);
    }
    await this.jira.setProperty(this.issueKey, JOURNAL_PROPERTY, this.journal);
  }

  /** Resolved entries may go, except Teams delivery records that a re-run of their workflow run still needs. */
  prunable(entry, now = Date.now()) {
    if (!RESOLVED.has(entry.status)) {
      return false;
    }
    return entry.kind !== 'teams' || now - Date.parse(entry.settledAt ?? entry.at ?? 0) > RETRY_WINDOW_MS;
  }

  /** Records intent before a remote write, so an interrupted write is reconciled instead of repeated. */
  async reserve(entry) {
    const existing = this.find(entry.id);
    if (existing) {
      return existing;
    }
    const record = { ...entry, status: 'reserved', at: new Date().toISOString() };
    this.journal.entries.push(record);
    await this.persistJournal();
    return record;
  }

  async settle(id, status, result = {}) {
    const record = this.find(id);
    Object.assign(record, { status, result, settledAt: new Date().toISOString() });
    await this.persistJournal();
    return record;
  }
}
