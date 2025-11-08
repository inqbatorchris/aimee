# Splynx API v2.0 Documentation

## Base URL
`https://YOUR_SPLYNX_DOMAIN/api/2.0/`

## Authentication Methods

### 1. Basic Authentication
- Format: `Authorization: Basic <base64(api_key:api_secret)>`
- Requires "Unsecure access" enabled in API key settings
- Example: `Basic YXBpX2tleTphcGlfc2VjcmV0`

### 2. Bearer Token (Access Token)
- Format: `Authorization: Splynx-EA (access_token=YOUR_ACCESS_TOKEN)`
- Token expires after 30 minutes
- Generate token via `/api/2.0/admin/auth/tokens`

### 3. Signature Authentication
- Format: `Authorization: Splynx-EA (key=<key>&nonce=<nonce>&signature=<signature>)`
- Signature generated using HMAC-SHA256

## Common Test Endpoints

### For Basic Auth Testing
- `GET /admin/customers/customer?limit=1` - Get first customer (requires customer read permission)
- `GET /admin/administrators/administrator` - List administrators
- `GET /admin/tariffs/internet` - List internet tariffs

### For Token Management
- `POST /admin/auth/tokens` - Generate access token
- `GET /admin/auth/tokens/current` - Get current token info (requires valid access token)
- `GET /admin/auth/tokens/{refresh_token}` - Renew token

## Token Generation Examples

### Generate Token with API Key
```json
POST /admin/auth/tokens
{
    "auth_type": "api_key",
    "key": "YOUR_API_KEY",
    "nonce": 1234567890,
    "signature": "GENERATED_SIGNATURE"
}
```

### Generate Token with Admin Credentials
```json
POST /admin/auth/tokens
{
    "auth_type": "admin",
    "login": "admin_username",
    "password": "admin_password"
}
```

## Response Codes
- 200: OK (GET/HEAD)
- 201: Created (POST)
- 202: Accepted (PUT)
- 204: No Content (DELETE)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 405: Method Not Allowed
- 500: Internal Server Error

## Error Response Format
```json
{
    "error": {
        "message": "Description of error",
        "code": 400,
        "internal_code": "ERROR_CODE"
    }
}
```

## Search and Filter Parameters
```php
$params = [
    'main_attributes' => [
        'field_name' => ['OPERATOR', 'value']
    ],
    'order' => ['id' => 'DESC'],
    'limit' => 10,
    'offset' => 20
];
```

## Supported Operators
- '=', '!=', '>=', '<=', '>', '<', '<>'
- 'IS', 'REGEXP', 'BETWEEN', 'LIKE', 'IN', 'FIND_IN_SET'

## Incremental Data Fetching Optimization

### Overview
To reduce API payload and improve performance, the Splynx integration now supports incremental data fetching. Instead of retrieving all records every time, workflows can fetch only records that have been added or modified since the last successful run.

### How It Works

1. **Timestamp Tracking**: Each workflow stores a `lastSuccessfulRunAt` timestamp in the database
2. **Date Filtering**: When a workflow runs, it passes this timestamp to the Splynx service via the `sinceDate` parameter
3. **Incremental Updates**: The workflow uses `updateType: 'increment'` to add new record counts to existing values instead of overwriting them
4. **Automatic Updates**: After each successful workflow execution, the system updates `lastSuccessfulRunAt` to the current time

### Example: Lead Count Workflow

```json
{
  "steps": [
    {
      "id": "step-1",
      "name": "Get new lead count",
      "type": "integration_action",
      "config": {
        "action": "count_leads",
        "integrationId": 2,
        "resultVariable": "leadCount"
      }
    },
    {
      "id": "step-2",
      "name": "Increment total leads",
      "type": "strategy_update",
      "config": {
        "type": "key_result",
        "targetId": 15,
        "value": "{leadCount}",
        "updateType": "increment"
      }
    }
  ]
}
```

### Implementation Details

**Date Filtering in API Calls**:
```javascript
// First run (no lastSuccessfulRunAt)
params.main_attributes.date_add = ['>=', '2025-01-01'];

// Subsequent runs (with lastSuccessfulRunAt)
params.main_attributes.date_add = ['>=', '2025-01-27'];
```

**Update Types**:
- `set_value`: Replace the current value (default)
- `increment`: Add to the current value (for accumulating counts)
- `percentage`: Calculate percentage of target value

### Benefits

1. **Reduced API Payload**: Only fetch records added/modified since last run
2. **Lower API Usage**: Fewer data transferred per request
3. **Faster Execution**: Smaller datasets process more quickly
4. **Accurate Accumulation**: Incremental updates prevent data loss or duplication

### Console Logs

The system provides detailed logging to track incremental fetching:

```
[SPLYNX getLeadCount] 🔄 INCREMENTAL MODE: Fetching leads since 2025-01-27
[ActionHandlers] 🔄 Using incremental mode since: 2025-01-27T10:30:00.000Z
[WorkflowExecutor] 📅 Updated lastSuccessfulRunAt for incremental fetching
```

### Best Practices

1. **Use for hourly/frequent workflows**: Incremental fetching is most beneficial for workflows that run multiple times per day
2. **Combine with increment updateType**: When counting records, always use `increment` to accumulate totals
3. **Monitor logs**: Check console logs to verify incremental mode is active
4. **Handle first run**: The system automatically handles the first run when no `lastSuccessfulRunAt` exists