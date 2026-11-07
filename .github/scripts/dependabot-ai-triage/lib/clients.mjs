import { request } from './util.mjs';

const MAX_PAGES = 50;

/** Parses the `rel="next"` target of a GitHub Link header without regular expressions. */
export function nextLink(header) {
  for (const part of (header ?? '').split(',')) {
    const [target, ...params] = part.split(';').map((piece) => piece.trim());
    if (params.includes('rel="next"') && target.startsWith('<') && target.endsWith('>')) {
      return target.slice(1, -1);
    }
  }
  return null;
}

export function githubClient(token) {
  const headers = { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
  const get = async (target, label, accept) => {
    const url = target.startsWith('https://') ? target : `https://api.github.com${target}`;
    const { data, headers: responseHeaders } = await request({
      service: 'GitHub',
      url,
      headers: { ...headers, ...(accept ? { Accept: accept } : {}) },
      label,
    });
    return { data, link: responseHeaders.get('link') };
  };
  const alertPages = async (repo, target, collected, pages) => {
    if (pages >= MAX_PAGES) {
      throw new Error(`Alert pagination for ${repo} exceeded ${MAX_PAGES} pages`);
    }
    const { data, link } = await get(target, `${repo} alerts page ${pages + 1}`);
    if (!Array.isArray(data)) {
      throw new TypeError(`GitHub returned a non-list alerts page for ${repo}`);
    }
    const next = nextLink(link);
    const alerts = [...collected, ...data];
    return next ? alertPages(repo, next, alerts, pages + 1) : { alerts, pages: pages + 1 };
  };
  return {
    /** Every open alert, following Link pagination. Throws instead of returning a partial list. */
    openAlerts(repo) {
      return alertPages(repo, `/repos/${repo}/dependabot/alerts?state=open&per_page=100`, [], 0);
    },
    async alert(repo, number) {
      return (await get(`/repos/${repo}/dependabot/alerts/${number}`, `${repo} alert lookup`)).data;
    },
    async branchSha(repo, branch) {
      const { data } = await get(`/repos/${repo}/branches/${encodeURIComponent(branch)}`, `${repo} branch lookup`);
      return data.commit.sha;
    },
    /** Parsed JSON file at a commit, or null when the file does not exist there. */
    async jsonFile(repo, sha, file) {
      const encoded = file.split('/').map(encodeURIComponent).join('/');
      try {
        const target = `/repos/${repo}/contents/${encoded}?ref=${sha}`;
        return (await get(target, `${repo} file read`, 'application/vnd.github.raw+json')).data;
      } catch (error) {
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    },
  };
}

export function npmClient() {
  const cache = new Map();
  return {
    packument(name) {
      if (!cache.has(name)) {
        const url = `https://registry.npmjs.org/${name.replaceAll('/', '%2F')}`;
        const pending = request({
          service: 'npm',
          url,
          headers: { Accept: 'application/vnd.npm.install-v1+json' },
          label: 'registry metadata',
        }).then(({ data }) => data);
        cache.set(name, pending);
      }
      return cache.get(name);
    },
  };
}

export function jiraClient({ site, email, token }) {
  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const call = async (method, target, body, label) => {
    const { data } = await request({
      service: 'Jira',
      url: `${site}/rest/api/3${target}`,
      method,
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body,
      label,
    });
    return data;
  };
  const searchPages = async (query, collected, page, nextPageToken) => {
    if (page >= MAX_PAGES) {
      throw new Error(`Jira search exceeded ${MAX_PAGES} pages`);
    }
    const body = { ...query, maxResults: 100, ...(nextPageToken ? { nextPageToken } : {}) };
    const data = await call('POST', '/search/jql', body, 'issue search');
    const issues = [...collected, ...(data.issues ?? [])];
    if (data.isLast !== false) {
      return issues;
    }
    if (!data.nextPageToken) {
      throw new Error('Jira search reported more pages without a page token');
    }
    return searchPages(query, issues, page + 1, data.nextPageToken);
  };
  const metadataPages = async (project, issueTypeId, collected, startAt) => {
    const target = `/issue/createmeta/${project}/issuetypes/${issueTypeId}?startAt=${startAt}&maxResults=200`;
    const data = await call('GET', target, undefined, 'create metadata');
    const page = data.fields ?? data.values ?? [];
    const fields = [...collected, ...page];
    return page.length < 200 ? fields : metadataPages(project, issueTypeId, fields, startAt + 200);
  };
  return {
    call,
    /** Complete JQL result; throws on missing pages rather than returning a partial list. */
    search(jql, fields, properties = []) {
      return searchPages({ jql, fields, properties }, [], 0, null);
    },
    issue(key, fields, properties = []) {
      const propertyQuery = properties.length ? `&properties=${properties.join(',')}` : '';
      return call('GET', `/issue/${key}?fields=${fields.join(',')}${propertyQuery}`, undefined, 'issue read');
    },
    async recentComments(key, limit = 10) {
      const data = await call(
        'GET',
        `/issue/${key}/comment?orderBy=-created&maxResults=${limit}`,
        undefined,
        'comments',
      );
      return data.comments ?? [];
    },
    async property(key, name) {
      try {
        return (await call('GET', `/issue/${key}/properties/${name}`, undefined, 'property read')).value;
      } catch (error) {
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    setProperty(key, name, value) {
      return call('PUT', `/issue/${key}/properties/${name}`, value, 'property write');
    },
    deleteProperty(key, name) {
      return call('DELETE', `/issue/${key}/properties/${name}`, undefined, 'property delete');
    },
    create(fields) {
      return call('POST', '/issue', { fields }, 'issue create');
    },
    edit(key, fields) {
      return call('PUT', `/issue/${key}`, { fields }, 'issue edit');
    },
    addLabel(key, label) {
      return call('PUT', `/issue/${key}`, { update: { labels: [{ add: label }] } }, 'label add');
    },
    addComment(key, body) {
      return call('POST', `/issue/${key}/comment`, { body }, 'comment create');
    },
    async transitions(key) {
      return (await call('GET', `/issue/${key}/transitions`, undefined, 'transitions')).transitions ?? [];
    },
    transition(key, id) {
      return call('POST', `/issue/${key}/transitions`, { transition: { id } }, 'transition');
    },
    link(type, inwardKey, outwardKey) {
      const body = { type: { name: type }, inwardIssue: { key: inwardKey }, outwardIssue: { key: outwardKey } };
      return call('POST', '/issueLink', body, 'issue link');
    },
    createFields(project, issueTypeId) {
      return metadataPages(project, issueTypeId, [], 0);
    },
  };
}
