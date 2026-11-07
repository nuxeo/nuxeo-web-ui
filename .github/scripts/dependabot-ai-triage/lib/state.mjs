export const STATE_PROPERTY = 'dependabot-ai-triage-state';
export const JOURNAL_PROPERTY = 'dependabot-ai-triage-journal';
const LOCK_STALE_HOURS = 6;
const JOURNAL_BUDGET = 28000;
const RESOLVED = new Set(['done', 'failed', 'not-applied']);

export class LockHeldError extends Error {}

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
    this.state = { schemaVersion: 1, ...this.state, ...changes };
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

  pending() {
    return this.journal.entries.filter((entry) => entry.status === 'reserved');
  }

  find(id) {
    return this.journal.entries.find((entry) => entry.id === id);
  }

  async persistJournal() {
    // Keep the property under Jira's size limit by dropping the oldest resolved entries. Reserved and uncertain
    // entries are kept: they are what stops an interrupted write (or Teams send) from being repeated.
    while (JSON.stringify(this.journal).length > JOURNAL_BUDGET) {
      const index = this.journal.entries.findIndex((entry) => RESOLVED.has(entry.status));
      if (index < 0) {
        throw new Error('Action journal is full of unresolved writes; manual reconciliation required.');
      }
      this.journal.entries.splice(index, 1);
    }
    await this.jira.setProperty(this.issueKey, JOURNAL_PROPERTY, this.journal);
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
