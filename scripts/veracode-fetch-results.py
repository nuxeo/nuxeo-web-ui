#!/usr/bin/env python3
"""
Fetch Veracode scan results using the Veracode API.
This script retrieves the latest scan results and saves them to a JSON file.
"""

import os
import sys
import json
import time
from datetime import datetime
from veracode_api_py import VeracodeAPI as vapi


def get_app_id(app_name):
    """Get application ID from application name."""
    try:
        apps = vapi().get_apps()
        app_list = apps.json()

        if '_embedded' in app_list and 'applications' in app_list['_embedded']:
            for app in app_list['_embedded']['applications']:
                if app.get('profile', {}).get('name') == app_name:
                    return app['guid']

        print(f"❌ Application '{app_name}' not found")
        return None
    except Exception as e:
        print(f"❌ Error fetching application list: {e}")
        return None


def get_latest_build(app_guid):
    """Get the latest build/scan for an application."""
    try:
        builds = vapi().get_builds(app_guid)
        build_list = builds.json()

        if '_embedded' in build_list and 'builds' in build_list['_embedded']:
            # Sort by creation time and get the latest
            sorted_builds = sorted(
                build_list['_embedded']['builds'],
                key=lambda x: x.get('created', ''),
                reverse=True
            )
            if sorted_builds:
                return sorted_builds[0]

        print("❌ No builds found")
        return None
    except Exception as e:
        print(f"❌ Error fetching builds: {e}")
        return None


def get_findings(app_guid, build_id):
    """Get findings for a specific build."""
    try:
        findings = vapi().get_findings(app_guid, build_id)
        return findings.json()
    except Exception as e:
        print(f"❌ Error fetching findings: {e}")
        return None


def convert_to_standard_format(findings_data, branch_name):
    """Convert Veracode findings to a standard format."""
    results = {
        'scan_date': datetime.utcnow().isoformat(),
        'branch': branch_name,
        'findings': [],
        'summary': {
            'total': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'informational': 0
        }
    }

    if '_embedded' not in findings_data or 'findings' not in findings_data['_embedded']:
        return results

    for finding in findings_data['_embedded']['findings']:
        severity = finding.get('finding_details', {}).get('severity', 0)

        # Map Veracode severity (0-5) to standard labels
        severity_map = {
            5: 'Critical',
            4: 'High',
            3: 'Medium',
            2: 'Low',
            1: 'Informational',
            0: 'Informational'
        }

        severity_label = severity_map.get(severity, 'Informational')

        finding_data = {
            'id': finding.get('guid'),
            'title': finding.get('finding_details', {}).get('finding_category', {}).get('name', 'Unknown'),
            'severity': severity_label,
            'cwe_id': finding.get('finding_details', {}).get('cwe', {}).get('id'),
            'cwe_name': finding.get('finding_details', {}).get('cwe', {}).get('name'),
            'description': finding.get('description', ''),
            'file': finding.get('finding_details', {}).get('file_path', 'Unknown'),
            'line': finding.get('finding_details', {}).get('file_line_number', 0),
            'module': finding.get('finding_details', {}).get('module', 'Unknown'),
            'recommendation': finding.get('finding_details', {}).get('remediation_effort', ''),
            'first_found': finding.get('finding_status', {}).get('first_found_date'),
            'status': finding.get('finding_status', {}).get('resolution_status', 'UNRESOLVED')
        }

        results['findings'].append(finding_data)
        results['summary']['total'] += 1
        results['summary'][severity_label.lower()] += 1

    return results


def convert_to_sarif(findings_data, branch_name):
    """Convert findings to SARIF format for GitHub Security."""
    sarif = {
        'version': '2.1.0',
        '$schema': 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        'runs': [{
            'tool': {
                'driver': {
                    'name': 'Veracode SAST/SCA',
                    'version': '1.0',
                    'informationUri': 'https://www.veracode.com'
                }
            },
            'results': []
        }]
    }

    for finding in findings_data['findings']:
        if finding['status'] != 'RESOLVED':
            result = {
                'ruleId': f"CWE-{finding['cwe_id']}" if finding['cwe_id'] else 'VERACODE',
                'message': {
                    'text': f"{finding['title']}: {finding['description']}"
                },
                'level': {
                    'Critical': 'error',
                    'High': 'error',
                    'Medium': 'warning',
                    'Low': 'note',
                    'Informational': 'note'
                }.get(finding['severity'], 'warning'),
                'locations': [{
                    'physicalLocation': {
                        'artifactLocation': {
                            'uri': finding['file']
                        },
                        'region': {
                            'startLine': finding['line']
                        }
                    }
                }]
            }
            sarif['runs'][0]['results'].append(result)

    return sarif


def main():
    """Main execution function."""
    app_name = os.environ.get('APP_NAME', 'Nuxeo Web UI')
    branch_name = os.environ.get('BRANCH_NAME', 'unknown')

    print(f"🔍 Fetching Veracode results for '{app_name}' (branch: {branch_name})")

    # Get application ID
    print("📋 Looking up application...")
    app_guid = get_app_id(app_name)
    if not app_guid:
        sys.exit(1)
    print(f"✅ Found application (ID: {app_guid})")

    # Get latest build
    print("🔨 Fetching latest build...")
    latest_build = get_latest_build(app_guid)
    if not latest_build:
        sys.exit(1)

    build_id = latest_build.get('id')
    build_status = latest_build.get('status', 'Unknown')
    print(f"✅ Found build {build_id} (Status: {build_status})")

    # Wait for scan to complete if still in progress
    if build_status in ['Scanning', 'Submitted', 'Pre-Scan']:
        print(f"⏳ Scan in progress (Status: {build_status}). Waiting...")
        max_wait = 60  # minutes
        wait_interval = 2  # minutes

        for i in range(max_wait // wait_interval):
            time.sleep(wait_interval * 60)
            latest_build = get_latest_build(app_guid)
            build_status = latest_build.get('status', 'Unknown')
            print(f"⏳ Status check {i+1}/{max_wait//wait_interval}: {build_status}")

            if build_status not in ['Scanning', 'Submitted', 'Pre-Scan']:
                break

    # Get findings
    print("📊 Fetching findings...")
    findings_data = get_findings(app_guid, build_id)
    if not findings_data:
        sys.exit(1)

    # Convert to standard format
    print("🔄 Processing results...")
    results = convert_to_standard_format(findings_data, branch_name)

    # Save results
    with open('veracode-results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"✅ Saved results to veracode-results.json")

    # Convert to SARIF
    sarif = convert_to_sarif(results, branch_name)
    with open('veracode-results.sarif', 'w') as f:
        json.dump(sarif, f, indent=2)
    print(f"✅ Saved SARIF to veracode-results.sarif")

    # Print summary
    print("\n📈 Summary:")
    print(f"  Total Findings: {results['summary']['total']}")
    print(f"  🔴 Critical: {results['summary']['critical']}")
    print(f"  🟠 High: {results['summary']['high']}")
    print(f"  🟡 Medium: {results['summary']['medium']}")
    print(f"  🔵 Low: {results['summary']['low']}")
    print(f"  ⚪ Informational: {results['summary']['informational']}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
