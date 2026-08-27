# Veracode SAST/SCA Automated Alert System - Proposal

## Executive Summary

This document proposes an automated alert mechanism for Veracode SAST and SCA scan results, eliminating the need for manual report checking and issue logging.

## Current State

### Current Process
- Two scheduled GitHub Actions workflows run daily:
  - `veracode-lts-2025.yaml` - Runs at 7:00 PM UTC
  - `veracode-3.1.x.yaml` - Runs at 5:30 PM UTC
- Scans are uploaded to Veracode platform
- **Manual Step**: Team members must check Veracode platform for results
- **Manual Step**: Issues must be manually logged and tracked

### Problems with Current Approach
1. **Delayed Response**: Issues may go unnoticed for hours or days
2. **Manual Overhead**: Requires dedicated time to check reports
3. **Inconsistent Tracking**: Manual logging prone to human error
4. **No Visibility**: GitHub repository doesn't reflect security posture
5. **Lack of Accountability**: No automatic assignment or tracking

## Recommended Solution

### Full Integration Approach

Implement an automated system that:

1. **Retrieves Scan Results** - Automatically fetch results from Veracode API after scan completion
2. **Parses Findings** - Extract vulnerability details, severity, CWE, affected files
3. **Creates GitHub Issues** - Auto-generate issues with:
   - Descriptive titles
   - Severity labels (Critical, High, Medium, Low)
   - Affected file/line references
   - Remediation guidance
   - Links to Veracode platform
4. **Deduplication** - Prevents duplicate issues for known vulnerabilities
5. **Uploads SARIF** - Integrates with GitHub Security tab for code scanning alerts
6. **Policy Enforcement** - Fails workflow if critical/high severity issues exceed threshold
7. **Notifications** - Team notification when new issues are found

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Workflow                                      │
│                                                              │
│  1. Build & Package     ─────────────────────────────────>  │
│                                                              │
│  2. Upload to Veracode  ─────────────────────────────────>  │
│                                                              │
│  3. Wait for Scan       ─────────────────────────────────>  │
│                                                              │
│  4. Fetch Results API   <───────────────────────────────────│
│                                                              │
│  5. Parse Findings      ─────────────────────────────────>  │
│                                                              │
│  6. Check for Existing Issues                               │
│     │                                                        │
│     ├─> New Vulnerability? ──> Create GitHub Issue          │
│     │                                                        │
│     ├─> Already Exists?    ──> Update Issue (if changed)    │
│     │                                                        │
│     └─> Fixed?             ──> Close Issue                  │
│                                                              │
│  7. Upload SARIF to GitHub Security                         │
│                                                              │
│  8. Check Policy Thresholds                                 │
│     │                                                        │
│     ├─> Critical > 0?     ──> FAIL Workflow                 │
│     │                                                        │
│     └─> High > threshold? ──> FAIL Workflow                 │
│                                                              │
│  9. Send Summary Notification                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Requirements

### 1. Veracode API Credentials
- **API ID**: Already stored in `VERACODE_SECRET_API_ID`
- **API Key**: Already stored in `VERACODE_SECRET_KEY`
- **Additional Permissions Needed**: Results API access (read-only)

### 2. GitHub Token Permissions
Current workflows have:
- `contents: read`
- `security-events: write`
- `actions: read`

Need to add:
- `issues: write` - For creating/updating issues
- `pull-requests: write` - For linking issues to PRs (optional)

### 3. Additional GitHub Secrets (Optional)
- `SLACK_WEBHOOK_URL` - For Slack notifications (if desired)
- `TEAMS_WEBHOOK_URL` - For Microsoft Teams (if desired)

## Implementation Steps

### Phase 1: Basic Automation (Week 1)
1. Add results retrieval step using Veracode Pipeline Scan API
2. Parse JSON results for vulnerabilities
3. Create GitHub issues for Critical/High severity findings
4. Add basic deduplication logic
5. Test on one workflow (maintenance-3.1.x)

### Phase 2: Enhanced Features (Week 2)
1. Upload SARIF to GitHub Security tab
2. Implement smart deduplication (check existing issues)
3. Add issue auto-close when vulnerabilities fixed
4. Roll out to both workflows
5. Add workflow failure on policy violations

### Phase 3: Refinement (Week 3)
1. Add issue templates with remediation guidance
2. Implement auto-assignment based on affected files/teams
3. Add severity labels and project boards integration
4. Create dashboard/reporting (optional)
5. Documentation and team training

## Benefits

### Immediate Benefits
- **Zero Manual Effort**: No need to check Veracode platform daily
- **Instant Visibility**: Issues appear in GitHub within minutes of scan completion
- **Faster Response**: Team notified immediately when critical issues found
- **Better Tracking**: All security issues tracked in one place with Git workflow

### Long-Term Benefits
- **Metrics & Trends**: Track vulnerability trends over time via GitHub Issues
- **Accountability**: Clear assignment and ownership of security issues
- **Compliance**: Automated audit trail of security findings and remediation
- **Integration**: Works with existing PR review process and CI/CD pipeline

