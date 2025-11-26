-- ============================================================================
-- SQL to Update Bordon Commissioning Template for OCR
-- Run this in PRODUCTION database to enable OCR processing
-- ============================================================================

-- First, let's see the current state (verification query - run first to check)
-- SELECT id, name, steps, completion_callbacks FROM workflow_templates WHERE id = 'bordon-commissioning';

-- ============================================================================
-- STEP 1: Update the steps to change file_upload to photo AND add photoAnalysisConfig
-- ============================================================================

UPDATE workflow_templates
SET steps = '[
  {
    "id": "step-1760446445460",
    "type": "photo",
    "label": "External Image",
    "order": 0,
    "config": {"maxPhotos": 5, "minPhotos": 1},
    "required": true,
    "description": "Photograph of Front door and building to aid identification of property - Include house number and Plot number if shown"
  },
  {
    "id": "step-1760446548614",
    "type": "photo",
    "label": "In/Out Cable",
    "order": 1,
    "config": {"maxPhotos": 5, "minPhotos": 1},
    "required": true,
    "description": "Photograph of the In/Out cable, showing clipped cable and mushroom"
  },
  {
    "id": "step-1760446877349",
    "type": "photo",
    "label": "Light Level",
    "order": 2,
    "config": {"maxPhotos": 5, "minPhotos": 1},
    "required": true,
    "description": "Photograph of the light levels at the ONT"
  },
  {
    "id": "step-1760446634762",
    "type": "photo",
    "label": "ONT Serial Number",
    "order": 3,
    "config": {
      "maxPhotos": 5,
      "minPhotos": 1,
      "photoAnalysisConfig": {
        "enabled": true,
        "agentWorkflowId": null,
        "extractions": [
          {
            "id": "extraction-ont-serial",
            "displayLabel": "ONU/ONT Serial Number",
            "extractionPrompt": "Extract the ONT or ONU serial number from this image. Look for a label with serial number, S/N, or similar identifier on the optical network terminal device.",
            "targetTable": "address_records",
            "targetField": "onu_serial",
            "autoCreateField": false
          }
        ]
      }
    },
    "required": true,
    "description": "Clear photograph of the ONT serial number"
  },
  {
    "id": "step-1760446681244",
    "type": "photo",
    "label": "Router Credentials",
    "order": 4,
    "config": {
      "maxPhotos": 5,
      "minPhotos": 1,
      "photoAnalysisConfig": {
        "enabled": true,
        "agentWorkflowId": null,
        "extractions": [
          {
            "id": "extraction-router-serial",
            "displayLabel": "Router Serial Number",
            "extractionPrompt": "Extract the router serial number from this image. Look for S/N, Serial, or Serial Number on the router label.",
            "targetTable": "address_records",
            "targetField": "router_serial",
            "autoCreateField": false
          },
          {
            "id": "extraction-router-mac",
            "displayLabel": "Router MAC Address",
            "extractionPrompt": "Extract the router MAC address from this image. Look for MAC, MAC Address, or a format like XX:XX:XX:XX:XX:XX on the router label.",
            "targetTable": "address_records",
            "targetField": "router_mac",
            "autoCreateField": false
          }
        ]
      }
    },
    "required": true,
    "description": "Clear photograph of the Router Serial number, SSiD and Mac address"
  },
  {
    "id": "step-1760446782794",
    "type": "photo",
    "label": "As Installed Picture",
    "order": 5,
    "config": {"maxPhotos": 5, "minPhotos": 1},
    "required": true,
    "description": "Photograph of completed installation showing all devices mounted and cables clipped / tied"
  },
  {
    "id": "step-1760446950044",
    "type": "photo",
    "label": "Confirmed Broadband Connection",
    "order": 6,
    "config": {"maxPhotos": 5, "minPhotos": 1},
    "required": true,
    "description": "Screengrab of the router connected to the walled garden, or if connection live, a speed test"
  }
]'::jsonb,
completion_callbacks = '[
  {
    "id": "callback-ocr-write-ont",
    "action": "database_integration",
    "integrationName": "database",
    "fieldMappings": [
      {
        "id": "mapping-ont-serial",
        "sourceField": "onu_serial",
        "targetField": "onu_serial",
        "sourceStepId": "step-1760446634762"
      }
    ],
    "databaseConfig": {
      "targetTable": "address_records",
      "recordIdSource": "work_item_source"
    }
  },
  {
    "id": "callback-ocr-write-router",
    "action": "database_integration",
    "integrationName": "database",
    "fieldMappings": [
      {
        "id": "mapping-router-serial",
        "sourceField": "router_serial",
        "targetField": "router_serial",
        "sourceStepId": "step-1760446681244"
      },
      {
        "id": "mapping-router-mac",
        "sourceField": "router_mac",
        "targetField": "router_mac",
        "sourceStepId": "step-1760446681244"
      }
    ],
    "databaseConfig": {
      "targetTable": "address_records",
      "recordIdSource": "work_item_source"
    }
  }
]'::jsonb,
updated_at = NOW()
WHERE id = 'bordon-commissioning';

-- ============================================================================
-- VERIFICATION: Run this after the update to confirm changes
-- ============================================================================
-- SELECT 
--   id, 
--   name,
--   jsonb_array_length(steps) as step_count,
--   completion_callbacks IS NOT NULL as has_callbacks,
--   jsonb_array_length(completion_callbacks) as callback_count
-- FROM workflow_templates 
-- WHERE id = 'bordon-commissioning';

-- ============================================================================
-- IMPORTANT: After running this SQL, you need to REINITIALIZE existing work items
-- that use this template. The workflow execution records store a snapshot of the
-- template at creation time. Use this SQL to delete existing executions so they
-- get recreated with the new template:
-- ============================================================================
-- WARNING: This deletes workflow progress! Only run if you want to reset:
--
-- DELETE FROM work_item_workflow_execution_steps 
-- WHERE execution_id IN (
--   SELECT id FROM work_item_workflow_executions 
--   WHERE workflow_template_id = 'bordon-commissioning'
-- );
--
-- DELETE FROM work_item_workflow_executions 
-- WHERE workflow_template_id = 'bordon-commissioning';

-- ============================================================================
-- ALSO IMPORTANT: For OCR to work, work items must have a work_item_sources 
-- record linking them to an address_records entry. Check with:
-- ============================================================================
-- SELECT 
--   wi.id as work_item_id,
--   wi.title,
--   wis.source_table,
--   wis.source_id as address_record_id
-- FROM work_items wi
-- LEFT JOIN work_item_sources wis ON wi.id = wis.work_item_id
-- WHERE wi.workflow_template_id = 'bordon-commissioning'
-- LIMIT 10;
