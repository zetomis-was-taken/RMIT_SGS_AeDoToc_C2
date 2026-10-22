# Citizen Consent Quorum

[![Built with TideCloak](https://img.shields.io/badge/Built%20with-TideCloak-2727e6)](https://tide.org)

<!-- TODO: paste Tide's official "Required README" template above this line (tide.org/unlocked, "Copy README template"). -->

**Citizen Consent Quorum** is cross-agency citizen data sharing where no admin, agency, or insider can open a record alone. The citizen is part of the approval.

## Project overview

**1. Vision & originality.** Agencies refuse to share citizen records because sharing means trusting another agency's admins. We propose a data exchange where a record opens only when the assigned officer, a supervisor, and the citizen approve. It is a new way for agencies to cooperate, not a better access list.

**2. Trust constraint insight.** Today any administrator or DBA can read records and edit the policies protecting them. So agencies share minimally, and citizens re-submit paperwork at every office.

**3. Value & impact.** A citizen applying for a housing subsidy approves once. The second agency sees only "income eligible: yes", never the full file. A rogue DBA sees ciphertext.

**4. Why TideCloak matters.** Policy changes require quorum approval, and sensitive fields are encrypted with keys no single admin holds. With ordinary login and backend permissions, both demo attacks (admin self-escalation, direct database read) succeed. With TideCloak they fail.

**5. Prototype & storytelling.** The demo shows three failures: an officer opening an unassigned file, an admin granting themselves access, and a DBA querying the database. Then the legitimate flow completes with the citizen's approval. Watch the admin attack: it is blocked pending approvers.

## Setup instructions

Requirements: Node.js 20.9+ (tested on 24, which provides `node:sqlite`) and npm. No Docker and no TideCloak server are needed.

```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

**TideCloak is simulated** (the organisers allowed this while the Tide fabric was overloaded). On first run the app generates a simulated realm in
`app/data/tide-sim/`: a realm key and an encryption key, each split into three shares held by three simulated ORKs, plus `tidecloak.sim.json`
shaped like a real adapter file. Sign-in, DPoP-bound tokens, roles, signed relationship policies, IGA change-request quorum and field encryption
all go through that layer. [docs/TIDE_PLAN.md](docs/TIDE_PLAN.md) maps every feature to the real Tide capability, says what is and is not
simulated, and lists the swap-in points for the real `@tidecloak/nextjs` SDK.

- `/` is the landing page (the vault at the top is interactive: switch on the three approvals).
- `/app` is the operations console. Pick a person, sign in (demo password `demo`), and the menu, data and actions follow the token's roles.
- `/app/demo` is the guided demo: three attacks that fail, the legitimate flow with the citizen's approval, then the audit proof.
- `/app/lab` runs ten scenarios on the live policy engine, including forged tokens, an ORK outage and the quorum.
- `/app/tide` shows your decoded token, the verification steps, buttons that try to cheat the server, the ORK network and the signed policies.

Reset the data at any time with **Reset demo data** in the Security lab.

### Database attack, from a terminal

```bash
node scripts/dba-read.mjs     # reads data/citizen.db directly: ciphertext only
```

### Using a real TideCloak later

`app/init/tcinit.sh` provisions a real realm (Docker image `tideorg/tidecloak-dev`, port 8080) and enrols the first admin; the original
scaffold is kept in `app/app/home`, `app/app/protected` and `app/proxy.ts`. Follow the swap-in table in `docs/TIDE_PLAN.md`.

## Demo video

`demo.mp4` (placeholder, added after recording).