## Risk Assessment

### Low Risk
- Implementation uses read-only Veracode API
- GitHub Actions permissions limited to issues/security-events
- No changes to existing scan configuration
- Can be tested in isolation before full rollout

### Mitigation Strategies
- Gradual rollout (one workflow first)
- Dry-run mode for testing without creating issues
- Rollback plan: simply remove new steps, original workflow intact
- Team review before marking issues as production-ready

## Resource Requirements

### Development Time
- **Initial Implementation**: 8-16 hours (1-2 days)
- **Testing & Refinement**: 4-8 hours
- **Documentation**: 2-4 hours
- **Total**: ~2-3 days of engineering time

### Maintenance
- Minimal ongoing maintenance
- Veracode API rarely changes
- GitHub Actions updates handled by Dependabot

### Team Training
- 1-hour overview session for team
- Updated documentation in repository
- Run book for troubleshooting

## Cost Analysis

### Current Process
- **Manual Review Time**: ~30 minutes/day × 2 branches = 1 hour/day
- **Issue Logging**: ~15 minutes per vulnerability
- **Annual Cost**: ~260 hours of engineering time

### Automated Process
- **Development**: ~20 hours (one-time)
- **Maintenance**: ~2 hours/year
- **Annual Savings**: ~240 hours
- **ROI**: Break-even after ~1 month

## Success Metrics

### Key Performance Indicators
1. **Time to Detection**: Scan completion → Issue creation (target: <5 minutes)
2. **Manual Effort Reduction**: Hours saved per week (target: 5+ hours)
3. **Issue Response Time**: Time from issue creation → first action (measure improvement)
4. **False Positive Rate**: Duplicate/invalid issues (target: <5%)

## Recommended Action

We recommend proceeding with the **Full Integration Approach** for the following reasons:

1. **Maximum Automation**: Eliminates all manual steps
2. **Best ROI**: Saves most time with reasonable implementation effort
3. **Industry Standard**: Aligns with DevSecOps best practices
4. **Scalability**: Can extend to other repositories easily
5. **Compliance**: Provides audit trail required by security policies

## Next Steps

If approved:

1. **Week 1**: 
   - Create implementation branch
   - Develop and test automation scripts
   - Review with security team

2. **Week 2**:
   - Deploy to maintenance-3.1.x workflow (pilot)
   - Monitor for 1 week
   - Gather feedback

3. **Week 3**:
   - Deploy to lts-2025 workflow
   - Create documentation
   - Train team

4. **Week 4**:
   - Monitor and refine
   - Consider extending to other repositories

## Alternative Approaches Considered

### Notification-Only Approach
- **Pros**: Simpler implementation, faster deployment
- **Cons**: Still requires manual issue creation, minimal time savings
- **Verdict**: Not recommended - insufficient automation

### External Service Integration (e.g., Jira)
- **Pros**: May align with existing project management tools
- **Cons**: Adds complexity, cost, and maintenance burden
- **Verdict**: GitHub Issues preferred for developer workflow integration

## Questions for Discussion

1. Should we implement policy-based workflow failures? (Fail on Critical/High severity)
2. What severity threshold should trigger issue creation? (Recommend: Medium and above)
3. Should issues auto-close when vulnerabilities are fixed? (Recommend: Yes)
4. Do we need Slack/Teams notifications in addition to GitHub Issues?
5. Should we create a dedicated label/project for Veracode issues?

## Appendix A: Sample Issue Template

```markdown
## Veracode Security Finding

**Severity**: 🔴 Critical
**CWE**: CWE-79 (Cross-site Scripting)
**Branch**: maintenance-3.1.x
**Scan Date**: 2026-08-27

### Description
Cross-site scripting vulnerability detected in user input handling.

### Location
- **File**: `src/components/user-input.js`
- **Line**: 42
- **Module**: nuxeo-web-ui

### Remediation
1. Sanitize user input before rendering
2. Use proper encoding for HTML output
3. Implement Content Security Policy

### References
- [Veracode Finding Details](https://analysiscenter.veracode.com/...)
- [CWE-79 Documentation](https://cwe.mitre.org/data/definitions/79.html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/...)

### Veracode Metadata
- **Finding ID**: 12345
- **First Seen**: 2026-08-27
- **Scan ID**: LTS2025-20260827
```

## Appendix B: Estimated Issue Volume

Based on typical Veracode scans:
- **Initial Scan**: 10-30 issues (one-time)
- **Subsequent Scans**: 0-5 new issues per week
- **False Positives**: ~5-10% of findings

## Appendix C: Required Approvals

- [ ] Engineering Lead approval
- [ ] Security Team review
- [ ] DevOps approval for workflow changes
- [ ] Compliance review (if required per security policies)

---

**Document Version**: 1.0  
**Date**: 2026-08-27  
**Author**: DevOps Team  
**Status**: Awaiting Approval  

**Contact**: For questions or feedback, please reach out to the DevOps team or comment on this proposal.
