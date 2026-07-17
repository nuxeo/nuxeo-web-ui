#!/usr/bin/env node
/**
 * Scans open pull requests across one or more GitHub repositories and posts the
 * ones that still need review to a Microsoft Teams channel.
 *
 * "Still needs review" means, for an open, non-draft PR whose checks are all
 * green: it is NOT (approved by the lead) AND NOT (approved by >= 2 non-lead
 * developers). PRs that already satisfy either of those are considered
 * sufficiently reviewed and are skipped.
 *
 * The Teams message is an Adaptive Card wrapped in the envelope expected by a
 * Power Automate "Workflows" incoming webhook (the successor to the retired
 * Office 365 connector webhooks).
 *
 * Configuration (environment variables):
 *   GH_TOKEN               GitHub token with read access to all scanned repos (required).
 *   TEAMS_WEBHOOK_URL      Power Automate Workflows webhook URL (required unless DRY_RUN).
 *   PR_REVIEW_LEAD_LOGIN   GitHub login of the lead reviewer (required).
 *   SCAN_REPOS             Comma-separated owner/name list.
 *                          Default: nuxeo/nuxeo-web-ui,nuxeo/nuxeo-elements
 *   REQUIRE_ALL_CHECKS     'true' (default) requires the check rollup to be SUCCESS.
 *   SKIP_CHANGES_REQUESTED 'true' (default) skips PRs with an outstanding
 *                          CHANGES_REQUESTED review (waiting on the author, not reviewers).
 *   ALLOWED_BASE_BRANCHES  Comma-separated base branches to include; PRs targeting anything
 *                          else are skipped. Default: lts-2025,maintenance-3.1.x
 *                          Set to empty to include every base branch.
 *   SKIP_BOTS              'true' (default) skips PRs authored by bot accounts (any login
 *                          ending in [bot], plus dependabot / github-actions / crowdin).
 *   SKIP_TITLE_REGEX       Case-insensitive regex; PRs whose title matches are skipped.
 *                          Default: 'bump |crowdin' (Dependabot bumps + Crowdin syncs).
 *                          Set to empty to disable title filtering.
 *   SKIP_CONFLICTS         'true' (default) skips PRs with merge conflicts (mergeable = CONFLICTING).
 *   SKIP_UNRESOLVED_COPILOT 'true' (default) skips PRs with an unresolved Copilot review comment.
 *   COPILOT_LOGIN_REGEX    Case-insensitive regex matching the Copilot reviewer login.
 *                          Default: 'copilot'.
 *   DONT_MERGE_LABEL_REGEX Case-insensitive regex; PRs with a matching label are skipped.
 *                          Default: "do\\s*n'?t\\s*merge|do\\s*not\\s*merge".
 *   MAX_NEW_ISSUES         Skip PRs whose SonarCloud "New issues" count exceeds this. Default 0.
 *   MIN_NEW_COVERAGE       Skip PRs whose SonarCloud "Coverage on New Code" is below this %.
 *                          Default 90.
 *   SONAR_MISSING_POLICY   What to do when a PR has no SonarCloud comment / metric:
 *                          'include' (default) keeps it, 'exclude' drops it.
 *   POST_WHEN_EMPTY        'true' posts an "all caught up" card when nothing qualifies.
 *                          Default 'false' (stay quiet).
 *   MAX_PRS                Max PRs listed on the card (rest summarised as "+N more").
 *                          Default 50. Keeps the payload under the Teams card size limit.
 *   DRY_RUN                'true' prints the payload instead of posting to Teams.
 */

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const env = (name, fallback = undefined) => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const asBool = (value, fallback) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const buildRegex = (pattern, label) => {
  const trimmed = (pattern || '').trim();
  if (!trimmed) return null;
  try {
    return new RegExp(trimmed, 'i');
  } catch (error) {
    console.error(`::warning::Invalid ${label} "${trimmed}" (${error.message}); this filter is disabled.`);
    return null;
  }
};

const asNumber = (value, fallback) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

// Parses the SonarCloud PR comment (posted by sonarqubecloud[bot]) for the metrics we gate on.
const parseSonar = (comments) => {
  const sonar = [...comments].reverse().find((c) => /sonar/i.test(c.author?.login || ''));
  if (!sonar) return { present: false, newIssues: null, coverage: null };
  const body = sonar.body || '';
  const issuesMatch = body.match(/\[(\d+)\s+New issues?\]/i);
  const coverageMatch = body.match(/\[([\d.]+)%\s+Coverage on New Code\]/i);
  return {
    present: true,
    newIssues: issuesMatch ? Number.parseInt(issuesMatch[1], 10) : null,
    coverage: coverageMatch ? Number.parseFloat(coverageMatch[1]) : null,
  };
};

// Logins treated as bots in addition to any login ending in "[bot]".
const BOT_LOGINS = new Set(['dependabot', 'dependabot[bot]', 'github-actions[bot]', 'crowdin-bot', 'crowdin[bot]']);

const isBotAuthor = (login) => {
  if (!login) return false;
  const lower = login.toLowerCase();
  return lower.endsWith('[bot]') || BOT_LOGINS.has(lower);
};

