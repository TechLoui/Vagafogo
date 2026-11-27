# Affiliate access and Rules verification

The default rollout flag is `AFFILIATES_ENABLED=false`. This keeps the existing
administrator profile available while disabling external affiliate operations.
`BACKEND_FIREBASE_AUTH_REQUIRED=true` enables the strict private backend session
independently of the portal and must remain true after private Rules are active.
Do not provision agency/partner accounts while the deployed Firestore/Storage
rules still use the old access policy.

## Local authorization tests

From `backend`, after compiling with `node node_modules/typescript/bin/tsc`:

```powershell
node --test test/affiliateAuth.test.js test/backendFirebaseAuth.test.js test/affiliates.http.test.js
```

These tests use real Express routes on loopback, mocked Firebase identities and
an in-memory Firestore fixture. They do not create Firebase users, issue charges,
send messages, or contact production. They verify the owner allowlist, revoked
token checks, UID membership scope, disabled parents, independent partners,
cross-agency reads/updates, forged filters/cursors, partner CRUD denial, rollout
flag behavior and the private backend Web SDK bootstrap.

## Firestore and Storage emulators

`affiliateRules.emulator.cjs` is deliberately outside the default `*.test.js`
suite: it requires explicit loopback emulator environment variables and always
uses project `demo-vagafogo-affiliates`. It rejects external emulator hosts.

Verified locally on 2026-11-24 with Temurin JRE 21.0.13.1+2, Firebase CLI
15.37.0, `@firebase/rules-unit-testing` 6.0.0 and Firebase SDK 13.4.0. Tools are
installed under `%LOCALAPPDATA%/Temp/vagafogo-affiliate-rules-2026-11-24`, not in
the repository. The downloaded JRE archive was checked against the SHA256 from
the official Adoptium release metadata. This does not change system Java or PATH.

Prepared temporary `firebase.json`:

```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "firestore": { "host": "127.0.0.1", "port": 8183 },
    "storage": { "host": "127.0.0.1", "port": 9293 },
    "hub": { "host": "127.0.0.1", "port": 4493 },
    "logging": { "host": "127.0.0.1", "port": 4593 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

To repeat with the prepared tools, run from the repository root:

```powershell
$qaRepo = (Get-Location).Path
$qaTools = Join-Path $env:LOCALAPPDATA 'Temp\vagafogo-affiliate-rules-2026-11-24'
$qaJre = (Get-ChildItem -LiteralPath (Join-Path $qaTools 'java') -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME = $qaJre
$env:PATH = (Join-Path $qaJre 'bin') + ';' + $env:PATH
$env:FIREBASE_EMULATORS_PATH = Join-Path $qaTools 'emulators'
$env:FIREBASE_RULES_TEST_MODULES = Join-Path $qaTools 'node_modules'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
Copy-Item -LiteralPath (Join-Path $qaRepo 'frontend\firestore.rules') -Destination (Join-Path $qaTools 'firestore.rules')
Copy-Item -LiteralPath (Join-Path $qaRepo 'frontend\storage.rules') -Destination (Join-Path $qaTools 'storage.rules')
$qaTestCommand = 'node --test "' + (Join-Path $qaRepo 'backend\test\affiliateRules.emulator.cjs') + '"'
node (Join-Path $qaTools 'node_modules\firebase-tools\lib\bin\firebase.js') emulators:exec --project demo-vagafogo-affiliates --only firestore,storage --config (Join-Path $qaTools 'firebase.json') $qaTestCommand
```

The CLI stops both emulators after the test run. Its logs remain in the working
directory; use the temporary tooling folder as the working directory when
collecting them. No Firebase login or production credentials are required.
For CI, prepare the same config in an isolated temporary directory and install
the pinned tool versions there from the npm registry. Official references:
[Emulator setup](https://firebase.google.com/docs/emulator-suite/install_and_configure),
[Rules unit testing](https://firebase.google.com/docs/rules/unit-tests),
[portable Java](https://adoptium.net/installation/ci-scripts/).

The emulator tests assert:

- Public, agency and partner identities cannot read/list/change reservations,
  CRM data, private settings or tables.
- No browser identity, including the owner, can read/write membership,
  attribution evidence, idempotency or admin approval records directly.
- A current server-approved owner and the reserved backend service UID retain
  the intended private access; stale approvals and forged role/service claims
  fail.
- Catalog reads and the public site text remain available, with private writes.
- Only catalog icon object paths are publicly readable in Storage. Affiliate
  uploads/deletes, private media reads and bucket enumeration fail.
- Storage checks the same Firestore approval document as Firestore Rules; the
  current owner/backend can access approved paths while expired/disabled users
  cannot.
- The `affiliate-agency-logos` prefix rejects direct reads, uploads and deletes
  for public, agency, partner, browser-admin and backend-Web-SDK identities.
  Logo operations use the authorized API's Admin SDK, outside these Rules;
  publicly displaying a logo does not expose the bucket path or grant access.

Agency self-service branding uses that same private API path: administrators can
manage any agency logo, and an active agency can manage only its own. Sellers
remain denied. `affiliates.logo.test.js` covers cross-agency denial before the
larger body parser, suspension during upload, validated two-color branding,
private DTO fields, and palette removal. No broader Storage permission is needed.

## Coordinated rollout

1. Keep `AFFILIATES_ENABLED=false` and do not create external users. First deploy
   the compatible backend and frontend which use anonymized occupancy and
   validated reservation lookup instead of public reservation snapshots.
2. Verify the owner can sign in and `/api/affiliates/me` approves
   `_crm_admin_access/{uid}`. The browser must refresh this profile on ID token
   renewal. An approval expires no later than the verified token.
3. Set `BACKEND_FIREBASE_AUTH_REQUIRED=true`, keeping `AFFILIATES_ENABLED=false`,
   and confirm strict backend startup succeeded before applying private Rules.
   Startup must not fall back to anonymous Firestore if custom-token
   authentication fails. The bootstrap also runs when the portal is enabled,
   but the independent backend flag allows a safe staged rollout and rollback.
4. Apply the reviewed Firestore **and** Storage rules together after the new
   frontend is active. Storage cross-service reads require enabling the Firebase
   Rules Firestore Service Agent permission when Firebase prompts; see the
   [official cross-service deployment documentation](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service).
   This emulator run does not grant or verify production IAM permissions.
5. Verify the deployed admin, public booking/lookup and direct-access denials.
   Only then set `AFFILIATES_ENABLED=true`, create/activate agencies or partners
   and share links. Rules in this change were not deployed by the implementation
   or local tests.

After external users exist, a rollback must retain private Rules and an
authenticated compatible backend. Keep `BACKEND_FIREBASE_AUTH_REQUIRED=true`
even when setting `AFFILIATES_ENABLED=false` to pause the portal. The old
anonymous backend/frontend must not be restored against private data. Both
flags false is only the initial compatibility state before the migration.
