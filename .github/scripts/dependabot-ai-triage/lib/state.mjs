export const STATE_PROPERTY = 'dependabot-ai-triage-state';
export const JOURNAL_PROPERTY = 'dependabot-ai-triage-journal';
// One property per run (`<prefix>-<runId>`) so a later run never overwrites a card awaiting a retried delivery.
export const CARD_PROPERTY = 'dependabot-ai-triage-teams-card';
// GitHub allows re-running a workflow run for 30 days; delivery records must outlive that window.
const RETRY_WINDOW_MS = 30 * 864e5;
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
