# Security Policy

## Reporting a Vulnerability

Please do not report security vulnerabilities in a public issue or pull request. Use GitHub's private vulnerability reporting for this repository:

[Report a vulnerability privately](https://github.com/xkid1/reed-solomon-algorithm/security/advisories/new)

If private reporting is unavailable, contact the repository maintainer through GitHub and ask for a private channel. Include the affected package version, a description of the impact, and concise reproduction steps. Do not include real user data, credentials, or other secrets.

The maintainers will review reports and coordinate any fix and disclosure with the reporter. No response or remediation timeframe is guaranteed.

## Scope and Limitations

Reports are welcome for implementation vulnerabilities, input-triggered crashes, or package and release security issues. The decoder is an error-correction tool, not a cryptographic primitive. In particular, inputs beyond the documented correction capacity may be rejected or miscorrected; applications that need corruption detection should verify decoded data with an outer checksum or equivalent integrity mechanism.

Security fixes are considered for the current release. Backports to older versions are handled case by case.
