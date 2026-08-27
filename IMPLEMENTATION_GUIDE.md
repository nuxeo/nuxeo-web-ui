# Veracode Automation - Implementation Guide

This guide provides step-by-step instructions for implementing automated Veracode alerting in the nuxeo-web-ui repository.

## Overview

The automation adds three new capabilities to your existing Veracode workflows:
1. **Automatic result retrieval** from Veracode API after scans complete
2. **GitHub issue creation** for new security findings
3. **SARIF upload** to GitHub Security tab for code scanning integration

## Prerequisites

### 1. Verify Veracode API Access
Your repository already has these secrets configured:
- `VERACODE_SECRET_API_ID`
- `VERACODE_SECRET_KEY`

Verify these credentials have the following permissions in Veracode:
- [x] Upload and Scan API (already used)
- [x] **Results API** (needed for automation) - READ access

To verify/request Results API access:
1. Log into Veracode Platform
2. Go to Admin → API Credentials
3. Ensure your API credentials have "Results API" permission
4. If not, request access from your Veracode administrator

### 2. GitHub Token Permissions
The workflows need additional permissions. Update the `permissions` block in each workflow:

```yaml
permissions:
  contents: read
  security-events: write
  actions: read
  issues: write          # NEW: Required for creating/updating issues
```

### 3. Repository Labels
Create these labels in your GitHub repository (Settings → Labels):

| Label | Color | Description |
|-------|-------|-------------|
| `veracode` | `#0052CC` | Issues created by Veracode automation |
| `security` | `#D93F0B` | Security vulnerabilities |
| `critical` | `#B60205` | Critical severity findings |
| `high-priority` | `#D93F0B` | High severity findings |

You can create them manually or use the GitHub CLI:
```bash
gh label create veracode --color "0052CC" --description "Veracode security findings"
gh label create security --color "D93F0B" --description "Security vulnerabilities"
gh label create critical --color "B60205" --description "Critical severity"
gh label create high-priority --color "D93F0B" --description "High priority"
```

## Implementation Steps

### Step 1: Install Dependencies

Add a `requirements.txt` file for Python dependencies:

```bash
cat > scripts/requirements.txt << EOF
requests>=2.31.0
veracode-api-py>=0.10.0
EOF
```

### Step 2: Make Scripts Executable

```bash
chmod +x scripts/veracode-fetch-results.py
chmod +x scripts/veracode-create-issues.py
```

### Step 3: Update Workflow - Pilot (maintenance-3.1.x)

We'll start with the `veracode-3.1.x.yaml` workflow as a pilot.

#### 3a. Add output to sast-scan job

Find the `sast-scan` job and add an `outputs` section:

```yaml
  sast-scan:
    needs: sast-scan-build
    permissions:
      contents: read
      security-events: write
      actions: read
    runs-on: ubuntu-latest
    outputs:                              # ADD THIS
      build-id: ${{ steps.veracode-scan.outputs.build-id }}  # ADD THIS
    steps:
      # ... existing steps ...

      - name: Veracode Upload And Scan
        id: veracode-scan                 # ADD ID
        uses: veracode/veracode-uploadandscan-action@0.2.11
        # ... rest of the configuration ...
```

#### 3b. Add the new process-results job

Add this entire job at the end of the workflow:

