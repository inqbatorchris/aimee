# Customer Locations API Analysis

## Current Status

### Issue: "No customer locations found in Splynx"

---

## API Endpoints Being Used

### 1. **Service Area Filter** (Working ✓)
- **Endpoint**: `/admin/tariffs/internet`  
- **Purpose**: Fetches internet tariffs to use as service areas
- **Database Column**: Saved to `splynx_locations` table
- **Filter Parameter**: `tariff_id` 
- **Customer Search**: `${baseUrl}/admin/customers/customer?tariff_id=${locationId}`

### 2. **Customer Location Filter** (BROKEN ❌)
- **Current Endpoint**: `/admin/config/locations` (previously `/admin/locations/locations`)
- **Purpose**: Fetch Splynx locations for customer location field
- **Filter Parameter**: `location_id`
- **Customer Search**: `${baseUrl}/admin/customers/customer?location_id=${locationId}`

---

## Problem Diagnosis

### The `/admin/config/locations` endpoint may:
1. **Not exist** in your Splynx version
2. **Return empty array** (no locations configured in Splynx)
3. **Use different endpoint path**

---

## Splynx API Endpoint Options to Try

Based on Splynx API documentation, the customer location endpoint could be:

1. `/admin/config/locations` (current)
2. `/admin/locations/location` (singular)
3. `/config/main/locations`
4. Or locations might not be a separate entity - they could be embedded in customer records

---

## What Column/Field is Used

### In Splynx Customers:
- **Field**: `location_id`
- **Type**: Integer/String ID referencing a location
- **API Parameter**: `?location_id=X`

### In Our Database (`splynx_locations` table):
```sql
splynx_location_id VARCHAR(50)  -- Stores the Splynx location ID
name VARCHAR(255)                -- Location name
location_type VARCHAR(50)        -- Either 'tariff' or 'location'
metadata JSONB                   -- Additional data
```

---

## Logging Added

The following detailed logging has been added to `/api/splynx/customer-locations`:

```
[CUSTOMER LOCATIONS] Fetching for org: X
[CUSTOMER LOCATIONS] 📡 Calling Splynx API: https://manage.country-connect.co.uk/api/2.0/admin/config/locations
[CUSTOMER LOCATIONS] 📡 Base URL: https://manage.country-connect.co.uk/api/2.0
[CUSTOMER LOCATIONS] 📡 Using auth header: Present/Missing
[CUSTOMER LOCATIONS] Response status: XXX
[CUSTOMER LOCATIONS] ✅ Received data type: array/object
[CUSTOMER LOCATIONS] ✅ Data length: X
[CUSTOMER LOCATIONS] ✅ First item sample: {...}
```

---

## Next Steps to Fix

### Option 1: Check Splynx Documentation
Look at your Splynx API docs to find the correct locations endpoint

### Option 2: Test API Manually
Use Postman/curl to test these endpoints:
```bash
# Try option 1
curl -H "Authorization: YOUR_AUTH" https://manage.country-connect.co.uk/api/2.0/admin/config/locations

# Try option 2  
curl -H "Authorization: YOUR_AUTH" https://manage.country-connect.co.uk/api/2.0/admin/locations/location

# Try option 3
curl -H "Authorization: YOUR_AUTH" https://manage.country-connect.co.uk/api/2.0/config/main/locations
```

### Option 3: Check Customer Record
Fetch a customer and see what location data they have:
```bash
curl -H "Authorization: YOUR_AUTH" https://manage.country-connect.co.uk/api/2.0/admin/customers/customer/CUSTOMER_ID
```
Look for `location_id` or `location` fields

---

## Integration Log Capture

The integration settings should log all API calls. Check:
1. Integration connection logs
2. Splynx API response logs  
3. Error messages from failed requests

The detailed logging added will show:
- Exact URL being called
- Response status codes
- Response data structure
- Any errors encountered
