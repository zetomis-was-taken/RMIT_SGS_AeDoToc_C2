# Citizen Consent Quorum

[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

**Citizen Consent Quorum** lets agencies share citizen records so that no admin, agency or insider can open one alone: the citizen is part of the approval.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

Agencies refuse to share records because sharing means trusting another agency's admins. A record opens only when the assigned officer, a supervisor and the citizen all approve. Authority is not a standing privilege held by a person; it emerges only when those parties agree.

### 2. Trust constraint insight

Today any administrator or DBA can read records and rewrite the policies guarding them, so agencies share minimally and citizens re-submit paperwork everywhere. Remove that and agencies can cooperate without trusting each other's admins.

### 3. Value & impact

A citizen applying for a housing subsidy approves once. The second agency learns only "income eligible: yes", never the file. A rogue DBA sees ciphertext.

### 4. Why TideCloak matters

Each way an insider could gain authority alone maps to TideCloak. Roles come from a threshold-signed token, never client state. "Assigned to this case" is a signed relationship policy. Policy changes are IGA change requests needing a quorum of `tide-realm-admin` holders, which the requesting admin cannot join or lower. Fields are encrypted under keys split across ORKs, so no admin or DBA holds one. With ordinary login and backend permissions, both attacks succeed.

**Status:** per the organisers' plan, TideCloak is *simulated* (3 ORKs, DPoP tokens, roles, quorum). [docs/TIDE_PLAN.md](docs/TIDE_PLAN.md) lists what is simulated and the swap-in to the real SDK.

### 5. Prototype & storytelling

Open `/app/demo`. Three attacks fail: an officer on an unassigned file, an admin granting himself access, a DBA reading ciphertext. Then the legitimate flow: supervisor and citizen approve, the record opens for 15 minutes, Agency B gets only yes/no. Watch the admin's change stay pending.

## Setup

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

[`demo.mp4`](demo.mp4) (1:41, 1080p): the possibility, the trust constraint, three attacks failing, the legitimate consent flow, and what changes. Built with Remotion from real screenshots of the running app (`video/`), narrated with a locally generated VoiceStudio voice. Script: [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md).