```yaml
  process-results:
    needs: sast-scan
    if: always()  # Run even if scan has issues
    permissions:
      contents: read
      security-events: write
      issues: write
      actions: read
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r scripts/requirements.txt

      - name: Fetch Veracode Results
        id: fetch-results
        env:
          VERACODE_API_ID: ${{ secrets.VERACODE_SECRET_API_ID }}
          VERACODE_API_KEY: ${{ secrets.VERACODE_SECRET_KEY }}
          APP_NAME: 'Nuxeo Web UI'
          BRANCH_NAME: ${{ env.BRANCH_NAME }}
        run: |
          python scripts/veracode-fetch-results.py

      - name: Parse Results and Create Issues
        id: create-issues
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}
          BRANCH_NAME: ${{ env.BRANCH_NAME }}
          RESULTS_FILE: veracode-results.json
        run: |
          python scripts/veracode-create-issues.py

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: veracode-results.sarif

      - name: Check Policy Violations
        id: policy-check
        if: always()
        run: |
          CRITICAL_COUNT=$(jq -r '[.findings[] | select(.severity=="Critical")] | length' veracode-results.json)
          HIGH_COUNT=$(jq -r '[.findings[] | select(.severity=="High")] | length' veracode-results.json)

          echo "critical_count=$CRITICAL_COUNT" >> $GITHUB_OUTPUT
          echo "high_count=$HIGH_COUNT" >> $GITHUB_OUTPUT

          # Optional: Fail workflow if policy violated
          # Uncomment to enable:
          # if [ "$CRITICAL_COUNT" -gt 0 ]; then
          #   echo "::error::Policy violation: $CRITICAL_COUNT Critical findings"
          #   exit 1
          # fi

      - name: Create Summary
        if: always()
        run: |
          echo "## Veracode Scan Results - ${{ env.BRANCH_NAME }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Scan Date**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Findings by Severity" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          
          CRITICAL=$(jq -r '[.findings[] | select(.severity=="Critical")] | length' veracode-results.json)
          HIGH=$(jq -r '[.findings[] | select(.severity=="High")] | length' veracode-results.json)
          MEDIUM=$(jq -r '[.findings[] | select(.severity=="Medium")] | length' veracode-results.json)
          LOW=$(jq -r '[.findings[] | select(.severity=="Low")] | length' veracode-results.json)
          
          echo "| Severity | Count |" >> $GITHUB_STEP_SUMMARY
          echo "|----------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| 🔴 Critical | $CRITICAL |" >> $GITHUB_STEP_SUMMARY
          echo "| 🟠 High | $HIGH |" >> $GITHUB_STEP_SUMMARY
          echo "| 🟡 Medium | $MEDIUM |" >> $GITHUB_STEP_SUMMARY
          echo "| 🔵 Low | $LOW |" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "[View Security Findings →](https://github.com/${{ github.repository }}/security/code-scanning)" >> $GITHUB_STEP_SUMMARY
```

### Step 4: Testing

#### 4a. Test with Workflow Dispatch (Manual Trigger)

First, add manual trigger capability to test:

```yaml
on:
  schedule:
    - cron: '30 17 * * *'
  workflow_dispatch:  # ADD THIS for manual testing
```

#### 4b. Run Test

1. Go to GitHub Actions tab
2. Select "Veracode Maintenance 3.1.x" workflow
3. Click "Run workflow" → Select branch → Run
4. Monitor the workflow execution

#### 4c. Verify Results

After the workflow completes, verify:

- [ ] Workflow completed successfully (or check errors)
- [ ] GitHub Issues created for findings (check Issues tab)
- [ ] Issues have correct labels (`veracode`, `security`, etc.)
- [ ] SARIF uploaded (check Security → Code Scanning tab)
- [ ] Workflow summary shows finding counts

### Step 5: Monitor Pilot (1 Week)

Monitor the pilot deployment for one week:

**Daily Checks:**
- [ ] Workflow runs successfully
- [ ] No duplicate issues created
- [ ] Issue quality (titles, descriptions, metadata)
- [ ] False positive rate

**Track Metrics:**
- Number of issues created per day
- Number of duplicate detections
- Time from scan → issue creation
- Team feedback on issue quality

### Step 6: Rollout to LTS-2025 Workflow

Once the pilot is successful, apply the same changes to `veracode-lts-2025.yaml`.

**IMPORTANT**: Update these values in the LTS workflow:
```yaml
env:
  BRANCH_NAME: 'lts-2025'  # Not maintenance-3.1.x!
```

### Step 7: Enable Policy Enforcement (Optional)

After confirming the automation works well, you can optionally enable workflow failures for policy violations.

In the `Check Policy Violations` step, uncomment:

```yaml
- name: Check Policy Violations
  id: policy-check
  if: always()
  run: |
    # ... existing code ...
    
    # Uncomment to enable enforcement:
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
      echo "::error::Policy violation: $CRITICAL_COUNT Critical findings"
      exit 1
    fi
    
    if [ "$HIGH_COUNT" -gt 10 ]; then
      echo "::error::Policy violation: $HIGH_COUNT High findings (threshold: 10)"
      exit 1
    fi
```

Adjust thresholds based on your current baseline and risk tolerance.

## Troubleshooting

### Issue: "Application not found"

