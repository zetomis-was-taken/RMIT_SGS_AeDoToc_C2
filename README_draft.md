**Citizen Consent Quorum**: cross-agency citizen data sharing where no admin, agency, or insider can open a record alone. The citizen is part of the approval.

**1. Vision & originality.** Agencies refuse to share citizen records because sharing means trusting another agency’s admins. We propose a data exchange where a record opens only when the assigned officer, a supervisor, and the citizen approve. It is a new way for agencies to cooperate, not a better access list.

**2. Trust constraint insight.** Today any administrator or DBA can read records and edit the policies protecting them. So agencies share minimally, and citizens re-submit paperwork at every office.

**3. Value & impact.** A citizen applying for a housing subsidy approves once. The second agency sees only “income eligible: yes”, never the full file. A rogue DBA sees ciphertext.

**4. Why TideCloak matters.** Policy changes require quorum approval, and sensitive fields are encrypted with keys no single admin holds. With ordinary login and backend permissions, both demo attacks (admin self-escalation, direct database read) succeed. With TideCloak they fail.

**5. Prototype & storytelling.** The demo shows three failures: an officer opening an unassigned file, an admin granting themselves access, and a DBA querying the database. Then the legitimate flow completes with the citizen’s approval. Watch the admin attack: it is blocked pending approvers.
