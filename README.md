# Executive AI Consulting public website

This repository contains the source for the public Executive AI Consulting / CLConsulting website at **executiveaiconsulting.org**.

## Repository scope

The repository contains public website pages, browser-based decision tools, public claims, and deployment-related configuration. It is **not** the system of record for CLConsulting's complete internal AI governance program.

## Accountability

- **Website owner:** Christopher Lewis
- **Public evidence scope:** website content, browser-based tool behavior, public claims, privacy disclosures, and repository changes
- **Current public-governance review:** 2026-09-22
- **Material-change triggers:** new data collection, analytics, third-party integrations, material claim changes, incidents affecting website assumptions, or material legal/standards changes

See [governance.html](governance.html) for the public evidence boundary and [privacy.html](privacy.html) for current website data-handling behavior.

## Evidence boundary

Public methodology statements do not, by themselves, prove that internal organizational controls are operating. Internal AI inventory, acceptable-use policy, vendor oversight, risk assessments, training evidence, incident records, data-handling controls, and risk acceptance require separate internal evidence.

## Current browser-based tools

The Executive Quick Signal and Decision Preview run in client-side JavaScript in the current source. The repository currently contains no application code that submits those tool responses with `fetch`, XHR, analytics calls, application cookies, or browser local/session storage.

Any future change that introduces persistent storage, server-side submission, analytics, authentication, or third-party data processing should trigger privacy and governance review before release.
