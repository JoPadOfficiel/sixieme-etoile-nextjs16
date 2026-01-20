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

## 🚀 EXECUTION DASHBOARD (BACKLOG FOCUS)

### 🛑 PHASE 1: REMAINING INFRASTRUCTURE (Epic 26/27)
*Critical items remaining before full rollout.*

| Order | Story | Agent | Link to Prompt |
| :--- | :--- | :--- | :--- |
| **1** | **26.9 Operational Detach** | 🧠 Big | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-269-operational-detach-logic) |
| **2** | **27.7 Map Context** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-277-live-map---mission-context-layer) |
| **3** | **27.10 Conflict Logic** | 🧠 Medium | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2710-conflict-detection) |

---

### 🎨 PHASE 2: UI POLISH & ENHANCEMENTS (Backlog)
*Items to refine the experience.*

| Story | Feature | Link to Prompt |
| :--- | :--- | :--- |
| **26.19** | **Quote Cart UX** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2619-enhanced-quote-cart-interactions) |
| **26.20** | **Glassmorphism** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2620-visual-polish-glassmorphism) |
| **26.21** | **Cart Templates** | [👉 GO TO PROMPT](EPIC-26-PROMPTS.md#story-2621-template-saving-for-multi-item-quotes) |
| **27.8** | **Map Suggestions** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-278-map---smart-assignment-suggestions) |
| **27.12** | **Gantt Zoom** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2712-gantt---time--zoom-controls) |
| **27.14** | **Export Sched.** | [👉 GO TO PROMPT](EPIC-27-PROMPTS.md#story-2714-export-schedule) |

---

### 📦 PHASE 3: EPIC 28 - ORDER MANAGEMENT (NEW!)
*Launch only after Phase 1 is stable.*

**Part A: Infrastructure**
| Story | Feature | Link to Prompt |
| :--- | :--- | :--- |
| **28.1** | **Order Schema** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-281-order-entity--prisma-schema) |
| **28.2** | **Order API** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-282-order-state-machine--api) |
| **28.3** | **Dossier UI** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-283-dossier-view-ui---skeleton--tabs) |

**Part B: Intelligent Spawning**
| Story | Feature | Link to Prompt |
| :--- | :--- | :--- |
| **28.4** | **Spawn Engine** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-284-spawning-engine---trigger-logic) |
| **28.5** | **Group Spawn** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-285-group-spawning-logic-multi-day) |
| **28.6** | **Opt. Dispatch** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-286-optional-dispatch--force-enable) |
| **28.7** | **Manual Items** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-287-manual-item-handling-ui) |
| **28.13** | **Free Missions** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-2813-ad-hoc-free-missions) |

**Part C: Flexible Invoicing**
| Story | Feature | Link to Prompt |
| :--- | :--- | :--- |
| **28.8** | **Detach Invoice** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-288-invoice-generation---detached-snapshot) |
| **28.9** | **Invoice Editor** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-289-invoice-ui---full-editability) |
| **28.10** | **Feedback Loop** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-2810-execution-feedback-loop-placeholders) |
| **28.11** | **Partial Bill** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-2811-partial-invoicing) |
| **28.12** | **Pending Upsell** | [👉 GO TO PROMPT](EPIC-28-PROMPTS.md#story-2812-post-mission-pending-charges) |