const config = {
  token: env('GH_TOKEN'),
  webhookUrl: env('TEAMS_WEBHOOK_URL'),
  leadLogin: (env('PR_REVIEW_LEAD_LOGIN') || '').trim(),
  repos: (env('SCAN_REPOS', 'nuxeo/nuxeo-web-ui,nuxeo/nuxeo-elements') || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean),
  requireAllChecks: asBool(env('REQUIRE_ALL_CHECKS'), true),
  skipChangesRequested: asBool(env('SKIP_CHANGES_REQUESTED'), true),
  allowedBaseBranches: (env('ALLOWED_BASE_BRANCHES', 'lts-2025,maintenance-3.1.x') || '')
    .split(',')
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean),
  skipBots: asBool(env('SKIP_BOTS'), true),
  titleSkipRegex: buildRegex(env('SKIP_TITLE_REGEX', 'bump |crowdin'), 'SKIP_TITLE_REGEX'),
  skipConflicts: asBool(env('SKIP_CONFLICTS'), true),
  skipUnresolvedCopilot: asBool(env('SKIP_UNRESOLVED_COPILOT'), true),
  copilotRegex: buildRegex(env('COPILOT_LOGIN_REGEX', 'copilot'), 'COPILOT_LOGIN_REGEX'),
  dontMergeRegex: buildRegex(
    env('DONT_MERGE_LABEL_REGEX', "do\\s*n'?t\\s*merge|do\\s*not\\s*merge"),
    'DONT_MERGE_LABEL_REGEX',
  ),
  maxNewIssues: asNumber(env('MAX_NEW_ISSUES', '0'), 0),
  minCoverage: asNumber(env('MIN_NEW_COVERAGE', '90'), 90),
  sonarMissingPolicy: (env('SONAR_MISSING_POLICY', 'include') || 'include').toLowerCase(),
  postWhenEmpty: asBool(env('POST_WHEN_EMPTY'), false),
  maxPrs: Math.max(1, Number.parseInt(env('MAX_PRS', '50'), 10) || 50),
  dryRun: asBool(env('DRY_RUN'), false),
};

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

if (!config.token) fail('GH_TOKEN is not set.');
if (!config.leadLogin) fail('PR_REVIEW_LEAD_LOGIN is not set.');
if (!config.dryRun && !config.webhookUrl) fail('TEAMS_WEBHOOK_URL is not set.');
if (config.repos.length === 0) fail('SCAN_REPOS resolved to an empty list.');

const PR_QUERY = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: OPEN, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          number
          title
          url
          isDraft
          updatedAt
          baseRefName
          mergeable
          author { login }
          labels(first: 20) {
            nodes { name }
          }
          latestOpinionatedReviews(first: 100) {
            nodes {
              state
              author { login }
            }
          }
          reviewThreads(first: 100) {
            nodes {
              isResolved
              comments(first: 1) {
                nodes { author { login } }
              }
            }
          }
          comments(last: 30) {
            nodes {
              author { login }
              body
            }
          }
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup { state }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchRepoPullRequests(owner, name) {
  const response = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'pr-review-reminder',
    },
    body: JSON.stringify({ query: PR_QUERY, variables: { owner, name } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${owner}/${name} responded ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(`GitHub GraphQL error for ${owner}/${name}: ${JSON.stringify(payload.errors)}`);
  }
  if (!payload.data || !payload.data.repository) {
    throw new Error(`No repository data returned for ${owner}/${name} (check token access).`);
  }
  return payload.data.repository.pullRequests.nodes;
}

function evaluatePullRequest(pr, repoSlug) {
  if (pr.isDraft) return null;

  if (
    config.allowedBaseBranches.length > 0 &&
    !config.allowedBaseBranches.includes((pr.baseRefName || '').toLowerCase())
  ) {
    return null;
  }

  if (config.skipBots && isBotAuthor(pr.author?.login)) return null;
  if (config.titleSkipRegex && config.titleSkipRegex.test(pr.title)) return null;

  if (config.skipConflicts && pr.mergeable === 'CONFLICTING') return null;

  if (config.dontMergeRegex && (pr.labels?.nodes || []).some((l) => config.dontMergeRegex.test(l.name || ''))) {
    return null;
  }

  if (config.skipUnresolvedCopilot && config.copilotRegex) {
    const hasOpenCopilotThread = (pr.reviewThreads?.nodes || []).some(
      (t) => t.isResolved === false && config.copilotRegex.test(t.comments?.nodes?.[0]?.author?.login || ''),
    );
    if (hasOpenCopilotThread) return null;
  }

  const rollupState = pr.commits.nodes[0]?.commit?.statusCheckRollup?.state ?? null;
  if (config.requireAllChecks && rollupState !== 'SUCCESS') return null;

  const sonar = parseSonar(pr.comments?.nodes || []);
  const sonarMissing = !sonar.present || (sonar.newIssues === null && sonar.coverage === null);
  if (sonarMissing) {
    if (config.sonarMissingPolicy === 'exclude') return null;
  } else {
    if (sonar.newIssues !== null && sonar.newIssues > config.maxNewIssues) return null;
    if (sonar.coverage !== null && sonar.coverage < config.minCoverage) return null;
  }

  const latestByAuthor = pr.latestOpinionatedReviews.nodes;
  const approvers = new Set(
    latestByAuthor.filter((r) => r.state === 'APPROVED' && r.author?.login).map((r) => r.author.login),
  );
  const hasChangesRequested = latestByAuthor.some((r) => r.state === 'CHANGES_REQUESTED');

  if (config.skipChangesRequested && hasChangesRequested) return null;

  const leadLower = config.leadLogin.toLowerCase();
  const leadApproved = [...approvers].some((login) => login.toLowerCase() === leadLower);
  const nonLeadApprovals = [...approvers].filter((login) => login.toLowerCase() !== leadLower).length;

  const sufficientlyReviewed = leadApproved || nonLeadApprovals >= 2;
  if (sufficientlyReviewed) return null;

  return {
    repo: repoSlug,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? 'unknown',
    approvals: approvers.size,
    coverage: sonar.coverage,
    newIssues: sonar.newIssues,
    updatedAt: pr.updatedAt,
  };
}

