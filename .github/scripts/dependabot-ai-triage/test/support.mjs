// Shared test doubles: a test configuration and an in-memory Jira with the REST behaviour the executor relies on.
import { Executor } from '../apply.mjs';
import { OWNERSHIP_PROPERTY } from '../lib/reconcile.mjs';
import { ControlState } from '../lib/state.mjs';
import { EL, RUN, WEB, group, liveAlerts } from './fixtures.mjs';

export const config = {
  jiraSite: 'https://jira.example',
  controlIssue: 'APP-99',
  issueTypeId: '10004',
  severityField: 'customfield_12201',
  severityOptions: { critical: '13603', high: '15789', medium: '15790', low: '15791' },
  holdStatus: 'On Hold',
  linkType: 'Relates',
  labels: ['Security', 'dependabot'],
  epic: 'EPIC-1',
  epicQuarter: '2026-Q4',
  timezone: 'Asia/Kolkata',
  repositories: [
    { name: WEB, project: 'APP', component: 'Web UI', labels: ['WebUI'], branches: ['develop-2025', 'develop-2023'] },
    {
      name: EL,
      project: 'LIB',
      component: 'CI/CD',
      labels: ['lib'],
      branches: ['develop-2025', 'develop-2023'],
    },
  ],
  repositoryConfig(name) {
    return this.repositories.find((repo) => repo.name === name);
  },
  severityOf(id) {
    return Object.keys(this.severityOptions).find((severity) => this.severityOptions[severity] === id) ?? null;
  },
};
export const severityId = (severity) => config.severityOptions[severity];

/** In-memory Jira with the subset of REST behaviour the executor relies on. */
export class FakeJira {
  constructor(tickets = []) {
    this.issues = new Map();
    this.calls = [];
    this.next = 3000;
    this.failNext = null;
    for (const ticket of tickets) {
      this.issues.set(ticket.key, {
        key: ticket.key,
        fields: {
          status: { name: ticket.status, statusCategory: { key: ticket.statusCategory } },
          labels: [...ticket.labels],
          [config.severityField]: { id: severityId(ticket.severity) },
          parent: { key: 'EPIC-1' },
        },
        properties: ticket.ownership ? { [OWNERSHIP_PROPERTY]: structuredClone(ticket.ownership) } : {},
        comments: [],
      });
    }
    this.issues.set('APP-99', {
      key: 'APP-99',
      fields: { status: { name: 'Open' }, labels: [] },
      properties: {},
      comments: [],
    });
  }

  record(name, args) {
    this.calls.push({ name, args });
    if (this.failNext && this.failNext.name === name) {
      const error = new Error(`${name} failed`);
      Object.assign(error, this.failNext.error);
      this.failNext = null;
      throw error;
    }
  }

  async issue(key, fields, properties = []) {
    const issue = this.issues.get(key);
    return {
      key,
      fields: issue.fields,
      properties: Object.fromEntries(properties.map((name) => [name, issue.properties[name]])),
    };
  }

  async search(jql) {
    this.searches = [...(this.searches ?? []), jql];
    const label = /labels = "([^"]+)"/.exec(jql)[1];
    return [...this.issues.values()]
      .filter((issue) => issue.fields.labels.includes(label))
      .map(({ key, fields, properties }) => {
        return { key, fields, properties: structuredClone(properties) };
      });
  }

  async create(fields) {
    this.record('create', fields);
    const key = `${fields.project.key}-${this.next++}`;
    this.issues.set(key, {
      key,
      fields: { ...fields, status: { name: 'Open', statusCategory: { key: 'new' } } },
      properties: {},
      comments: [],
    });
    return { key };
  }

  async property(key, name) {
    return this.issues.get(key).properties[name] || null;
  }

  async deleteProperty(key, name) {
    this.record('deleteProperty', { key, name });
    delete this.issues.get(key).properties[name];
  }

  async setProperty(key, name, value) {
    this.record('setProperty', { key, name });
    this.issues.get(key).properties[name] = structuredClone(value);
  }

  async edit(key, fields) {
    this.record('edit', { key, fields });
    Object.assign(this.issues.get(key).fields, fields);
  }

  async addLabel(key, label) {
    this.record('addLabel', { key, label });
    this.issues.get(key).fields.labels.push(label);
  }

  async addComment(key, body) {
    this.record('addComment', { key });
    this.issues.get(key).comments.push(body);
  }

  async transitions() {
    return this.noHoldTransition ? [] : [{ id: '91', to: { name: 'On Hold' } }];
  }

  async transition(key) {
    this.record('transition', { key });
    this.issues.get(key).fields.status = { name: 'On Hold' };
  }

  async link(type, inward, outward) {
    this.record('link', { type, inward, outward });
  }
}

export function inventoryFor(tickets, overrides = {}) {
  const alerts = liveAlerts();
  return {
    runId: RUN,
    alerts,
    tickets,
    evidence: {},
    currentOwner: {},
    previousState: null,
    ...overrides,
  };
}

export function newOutcome() {
  return { actions: [], failures: [], warnings: [], severityRaises: [] };
}

export async function executor(jira, tickets, overrides) {
  const control = new ControlState(jira, 'APP-99');
  await control.load();
  const outcome = newOutcome();
  return {
    exec: new Executor({ jira, control, config, inventory: inventoryFor(tickets, overrides), outcome }),
    outcome,
    control,
  };
}

export const createGroup = () => group(`${EL}:pkg-match-globparts`, EL, 'create', undefined, 'medium', [108]);
