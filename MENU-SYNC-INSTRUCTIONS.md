# Menu Synchronization Instructions - Country Connect

## Quick Summary
Your **production menu** for Country Connect is missing items compared to development. This script adds them.

## What's Missing in Production
- **Strategy & OKRs section**: All 5 items (Mission & Vision, Objectives, Work Items, Check-in Dashboard, Knowledge Base)
- **Tools & Agents section**: 2 items (Agent Builder, Integrations Hub)

## How to Sync

### Step 1: Backup (IMPORTANT!)
```sql
-- Run this on your PRODUCTION database first
CREATE TABLE menu_items_backup_20251015 AS SELECT * FROM menu_items WHERE organization_id = 4;
CREATE TABLE menu_sections_backup_20251015 AS SELECT * FROM menu_sections WHERE organization_id = 4;
```

### Step 2: Run the Sync Script
```bash
psql $PRODUCTION_DATABASE_URL -f sync-menu-to-production.sql
```

### Step 3: Verify
The script will automatically show verification results. You should see:
- **Strategy & OKRs**: 5 items
- **Tools & Agents**: 3 items  
- **Network**: 4 items

## What the Script Does

### Adds to Strategy & OKRs:
1. Mission & Vision → `/strategy/mission-vision`
2. Objectives → `/strategy/objectives`
3. Work Items → `/strategy/work-items`
4. Check-in Dashboard → `/strategy/checkin`
5. Knowledge Base → `/strategy/knowledge-base`

### Adds to Tools & Agents:
1. Agent Builder → `/agents`
2. Integrations Hub → `/integrations`
3. Workflow Templates → `/templates/workflows` (already exists, reordered)

### Network Section:
Already correct, just reorders items for consistency

## Section IDs Reference
- Section 12 = Strategy & OKRs
- Section 13 = Tools & Agents
- Section 21 = Network

## Rollback (if needed)
```sql
-- If something goes wrong, restore from backup:
BEGIN;
DELETE FROM menu_items WHERE organization_id = 4;
INSERT INTO menu_items SELECT * FROM menu_items_backup_20251015;
COMMIT;
```

## File to Use
**`sync-menu-to-production.sql`** - Main sync script with all safety checks

---

**Note**: The script uses `ON CONFLICT DO NOTHING` so it's safe to run multiple times. It won't duplicate items.