function buildAdaptiveCard(prs) {
  const shown = prs.slice(0, config.maxPrs);
  const overflow = prs.length - shown.length;

  const body = [
    {
      type: 'TextBlock',
      size: 'Large',
      weight: 'Bolder',
      text: prs.length > 0 ? `PRs ready for review — awaiting approval (${prs.length})` : 'No PRs awaiting review',
      wrap: true,
    },
  ];

  if (prs.length === 0) {
    body.push({
      type: 'TextBlock',
      text: 'All ready-to-review PRs have the required approvals. Nothing pending right now.',
      wrap: true,
      isSubtle: true,
    });
  } else {
    body.push({
      type: 'TextBlock',
      text: 'Checks green, still need a lead approval or 2 developer approvals',
      wrap: true,
      isSubtle: true,
      spacing: 'None',
    });

    for (const [author, authorPrs] of groupByAuthor(shown)) {
      body.push({
        type: 'TextBlock',
        text: `@${author} (${authorPrs.length})`,
        weight: 'Bolder',
        separator: true,
        spacing: 'Medium',
        wrap: true,
      });

      for (const pr of authorPrs) {
        const meta = [`${pr.repo} #${pr.number}`, `${pr.approvals} approval${pr.approvals === 1 ? '' : 's'}`];
        if (pr.coverage !== null && pr.coverage !== undefined) meta.push(`${pr.coverage}% new-code cov`);
        if (pr.newIssues) meta.push(`${pr.newIssues} sonar issue${pr.newIssues === 1 ? '' : 's'}`);

        body.push({
          type: 'Container',
          spacing: 'Small',
          items: [
            {
              type: 'TextBlock',
              text: `[${escapeMd(pr.title)}](${pr.url})`,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: meta.join(' · '),
              isSubtle: true,
              spacing: 'None',
              wrap: true,
            },
          ],
        });
      }
    }

    if (overflow > 0) {
      body.push({
        type: 'TextBlock',
        text: `…and ${overflow} more awaiting review.`,
        isSubtle: true,
        separator: true,
        spacing: 'Medium',
        wrap: true,
      });
    }
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
        },
      },
    ],
  };
}

// Groups PRs by author, preserving the incoming (oldest-first) order within each group,
// and orders the authors by their earliest pending PR.
function groupByAuthor(prs) {
  const groups = new Map();
  for (const pr of prs) {
    if (!groups.has(pr.author)) groups.set(pr.author, []);
    groups.get(pr.author).push(pr);
  }
  return groups;
}

function escapeMd(text) {
  return String(text).replace(/([[\]])/g, '\\$1');
}

async function postToTeams(payload) {
  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Teams webhook responded ${response.status}: ${await response.text()}`);
  }
}

async function main() {
  const pending = [];

  for (const repoSlug of config.repos) {
    const [owner, name] = repoSlug.split('/');
    if (!owner || !name) fail(`Invalid repo entry "${repoSlug}" (expected owner/name).`);
    const nodes = await fetchRepoPullRequests(owner, name);
    for (const pr of nodes) {
      const result = evaluatePullRequest(pr, repoSlug);
      if (result) pending.push(result);
    }
  }

  pending.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  console.log(`Found ${pending.length} PR(s) awaiting review across ${config.repos.join(', ')}.`);
  for (const pr of pending) {
    console.log(` - ${pr.repo} #${pr.number} (${pr.approvals} approval(s)): ${pr.title}`);
  }

  if (pending.length === 0 && !config.postWhenEmpty) {
    console.log('Nothing to post (POST_WHEN_EMPTY is false).');
    return;
  }

  const payload = buildAdaptiveCard(pending);

  if (config.dryRun) {
    console.log('DRY_RUN enabled — payload that would be posted to Teams:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await postToTeams(payload);
  console.log('Posted to Teams.');
}

main().catch((error) => fail(error.message));
