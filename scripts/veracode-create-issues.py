#!/usr/bin/env python3
"""
Create or update GitHub issues based on Veracode findings.
This script reads the Veracode results and creates/updates GitHub issues accordingly.
"""

import os
import sys
import json
import hashlib
from datetime import datetime
import requests


def get_existing_issues(repo, token):
    """Fetch existing Veracode issues from GitHub."""
    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    params = {
        'labels': 'veracode,security',
        'state': 'all',
        'per_page': 100
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error fetching existing issues: {e}")
        return []


def create_issue_hash(finding):
    """Create a unique hash for a finding to detect duplicates."""
    # Hash based on file, line, CWE, and title
    hash_string = f"{finding['file']}:{finding['line']}:{finding['cwe_id']}:{finding['title']}"
    return hashlib.md5(hash_string.encode()).hexdigest()[:12]


def format_severity_emoji(severity):
    """Get emoji for severity level."""
    emoji_map = {
        'Critical': '🔴',
        'High': '🟠',
        'Medium': '🟡',
        'Low': '🔵',
        'Informational': '⚪'
    }
    return emoji_map.get(severity, '⚫')


def create_issue_body(finding, branch_name):
    """Create formatted issue body."""
    severity_emoji = format_severity_emoji(finding['severity'])

    body = f"""## Veracode Security Finding

**Severity**: {severity_emoji} {finding['severity']}
**CWE**: CWE-{finding['cwe_id']} ({finding['cwe_name']})
**Branch**: {branch_name}
**Scan Date**: {datetime.utcnow().strftime('%Y-%m-%d')}
**Finding ID**: `{finding['id']}`

### Description
{finding['description']}

### Location
- **File**: `{finding['file']}`
- **Line**: {finding['line']}
- **Module**: {finding['module']}

### Remediation
{finding.get('recommendation', 'See Veracode platform for detailed remediation guidance.')}

### References
- [Veracode Platform](https://analysiscenter.veracode.com/)
- [CWE-{finding['cwe_id']} Documentation](https://cwe.mitre.org/data/definitions/{finding['cwe_id']}.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Metadata
```json
{{
  "finding_hash": "{create_issue_hash(finding)}",
  "first_found": "{finding.get('first_found', 'Unknown')}",
  "veracode_id": "{finding['id']}"
}}
```

---
*This issue was automatically created by the Veracode automation workflow.*
*Do not edit the metadata section - it's used for tracking and deduplication.*
"""
    return body


def create_github_issue(repo, token, finding, branch_name):
    """Create a new GitHub issue for a finding."""
    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }

    title = f"[Veracode] {finding['severity']}: {finding['title']} in {finding['file']}"
    body = create_issue_body(finding, branch_name)

    # Determine labels based on severity
    labels = ['veracode', 'security']
    if finding['severity'] == 'Critical':
        labels.append('critical')
    elif finding['severity'] == 'High':
        labels.append('high-priority')

    data = {
        'title': title,
        'body': body,
        'labels': labels
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        issue = response.json()
        print(f"✅ Created issue #{issue['number']}: {title}")
        return issue
    except Exception as e:
        print(f"❌ Error creating issue: {e}")
        return None


def close_issue(repo, token, issue_number, comment):
    """Close a GitHub issue."""
    url = f"https://api.github.com/repos/{repo}/issues/{issue_number}"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }

    # Add comment before closing
    comment_url = f"{url}/comments"
    requests.post(comment_url, headers=headers, json={'body': comment})

    # Close the issue
    data = {'state': 'closed'}
    try:
        response = requests.patch(url, headers=headers, json=data)
        response.raise_for_status()
        print(f"✅ Closed issue #{issue_number}")
        return True
    except Exception as e:
        print(f"❌ Error closing issue #{issue_number}: {e}")
        return False


def extract_finding_hash(issue_body):
    """Extract the finding hash from an issue body."""
    try:
        import re
        match = re.search(r'"finding_hash":\s*"([^"]+)"', issue_body)
        if match:
            return match.group(1)
    except:
        pass
    return None


def main():
    """Main execution function."""
    repo = os.environ.get('REPO')
    token = os.environ.get('GITHUB_TOKEN')
    branch_name = os.environ.get('BRANCH_NAME', 'unknown')
    results_file = os.environ.get('RESULTS_FILE', 'veracode-results.json')

    if not repo or not token:
        print("❌ Missing required environment variables: REPO, GITHUB_TOKEN")
        sys.exit(1)

    print(f"🔍 Processing Veracode results for {repo}")

    # Load results
    try:
        with open(results_file, 'r') as f:
            results = json.load(f)
    except FileNotFoundError:
        print(f"❌ Results file not found: {results_file}")
        sys.exit(1)

    findings = results.get('findings', [])
    print(f"📊 Found {len(findings)} total findings")

    # Filter to only unresolved findings of Medium severity or higher
    actionable_findings = [
        f for f in findings
        if f['status'] != 'RESOLVED' and f['severity'] in ['Critical', 'High', 'Medium']
    ]
    print(f"🎯 {len(actionable_findings)} actionable findings (Medium+ severity, unresolved)")

    # Get existing issues
    print("📋 Fetching existing Veracode issues...")
    existing_issues = get_existing_issues(repo, token)
    existing_hashes = {}

    for issue in existing_issues:
        finding_hash = extract_finding_hash(issue.get('body', ''))
        if finding_hash:
            existing_hashes[finding_hash] = issue

    print(f"✅ Found {len(existing_hashes)} existing Veracode issues")

    # Process findings
    created_count = 0
    skipped_count = 0
    closed_count = 0

    # Create issues for new findings
    for finding in actionable_findings:
        finding_hash = create_issue_hash(finding)

        if finding_hash in existing_hashes:
            existing_issue = existing_hashes[finding_hash]
            if existing_issue['state'] == 'open':
                print(f"⏭️  Skipping (already exists): {finding['title']}")
                skipped_count += 1
            else:
                # Reopen if it was closed
                print(f"🔄 Finding still exists, would reopen issue #{existing_issue['number']}")
                skipped_count += 1
        else:
            # Create new issue
            issue = create_github_issue(repo, token, finding, branch_name)
            if issue:
                created_count += 1

    # Check for resolved findings (close issues)
    resolved_hashes = {create_issue_hash(f) for f in findings if f['status'] == 'RESOLVED'}

    for finding_hash, issue in existing_hashes.items():
        if finding_hash in resolved_hashes and issue['state'] == 'open':
            comment = """✅ This vulnerability has been marked as resolved in the latest Veracode scan.

Closing this issue automatically. If this was closed in error, please reopen and add the `keep-open` label to prevent automatic closure."""
            close_issue(repo, token, issue['number'], comment)
            closed_count += 1

    # Print summary
    print("\n📈 Summary:")
    print(f"  ✅ Created: {created_count} new issues")
    print(f"  ⏭️  Skipped: {skipped_count} existing issues")
    print(f"  🔒 Closed: {closed_count} resolved issues")

    # Set output for workflow
    print(f"\n::set-output name=created::{created_count}")
    print(f"::set-output name=closed::{closed_count}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
