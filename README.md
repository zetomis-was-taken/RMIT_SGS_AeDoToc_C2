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

Requirements: Docker, Node.js 20.9+ (tested on 24), npm.

### 1. Run TideCloak (port 8080)

```bash
docker run --name mytidecloak -d \
  -v "$HOME/tidecloak-data:/opt/keycloak/data/h2" \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
  tideorg/tidecloak-dev:latest
```

Keep it on port 8080: the Tide enrolment flow signs URLs for that origin.

### 2. Provision the realm and enrol the first admin

```bash
cd app
npm install
SUBSCRIPTION_EMAIL=you@example.com bash init/tcinit.sh
```

The script creates the realm and client, activates the free licence, and prints an enrolment link. Open it in a normal browser window (third-party cookies allowed), complete the Tide enrolment, and the script finishes by writing `app/tidecloak.json`.

### 3. Configure secrets and start the app

```bash
cp .env.example .env.local   # then set DEMO_MASTER_KEY=$(openssl rand -hex 32) and SESSION_SECRET=$(openssl rand -hex 24)
npm run dev                  # http://localhost:3000
```

The demo runs with built-in demo identities, so it works before TideCloak login is connected. Open the **Security lab** page and press **Run all scenarios** to see the three attacks fail, or sign in as each person and walk through the consent flow. **Reset demo data** restores the starting state.

### 4. Database attack, from a terminal

```bash
node scripts/dba-read.mjs     # reads data/citizen.db directly: ciphertext only
```

## Demo video

`demo.mp4` (placeholder, added after recording).
