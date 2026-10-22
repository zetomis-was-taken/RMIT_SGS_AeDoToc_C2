# Where TideCloak fits (plan from Tide's MCP, simulated for now)

The organisers asked us to build the app *as though TideCloak protects it*, use Tide's MCP to plan where it fits, and
simulate sign-in, roles and access checks. This is that plan, and how each piece is simulated.

**Scenario match.** `tide_choose_scenario` returned two candidates: `iga-admin-governance` (quorum approval of change
requests) and `organisation-password-manager`. We read both plus `relationship-attestation` (a record readable only by a named
subject, enforced at decryption) and `custom-contracts`. Result: we use IGA for policy changes, `RelationshipAttestation:1`
for "officer assigned to case", and need one **custom** contract for consent, which Tide's canon says is not self-service.

## Map: our feature to Tide capability

| Feature in the app | Tide capability | Status here |
|---|---|---|
| Sign-in, no password hash on our server | TideCloak OIDC, password verified by threshold across ORKs (PRISM) | Simulated: 3 ORKs, 2 of 3, each holding its own verifier (`lib/tide-sim/ork.ts`) |
| Roles in the app | Realm roles + client role `realm-management/tide-realm-admin`, carried in a threshold-signed JWT | Simulated: ES256 token, claims shaped like TideCloak's (`realm_access`, `resource_access`, `groups`, `tideuserkey`, `vuid`) |
| Server trusts only the token | Server-side JWT verify against the **embedded** JWKS in `tidecloak.json`, plus DPoP proof (ES256, `cnf.jkt`, `jti` replay cache) | Implemented as Tide documents it (`lib/tide-sim/jwt.ts`); the adapter file is `data/tide-sim/tidecloak.sim.json` |
| "This officer is assigned to this case" | Built-in `RelationshipAttestation:1`: a policy signed by the network after a realm admin approves; checks subject, single tag = case id, `_tide_decryptor` role | Simulated with the same checks and refusal messages (`evaluateRelationship`) |
| Fields encrypted so a DBA reads noise | CVK threshold encryption, tag-bound, decrypt only if the contract agrees | Simulated: AES-256-GCM, key exists only as Shamir shares (2 of 3), AAD = case id |
| Policy changes need a quorum | IGA change requests, quorum `max(1, floor(0.7 x tide-realm-admin holders))` (3 admins here, so 2) | Simulated: draft, authorize, auto-commit on quorum, four-eyes 409, quorum not configurable |
| Record opens only with supervisor + citizen | **No built-in contract.** Needs a custom Forseti contract, deployed by the Tide team | Simulated as `ConsentQuorum:1`; the ORKs issue a signed 15-minute attestation that decrypt checks |
| Agency B gets yes/no only | Attestation-style purpose-bound evaluation | Simulated as `EligibilityAttestation:1`: the ORKs release a boolean, never the income |
| Tamper-evident log | Not a Tide feature | App-level SHA-256 hash chain |

## What the simulation does NOT prove

- No real TideCloak, ORK network, enclave or Forseti sandbox is involved. Nothing here shows Tide's security properties; it shows
  where they would apply and that the app is written to rely on them.
- The simulated ORKs reassemble a key inside one Node process to do the maths. Real Tide never assembles a key (invariant I-01).
- Policies are bootstrap-signed, standing in for admin approvals made in the Tide enclave.
- `ConsentQuorum:1` is our design for a contract that, in real Tide, goes to the Tide team for review. We did not write or compile Forseti C#.
- Decryption runs on the app server for the simulation. In real Tide it runs in the user's browser with the user's doken (AP-S03).

## Swap-in plan (simulation module to real Tide)

| Replace | With |
|---|---|
| `lib/tide-sim/jwt.ts` (`verifyTideJWT`, `verifyDPoP`) | `@tidecloak/nextjs/server` `verifyTideCloakToken` + DPoP verification, adapter JSON from the real realm |
| `lib/tide-client.ts` + the sign-in dialog | `TideCloakProvider` / `useTideCloak().login()` with `useDPoP` |
| `ork.encryptField` / `decryptFields` | `doEncrypt` / `doDecrypt` in the browser with the signed policy; server stores ciphertext only |
| `signPolicy` / `addPolicy` | `signRelationshipPolicy` by a `tide-realm-admin` in the enclave |
| `voteChange` | `/iga/change-requests/{id}/authorize` and `/approve` |
| `issueConsent` / `evaluateConsent` | a custom Forseti contract (Tide team) or an `attestation` the server relies on |
| `lib/tide-sim/directory.ts` | the TideCloak realm: roles `officer`, `supervisor`, `citizen`, `agency-b`, `app-admin`, realm roles `_tide_encryptor` / `_tide_decryptor`, the `groups` mapper |

## Checks that are already in place (and tested)

Server-side, on every API route: signature, issuer, `azp`, expiry, DPoP method/URL/freshness/replay/`ath`/`cnf.jkt`. A token with an
edited role, a token re-signed with another key, a stolen token with another DPoP key, a replayed proof and a Bearer-only call are all
refused (see Security lab > "Forged and stolen tokens" and TideCloak > "Try to cheat the server").
