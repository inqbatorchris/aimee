# Customer Mapping Fix Plan

## 🔍 Issues Identified

### 1. **CRITICAL: Google Maps Integration Missing** ❌
**Error Found in Logs:**
```
Error searching customers by location: Error: Google Maps integration not configured for this organization
at GeocodingService.initialize (/home/runner/workspace/server/services/geocoding.ts:83:13)
```

**Impact:** Customer search fails completely - no customers appear on map after clicking "Search Customers"

**Root Cause:** The geocoding service requires a Google Maps API key to convert addresses to coordinates, but the integration hasn't been set up for your organization.

---

### 2. **UI Issue: Dropdown Z-Index Problem** ⚠️
**Symptom:** Service area dropdown menu renders behind/underneath the filter panel

**Root Cause:** 
- Filter panel has `z-[1000]`
- Radix UI Select dropdown (portaled) may have lower or same z-index
- CSS stacking context conflict

---

### 3. **Missing Feature: Customer Location Filter** ❌
**Current State:** Removed filter by location option completely
**User Expectation:** "Filter by location is the most important" - wants this feature visible

**Previous Issue:** `/admin/config/locations` endpoint returns no data
**User Priority:** This is their PRIMARY use case

---

### 4. **Missing UX: Loading Indicators** ⚠️
**Symptom:** "Nothing in the filter container to show that items are loading in the background"

**Current Issues:**
- No loading state while syncing locations on page load
- No visual feedback during background operations
- Users don't know if system is working

---

## ✅ Proposed Solutions

### **Task 1: Set Up Google Maps Integration**
**Priority: CRITICAL** 🔴

**Actions:**
1. Check if Google Maps integration exists in the system
2. If not, search for Google Maps integration using `search_integrations` tool
3. Set up Google Maps connector/integration for the organization
4. Obtain and configure Google Maps API key
5. Test geocoding service initialization

**Alternative Solution (if Google Maps unavailable):**
- Use OpenStreetMap Nominatim API (free, no API key required)
- Modify `GeocodingService` to support alternative geocoding provider
- Less accurate but functional for UK addresses

---

### **Task 2: Fix Dropdown Z-Index**
**Priority: HIGH** 🟠

**Actions:**
1. Increase SelectContent z-index in global CSS or component
2. Add Radix UI portal configuration to ensure dropdown renders above filter panel
3. Ensure dropdown renders at `z-[2000]` or higher
4. Test dropdown visibility with filter panel open

**Code Changes:**
```css
/* In index.css or component */
[data-radix-select-content] {
  z-index: 2000 !important;
}
```

OR in component:
```tsx
<SelectContent className="z-[2000]">
```

---

### **Task 3: Restore Customer Location Filter**
**Priority: HIGH** 🟠

**Actions:**
1. Re-add filter type selector (Service Area vs Customer Location)
2. Keep both filter options visible and working
3. Update UI to show both dropdown options clearly
4. Fix customer location endpoint OR use alternative approach

**Endpoint Options to Try:**
```
Option 1: /admin/config/locations (current - returns empty)
Option 2: /admin/locations/location (singular)
Option 3: /config/main/locations
Option 4: Use customer records directly to extract unique location values
```

**Fallback Solution:**
- Query customers first, extract unique `location_id` values
- Build location dropdown from actual customer data
- May be slower but guarantees accuracy

---

### **Task 4: Add Loading Indicators**
**Priority: MEDIUM** 🟡

**Actions:**
1. Add spinner/skeleton in filter panel during initial sync
2. Show loading state in dropdown while fetching locations
3. Add loading overlay during customer search
4. Display sync status messages clearly

**UI Changes:**
- Initial page load: Show "Syncing service areas..." with spinner
- Dropdown loading: Skeleton items or "Loading locations..."
- Search action: Disable button + spinner "Searching customers..."
- Background sync: Subtle indicator in corner

---

### **Task 5: Improve Error Handling & User Feedback**
**Priority: MEDIUM** 🟡

**Actions:**
1. Display clear error messages when Google Maps not configured
2. Show "Setup Required" message with instructions
3. Gracefully handle missing integrations
4. Add retry mechanisms for failed API calls

**Error Messages:**
- "Google Maps setup required to geocode addresses"
- "Click here to configure Google Maps integration"
- "Service areas synced successfully"
- "X customers found in selected area"

---

## 📋 Implementation Order

### Phase 1: Critical Fixes (Required for functionality)
1. ✅ Set up Google Maps integration OR implement fallback geocoder
2. ✅ Fix dropdown z-index issue

### Phase 2: Feature Restoration (User priority)
3. ✅ Restore customer location filter option
4. ✅ Fix customer locations endpoint or implement fallback

### Phase 3: UX Improvements (Polish)
5. ✅ Add comprehensive loading indicators
6. ✅ Improve error handling and user feedback

---

## 🧪 Testing Checklist

After implementation:
- [ ] Service area dropdown opens above filter panel
- [ ] Customer location dropdown opens above filter panel  
- [ ] Clicking "Search Customers" successfully geocodes addresses
- [ ] Customer markers appear on map after search
- [ ] Loading spinners show during all async operations
- [ ] Error messages display clearly if integration missing
- [ ] Both filter types (service area + customer location) work correctly

---

## 📝 Technical Details

### Current Splynx Integration:
- **Service Areas Work:** `/admin/tariffs/internet` ✅
- **Customer Locations Broken:** `/admin/config/locations` ❌
- **Customer Search:** `/admin/customers/customer?tariff_id=X` or `?location_id=X`

### Z-Index Stack:
- Map: 0-400 (Leaflet default)
- Filter Panel: 1000
- Dropdowns: Need 2000+
- Modals/Dialogs: 3000+

### Dependencies:
- Google Maps Geocoding API (or alternative)
- Splynx API with correct endpoints
- Radix UI Select component
- React Query for state management
