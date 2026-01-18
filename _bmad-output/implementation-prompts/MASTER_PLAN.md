# 🎮 BMAD MASTER CONTROL CENTER
> **Project:** Sixième Etoile (Epics 26 & 27)
> **Mode:** Massive Parallel Execution
> **Status:** 🟢 READY TO LAUNCH

This document is your **Command Center**. Follow the sequences strictly.
Use **Cmd+Click** on the links below to jump directly to the prompt text.

---

## 📊 VISUAL ATTACK PLAN

```mermaid
graph TD
    %% CLASSES
    classDef critical fill:#f96,stroke:#333,stroke-width:2px;
    classDef swarm fill:#9cf,stroke:#333,stroke-width:1px;
    classDef integration fill:#c9f,stroke:#333,stroke-width:1px;
    classDef polish fill:#ddd,stroke:#333,stroke-width:1px;

    %% STEP 1: FOUNDATION
    subgraph S1 ["PHASE 1: FOUNDATION (Blocker)"]
        direction TB
        P1[26.1 DB Schema]:::critical
        P2[26.3 Zod Validations]:::critical
        P3[27.2 Sync Service]:::critical
        P1 --> P2
        P1 --> P3
    end

    %% PHASE 2: UI SWARM (STACKED VERTICALLY)
    S1 --> S2_Billing
    S1 --> S2_Dispatch
    S1 --> S2_PDF

    subgraph S2_Billing ["PHASE 2A: BILLING UI"]
        direction TB
        B1[26.5 Universal Row]:::swarm
        B2[26.6 Click-to-Edit]:::swarm
        B3[26.8 Slash Menu]:::swarm
        B4[26.10 Profitability]:::swarm
    end

    subgraph S2_Dispatch ["PHASE 2B: DISPATCH UI"]
        direction TB
        D1[27.1 Dispatch Shell]:::swarm
        D2[27.3 Gantt Core]:::swarm
        D3[27.4 Mission Card]:::swarm
        D4[27.5 Backlog Sidebar]:::swarm
        D5[27.6 Map Drivers]:::swarm
        D6[27.11 Inspector]:::swarm
    end

    subgraph S2_PDF ["PHASE 2C: PDF TEAM"]
        direction TB
        PDF1[26.11 Comm. PDF]:::swarm
        PDF2[26.12 Mission PDF]:::swarm
    end

    %% PHASE 3: INTEGRATION
    S2_Billing --> I1
    S2_Dispatch --> I2
    
    subgraph S3 ["PHASE 3: INTEGRATION"]
        direction TB
        I1[26.4 API & Aggregation]:::integration
        I2[27.9 Assignment D&D]:::integration
        I3[26.9 Operational Detach]:::integration
        I4[27.10 Conflict Logic]:::integration
        I1 --> I3
        I2 --> I4
    end

    %% PHASE 4: POLISH
    S3 --> S4
    subgraph S4 ["PHASE 4: POLISH & MIGRATION"]
        direction TB
        Pol1[26.2 Migration]:::polish
        Pol2[26.13 Templates]:::polish
        Pol3[26.14 Undo/Redo]:::polish
    end

    %% CLICKABLE LINKS
    click P1 href "EPIC-26-PROMPTS.md#story-261-database-schema-update-for-hybrid-blocks"
    click B1 href "EPIC-26-PROMPTS.md#story-265-ui-universal-block-row-component"
```

---

## 🚀 EXECUTION DASHBOARD (CLICK & COPY)

### 🛑 PHASE 1: CRITICAL INFRASTRUCTURE
*Run this on your **BEST** Agent (Antigravity/Windsurf) before anything else.*

| Order | Story | Agent | Link to Prompt |
| :--- | :--- | :--- | :--- |
| **1** | **26.1 Schema** | 🧠 Big | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-261-database-schema-update-for-hybrid-blocks) |
| **2** | **26.3 Zod** | 🧠 Big | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-263-hybrid-block-validation-layer-zod) |
| **3** | **27.2 Sync** | 🧠 Big | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-272-mission-synchronization-service) |

---

### ⚡️ PHASE 2: UI SWARM (Massive Parallel)
*Once Phase 1 is done, assign each line to a separate "Google Jules" or Agent.*

**Billing Team (Epic 26)**
| Story | Component | Link to Prompt |
| :--- | :--- | :--- |
| **26.5** | **Universal Row** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-265-ui-universal-block-row-component) |
| **26.6** | **Click-to-Edit** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-266-ui-click-to-edit-inline-forms) |
| **26.8** | **Slash Menu** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-268-ui-slash-commands-menu) |
| **26.10** | **Profitability** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2610-real-time-profitability-computation) |

**Dispatch Team (Epic 27)**
| Story | Component | Link to Prompt |
| :--- | :--- | :--- |
| **27.1** | **Shell Layout** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-271-dispatch-shell--navigation) |
| **27.3** | **Gantt Core** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-273-gantt-core-timeline-rendering) |
| **27.4** | **Mission Card** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-274-hybrid-mission-rendering) |
| **27.5** | **Backlog Side** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-275-unassigned-backlog-sidebar) |
| **27.6** | **Driver Map** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-276-live-map---driver-locations) |
| **27.11** | **Inspector** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2711-inspector-panel---quick-actions) |

**PDF Team**
| Story | Document | Link to Prompt |
| :--- | :--- | :--- |
| **26.11** | **Comm. PDF** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2611-pdf-generator-display-mode) |
| **26.12** | **Mission PDF** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2612-pdf-generator-mission-order) |

---

### 🔗 PHASE 3: INTEGRATION (Logic & State)
*Requires Phase 2 components to be ready.*

| Story | Feature | Agent | Link to Prompt |
| :--- | :--- | :--- | :--- |
| **26.4** | **API CRUD** | 🧠 Big | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-264-backend-api-crud-for-nested-lines) |
| **26.7** | **Drag & Drop** | ⚡️ Small | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-267-ui-drag--drop-reordering) |
| **26.9** | **Detach Logic** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-269-operational-detach-logic) |
| **27.9** | **Assign D&D** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-279-dispatch-actions---drag--drop-assignment) |
| **27.10** | **Conflicts** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2710-conflict-detection) |
| **27.13** | **Real-time** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2713-real-time-updates) |

---

### 🎨 PHASE 4: POLISH & MIGRATION

| Story | Feature | Link to Prompt |
| :--- | :--- | :--- |
| **26.2** | **Migration** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-262-backward-compatibility-migration-script) |
| **26.13** | **Templates** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2613-block-presets-templates) |
| **26.14** | **Undo/Redo** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2614-undo-redo-history-support) |
