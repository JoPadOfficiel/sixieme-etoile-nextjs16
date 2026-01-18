# MASTER ORCHESTRATION PLAN - PARALLEL AGENT DEPLOYMENT

> **Objective:** Deploy Epics 26 (Yolo Billing) and 27 (Unified Dispatch) using multiple AI Agents simultaneously.
> **Strategy:** Split Deep Logic (Big Agents) from UI Components (Small Agents).

## 🚀 GLOBAL EXECUTION FLOW

### STEP 1: FOUNDATION (Critical Path - Single Thread)
**Status:** 🛑 BLOCKER for everything else.
**Agent:** 1 "Big Agent" (Antigravity or Windsurf/Opus)

1.  **Run Prompt 26.1 (Schema):** Update DB, create migration.
2.  **Run Prompt 26.3 (Zod):** Secure types.
3.  **Run Prompt 27.2 (Sync Service):** Create the backend bridge.

*Once Step 1 is done, you can UNLEASH the parallel swarm.*

---

### STEP 2: PARALLEL SWARM (Multi-Threaded)
**Capacity:** You can run these on 10-20 separate "Small Agents" (Google Jules/Cursor) simultaneously.

**Team A: Billing UI (Epic 26)**
-   Agent 1 -> **Prompt 26.5** (Universal Row)
-   Agent 2 -> **Prompt 26.6** (Click-to-Edit)
-   Agent 3 -> **Prompt 26.8** (Slash Menu)
-   Agent 4 -> **Prompt 26.10** (Profitability Badge)

**Team B: Dispatch UI (Epic 27)**
-   Agent 5 -> **Prompt 27.1** (Dispatch Shell)
-   Agent 6 -> **Prompt 27.3** (Gantt Core)
-   Agent 7 -> **Prompt 27.5** (Backlog Sidebar)
-   Agent 8 -> **Prompt 27.6** (Map Driver Layer)
-   Agent 9 -> **Prompt 27.11** (Inspector Panel)

**Team C: PDF Generation (Specialist Agents)**
-   Agent 10 -> **Prompt 26.11** (Commercial PDF)
-   Agent 11 -> **Prompt 26.12** (Mission PDF)

---

### STEP 3: INTEGRATION & LOGIC (Sequential per Feature)
**Agent:** Big/Medium Agents

1.  **Billing Logic:**
    -   Run **Prompt 26.4** (API Aggregation) -> Connects UI (Team A) to DB (Step 1).
    -   Run **Prompt 26.7** (Drag & Drop) -> Adds complexity to Team A's work.
    -   Run **Prompt 26.9** (Detach Logic) -> Safety rail.

2.  **Dispatch Logic:**
    -   Run **Prompt 27.9** (Assignment D&D) -> Connects Team B components.
    -   Run **Prompt 27.10** (Conflict Detection).
    -   Run **Prompt 27.8** (Smart Suggestions).

---

### STEP 4: MIGRATION & POLISH
1.  **Run Prompt 26.2:** Migration Script (Safely transform old data).
2.  **Run Prompt 26.13 / 26.14:** Bonus features (Templates, Undo).

---

## 📂 FILE INDEX

*   **Billing Prompts:** `_bmad-output/implementation-prompts/EPIC-26-PROMPTS.md`
*   **Dispatch Prompts:** `_bmad-output/implementation-prompts/EPIC-27-PROMPTS.md`