**Problem**: Script can't find "Nuxeo Web UI" application in Veracode.

**Solution**:
1. Verify the exact application name in Veracode platform
2. Update the `APP_NAME` environment variable in workflow:
   ```yaml
   env:
     APP_NAME: 'Exact Name From Veracode'  # Must match exactly
   ```

### Issue: "No builds found"

**Problem**: No recent scans available.

**Solution**:
1. Verify the previous `sast-scan` job completed successfully
2. Check Veracode platform to confirm scan was uploaded
3. The scan may still be processing (wait and retry)

### Issue: "API credentials invalid"

**Problem**: Veracode API credentials don't work.

**Solution**:
1. Verify secrets are set correctly in repository settings
2. Check if credentials have expired in Veracode
3. Verify Results API permission is granted
4. Test credentials manually:
   ```bash
   export VERACODE_API_ID="your_id"
   export VERACODE_API_KEY="your_key"
   python scripts/veracode-fetch-results.py
   ```

### Issue: Duplicate issues created

**Problem**: Same vulnerability creates multiple issues.

**Solution**:
1. Check the issue metadata - hash should be unique
2. Existing issues might not have proper labels
3. One-time fix: manually add `veracode` label to all existing Veracode issues
4. Future runs will detect them properly

### Issue: Too many issues created

**Problem**: Overwhelming number of issues.

**Solution**: Adjust severity threshold in `veracode-create-issues.py`:

```python
# Current: Medium and above
actionable_findings = [
    f for f in findings
    if f['status'] != 'RESOLVED' and f['severity'] in ['Critical', 'High', 'Medium']
]

# Change to: Only Critical and High
actionable_findings = [
    f for f in findings
    if f['status'] != 'RESOLVED' and f['severity'] in ['Critical', 'High']
]
```

### Issue: SARIF upload fails

**Problem**: "Error uploading SARIF: ..."

**Solution**:
1. Check if `security-events: write` permission is set
2. Verify SARIF file was created (`veracode-results.sarif`)
3. Check SARIF format is valid:
   ```bash
   python -m json.tool veracode-results.sarif
   ```

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review new issues created
- [ ] Check for false positives
- [ ] Verify resolved issues are auto-closed

**Monthly:**
- [ ] Review deduplication effectiveness
- [ ] Check issue creation patterns
- [ ] Update severity thresholds if needed

**Quarterly:**
- [ ] Update Python dependencies (`pip list --outdated`)
- [ ] Review and update issue templates
- [ ] Analyze metrics and adjust automation

### Updating Dependencies

When dependencies need updates:

```bash
# Check for updates
pip list --outdated

# Update specific package
pip install --upgrade veracode-api-py

# Update requirements.txt
pip freeze | grep veracode-api-py > temp.txt
# Copy version to requirements.txt

# Test the update
python scripts/veracode-fetch-results.py --help
```

## Rollback Plan

If issues arise and you need to rollback:

1. **Quick Disable** - Comment out the `process-results` job:
   ```yaml
   # process-results:
   #   needs: sast-scan
   #   ... (entire job commented out)
   ```

2. **Close Automated Issues** - If needed:
   ```bash
   # Get all veracode issues
   gh issue list --label veracode --json number --jq '.[].number' | \
   while read issue_num; do
     gh issue close $issue_num -c "Closing as part of automation rollback"
   done
   ```

3. **Restore Manual Process** - Resume manual checking of Veracode platform

## Success Criteria

After full implementation, you should see:

- ✅ Zero manual checks of Veracode platform needed
- ✅ Issues appear within 5 minutes of scan completion
- ✅ No duplicate issues for same vulnerabilities
- ✅ Security tab shows code scanning alerts
- ✅ Clear visibility into security posture
- ✅ Faster issue resolution time
- ✅ Better tracking and metrics

## Support

For questions or issues:

1. Check this guide's troubleshooting section
2. Review workflow logs in GitHub Actions
3. Contact DevOps/Security team
4. Refer to [Veracode API Documentation](https://docs.veracode.com/r/c_about_results_apis)

## References

- [Veracode API Documentation](https://docs.veracode.com/r/c_about_results_apis)
- [GitHub Actions - Creating Issues](https://docs.github.com/en/rest/issues/issues)
- [SARIF Format Specification](https://sarifweb.azurewebsites.net/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
