#!/usr/bin/env node
/**
 * Scans open pull requests across one or more GitHub repositories and posts the
 * ones that still need review to a Microsoft Teams channel.
 *
 * "Still needs review" means, for an open, non-draft PR whose checks are all
 * green and which carries the configured ready label (default
 * "READY_FOR_REVIEW", see READY_LABEL_NAME below): it is NOT (approved by one
 * of the leads AND approved by >= 2 distinct people overall). A PR is
 * considered sufficiently reviewed and is skipped only once it has an
 * approval from at least one configured lead plus a second, distinct
 * approver -- who may be another lead.
 *
 * The Teams message is an Adaptive Card wrapped in the envelope expected by a
 * Power Automate "Workflows" incoming webhook (the successor to the retired
 * Office 365 connector webhooks).
 *
 * Configuration (environment variables):
 *   GH_TOKEN               GitHub token with read access to all scanned repos (required).
 *   TEAMS_WEBHOOK_URL      Power Automate Workflows webhook URL (required unless DRY_RUN).
 *   PR_REVIEW_LEAD_LOGIN   Comma-separated GitHub login(s) of the lead reviewer(s) (required).
 *                          A PR needs an approval from at least one of these logins, plus a
 *                          second, distinct approver (who may be another lead), to count as
 *                          reviewed.
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
 *   REQUIRE_READY_LABEL    'true' (default) requires PRs to carry the READY_LABEL_NAME label;
 *                          PRs missing it are skipped (not yet marked ready for review).
 *   READY_LABEL_NAME       Exact label name (case-insensitive) required when REQUIRE_READY_LABEL
 *                          is enabled. Default: 'READY_FOR_REVIEW'.
 *   MAX_NEW_ISSUES         Skip PRs whose SonarCloud "New issues" count exceeds this. Default 0.
 *                          Coverage on New Code is gated on SonarCloud's own pass/fail for that
 *                          condition (the red-cross icon), not a raw percentage — so a
 *                          "0.0% accepted" (green check) PR is kept, while a real sub-threshold
 *                          coverage (red cross) is skipped.
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
// SonarCloud's "Clean as You Code" gate treats "0.0% Coverage on New Code" as PASSED (green check,
// there are no new lines that need covering), while real coverage below the project's threshold
// (e.g. 88.5%) FAILS the condition and renders a red-cross icon. The raw percentage alone cannot
// tell these apart (0.0% can be either), so we read the pass/fail icon that precedes each condition.
const parseSonar = (comments) => {
  const sonar = [...comments].reverse().find((c) => /sonar/i.test(c.author?.login || ''));
  if (!sonar) {
    return { present: false, newIssues: null, coverage: null, coverageFailed: null, qualityGatePassed: null };
  }
  const body = sonar.body || '';
  const issuesMatch = body.match(/\[(\d+)\s+New issues?\]/i);
  const coverageMatch = body.match(/\[([\d.]+)%\s+Coverage on New Code\]/i);
  // Capture the status icon (passed-16px.png / failed-16px.png) immediately preceding the
  // "Coverage on New Code" metric on the same line. `[^[]*` spans the " '') " between them.
  const coverageStatus = body.match(/(passed|failed)-16px\.png[^[]*\[[\d.]+%\s+Coverage on New Code\]/i);
  const qualityGate = body.match(/Quality Gate\s+(passed|failed)/i);
  return {
    present: true,
    newIssues: issuesMatch ? Number.parseInt(issuesMatch[1], 10) : null,
    coverage: coverageMatch ? Number.parseFloat(coverageMatch[1]) : null,
    coverageFailed: coverageStatus ? coverageStatus[1].toLowerCase() === 'failed' : null,
    qualityGatePassed: qualityGate ? qualityGate[1].toLowerCase() === 'passed' : null,
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
  leadLogins: (env('PR_REVIEW_LEAD_LOGIN') || '')
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean),
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
  requireReadyLabel: asBool(env('REQUIRE_READY_LABEL'), true),
  readyLabelName: (env('READY_LABEL_NAME', 'READY_FOR_REVIEW') || '').trim(),
  maxNewIssues: asNumber(env('MAX_NEW_ISSUES', '0'), 0),
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
if (config.leadLogins.length === 0) fail('PR_REVIEW_LEAD_LOGIN is not set.');
if (!config.dryRun && !config.webhookUrl) fail('TEAMS_WEBHOOK_URL is not set.');
if (config.repos.length === 0) fail('SCAN_REPOS resolved to an empty list.');
if (config.requireReadyLabel && !config.readyLabelName) {
  fail(
    'READY_LABEL_NAME is empty while REQUIRE_READY_LABEL is enabled. Set a label name or set REQUIRE_READY_LABEL=false.',
  );
}

const PR_QUERY = `
  query($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: OPEN, first: 50, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          isDraft
          updatedAt
          baseRefName
          mergeable
          author { login }
          labels(first: 100) {
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
          comments(first: 100) {
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
  const all = [];
  let cursor = null;

  // Paginate so repos with more than one page of open PRs are fully covered.
  do {
    const response = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'pr-review-reminder',
      },
      body: JSON.stringify({ query: PR_QUERY, variables: { owner, name, cursor } }),
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

    const connection = payload.data.repository.pullRequests;
    all.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  return all;
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
    // Skip only when SonarCloud actually marks "Coverage on New Code" as failing (red cross).
    // A "0.0% accepted" coverage (green check — no new lines to cover) must NOT be skipped.
    const coverageFailing =
      sonar.coverageFailed === true ||
      // Fallback when the coverage icon can't be parsed: trust the overall Quality Gate result.
      (sonar.coverageFailed === null && sonar.qualityGatePassed === false);
    if (coverageFailing) return null;
  }

  const latestByAuthor = pr.latestOpinionatedReviews.nodes;
  const approvers = new Set(
    latestByAuthor.filter((r) => r.state === 'APPROVED' && r.author?.login).map((r) => r.author.login),
  );
  const hasChangesRequested = latestByAuthor.some((r) => r.state === 'CHANGES_REQUESTED');

  if (config.skipChangesRequested && hasChangesRequested) return null;

  const leadApproved = [...approvers].some((login) => config.leadLogins.includes(login.toLowerCase()));

  // Require a lead's approval plus a second, distinct approver -- who may be another lead.
  // Two leads approving is already a stronger signal than "lead + any developer", so it
  // must not be treated as less sufficient than that.
  const sufficientlyReviewed = leadApproved && approvers.size >= 2;
  if (sufficientlyReviewed) return null;

  // Keep the ready-label check last: it's cheap, but evaluating it after the more
  // substantive review/CI/Sonar gates keeps those failure reasons visible first in any
  // future per-condition logging, and avoids masking a "sufficiently reviewed" PR (which
  // should just be silently skipped) behind a "not labeled ready" reason.
  if (config.requireReadyLabel) {
    const hasReadyLabel = (pr.labels?.nodes || []).some(
      (l) => (l.name || '').toLowerCase() === config.readyLabelName.toLowerCase(),
    );
    if (!hasReadyLabel) return null;
  }

  return {
    repo: repoSlug,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? 'unknown',
    approvals: approvers.size,
    approvers: [...approvers],
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
      text: 'Checks green, still need a lead approval plus a second approval',
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
        const approvalLabel =
          pr.approvals > 0
            ? `${pr.approvals} approval${pr.approvals === 1 ? '' : 's'} (${pr.approvers.join(', ')})`
            : '0 approvals';
        const meta = [`${pr.repo} #${pr.number}`, approvalLabel];
        if (pr.coverage !== null && pr.coverage !== undefined) meta.push(`${pr.coverage}% new-code cov`);

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
  // Escape the backslash first (via the character class) so existing backslashes
  // in the input are not mistaken for escape sequences.
  return String(text).replace(/([\\[\]])/g, '\\$1');
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
    const approverStr = pr.approvals > 0 ? ` by ${pr.approvers.join(', ')}` : '';
    console.log(` - ${pr.repo} #${pr.number} (${pr.approvals} approval(s)${approverStr}): ${pr.title}`);
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
