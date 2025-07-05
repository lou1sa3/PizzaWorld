# Customer Analytics Role-Based Access Issue - Analysis & Solution

## Problem Summary

The customer analytics functionality was only working for HQ users but breaking for STATE_MANAGER and STORE_MANAGER accounts. This was due to two main issues:

### 1. Missing Materialized Views
The customer analytics functionality was trying to use materialized views that didn't exist in the database:
- `customer_lifetime_value` - for customer lifetime value analysis
- `customer_retention_analysis` - for customer retention analysis

### 2. Incomplete Role-Based Implementation
- **Customer Acquisition Analytics**: STORE_MANAGER roles were getting empty data (`List.of()`) instead of store-specific customer acquisition data
- **Customer Lifetime Value & Retention**: All roles were failing due to missing database views

## Root Cause Analysis

### Database Level Issues
1. **Missing Materialized Views**: The repository methods were referencing views that weren't created:
   ```sql
   -- These views didn't exist:
   FROM customer_lifetime_value
   FROM customer_retention_analysis
   ```

2. **Incomplete Data Access**: Store managers had no access to customer acquisition data, while the frontend expected this data to be available.

### Application Level Issues
1. **Service Layer**: The `getCustomerAcquisitionAnalytics` method returned empty lists for STORE_MANAGER roles
2. **Repository Layer**: Methods were referencing non-existent database views
3. **Frontend**: The customer analytics component expected data to be available for all roles

## Solution Implemented

### 1. Created Missing Materialized Views
Created `customer_analytics_views.sql` with the following views:

#### Customer Lifetime Value View
```sql
CREATE MATERIALIZED VIEW customer_lifetime_value AS
-- Calculates customer metrics including:
-- - Total orders, spending, average order value
-- - Customer lifespan, stores visited
-- - Customer segmentation (VIP, Regular, Occasional, One-time)
-- - Daily value and CLV per order
```

#### Customer Retention Analysis View
```sql
CREATE MATERIALIZED VIEW customer_retention_analysis AS
-- Calculates retention metrics including:
-- - Cohort analysis by month
-- - 1, 3, 6, and 12-month retention rates
-- - Cohort sizes and retained customer counts
```

### 2. Fixed Role-Based Access Control

#### Updated Customer Acquisition Analytics
**Before:**
```java
case "STORE_MANAGER" -> List.of(); // Store managers don't have acquisition data
```

**After:**
```java
case "STORE_MANAGER" -> getStoreCustomerAcquisitionData(user.getStoreId());
```

Added a helper method to provide store-specific customer acquisition data:
```java
private List<Map<String, Object>> getStoreCustomerAcquisitionData(String storeId) {
    // SQL query to get customer acquisition data for specific store
}
```

### 3. Role-Based Data Access Matrix

| Feature | HQ_ADMIN | STATE_MANAGER | STORE_MANAGER |
|---------|----------|---------------|---------------|
| Customer Lifetime Value | ✅ All customers | ✅ State customers | ✅ Store customers |
| Customer Retention | ✅ All customers | ✅ State customers | ✅ Store customers |
| Customer Acquisition | ✅ All stores | ✅ State stores | ✅ Store-specific |
| Customer Summary | ✅ All customers | ✅ State customers | ✅ Store customers |

## Implementation Steps

### Step 1: Create Database Views
Run the `customer_analytics_views.sql` script in your Supabase SQL editor to create the missing materialized views.

### Step 2: Update Application Code
The service layer has been updated to provide proper role-based access for customer acquisition analytics.

### Step 3: Verify Functionality
Test the customer analytics page with different user roles:
1. **HQ_ADMIN**: Should see all customer data across all stores
2. **STATE_MANAGER**: Should see customer data for their state only
3. **STORE_MANAGER**: Should see customer data for their specific store only

## Technical Details

### Database Views Created
1. **customer_lifetime_value**: Comprehensive customer analysis with segmentation
2. **customer_retention_analysis**: Cohort-based retention analysis
3. **Indexes**: Performance optimization for all views

### Service Layer Changes
1. **getCustomerAcquisitionAnalytics**: Now provides store-specific data for STORE_MANAGER roles
2. **Role-based filtering**: All customer analytics methods now properly filter data based on user role

### Repository Layer
All repository methods now reference existing database views:
- `getCustomerLifetimeValueHQ/State/Store`
- `getCustomerRetentionAnalysisHQ/State/Store`
- `getCustomerAcquisitionAnalyticsHQ/State`

## Testing Checklist

- [ ] HQ_ADMIN can access customer analytics
- [ ] STATE_MANAGER can access customer analytics (state-filtered)
- [ ] STORE_MANAGER can access customer analytics (store-filtered)
- [ ] Customer lifetime value data loads correctly
- [ ] Customer retention data loads correctly
- [ ] Customer acquisition data loads correctly
- [ ] Customer summary statistics display correctly
- [ ] Charts and visualizations render properly
- [ ] Export functionality works for all roles

## Performance Considerations

1. **Materialized Views**: Customer analytics views are materialized for performance
2. **Indexes**: Proper indexing on customer_id, store_id, and state_abbr
3. **Caching**: Service layer uses Spring caching for frequently accessed data
4. **Role-based filtering**: Data is filtered at the database level for efficiency

## Future Enhancements

1. **Real-time Updates**: Consider implementing real-time view refresh for live data
2. **Advanced Segmentation**: Add more sophisticated customer segmentation logic
3. **Predictive Analytics**: Implement customer lifetime value prediction models
4. **Export Enhancements**: Add more export formats and customization options 