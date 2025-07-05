# Customer Analytics Role-Based Access Fix

## Issue Summary

The customer analytics functionality was working for HQ users but failing for STATE_MANAGER and STORE_MANAGER roles. The issue was in the SQL queries that were trying to JOIN with the `orders` table to filter data by state/store, which was causing data duplication and incorrect results.

## Root Cause

The problem was in the repository methods for customer lifetime value and retention analysis:

### Before (Broken):
```sql
SELECT clv.*
FROM customer_lifetime_value clv
JOIN orders o ON clv.customerid = o.customerid
JOIN stores s ON o.storeid = s.storeid
WHERE s.state_abbr = :state
GROUP BY clv.customerid, clv.total_orders, clv.total_spent, ...
```

**Issues:**
1. **Data Duplication**: Joining with `orders` table caused multiple rows for the same customer
2. **Unnecessary GROUP BY**: Trying to group by all columns from the materialized view
3. **Performance Issues**: Complex joins with large tables

### After (Fixed):
```sql
SELECT clv.*
FROM customer_lifetime_value clv
WHERE clv.customerid IN (
    SELECT DISTINCT o.customerid 
    FROM orders o 
    JOIN stores s ON o.storeid = s.storeid 
    WHERE s.state_abbr = :state
)
```

**Benefits:**
1. **No Data Duplication**: Uses subquery to filter customers
2. **Clean Results**: Direct selection from materialized view
3. **Better Performance**: Leverages existing materialized view indexes

## Files Modified

### 1. OptimizedPizzaRepo.java
Fixed the following methods:
- `getCustomerLifetimeValueState()`
- `getCustomerLifetimeValueStore()`
- `getCustomerLifetimeValueSummaryState()`
- `getCustomerLifetimeValueSummaryStore()`
- `getCustomerRetentionAnalysisState()`
- `getCustomerRetentionAnalysisStore()`

### 2. OptimizedPizzaService.java
Updated customer acquisition analytics to provide store-specific data for STORE_MANAGER roles instead of returning empty lists.

## Technical Details

### Query Pattern Change
**Old Pattern:**
```sql
FROM materialized_view mv
JOIN orders o ON mv.customerid = o.customerid
JOIN stores s ON o.storeid = s.storeid
WHERE s.state_abbr = :state
GROUP BY all_mv_columns
```

**New Pattern:**
```sql
FROM materialized_view mv
WHERE mv.customerid IN (
    SELECT DISTINCT o.customerid 
    FROM orders o 
    JOIN stores s ON o.storeid = s.storeid 
    WHERE s.state_abbr = :state
)
```

### Why This Works Better

1. **Materialized View Optimization**: The `customer_lifetime_value` and `customer_retention_analysis` views are already optimized and contain pre-calculated data
2. **Efficient Filtering**: The subquery efficiently identifies which customers belong to the specified state/store
3. **No Aggregation Needed**: Since the materialized views already contain aggregated data, no additional GROUP BY is needed
4. **Index Utilization**: The subquery can utilize indexes on `orders.storeid` and `stores.state_abbr`

## Testing Checklist

- [ ] HQ_ADMIN can access customer analytics (all data)
- [ ] STATE_MANAGER can access customer analytics (state-filtered data)
- [ ] STORE_MANAGER can access customer analytics (store-filtered data)
- [ ] Customer lifetime value data loads correctly for all roles
- [ ] Customer retention data loads correctly for all roles
- [ ] Customer acquisition data loads correctly for all roles
- [ ] Customer summary statistics display correctly for all roles
- [ ] No data duplication in results
- [ ] Performance is acceptable for all role types

## Performance Impact

### Before Fix:
- Complex JOINs with large tables
- Unnecessary GROUP BY operations
- Potential data duplication
- Slower query execution

### After Fix:
- Efficient subquery filtering
- Direct materialized view access
- No data duplication
- Faster query execution
- Better index utilization

## Role-Based Data Access Matrix

| Feature | HQ_ADMIN | STATE_MANAGER | STORE_MANAGER |
|---------|----------|---------------|---------------|
| Customer Lifetime Value | ✅ All customers | ✅ State customers | ✅ Store customers |
| Customer Retention | ✅ All customers | ✅ State customers | ✅ Store customers |
| Customer Acquisition | ✅ All stores | ✅ State stores | ✅ Store-specific |
| Customer Summary | ✅ All customers | ✅ State customers | ✅ Store customers |

## Verification

To verify the fix is working:

1. **Test with HQ_ADMIN**: Should see all customer data across all stores
2. **Test with STATE_MANAGER**: Should see customer data for their state only
3. **Test with STORE_MANAGER**: Should see customer data for their specific store only
4. **Check Data Integrity**: Ensure no duplicate customers in results
5. **Monitor Performance**: Verify queries execute efficiently

## Future Considerations

1. **Index Optimization**: Consider adding composite indexes on `(storeid, customerid)` and `(state_abbr, customerid)` for even better performance
2. **Caching Strategy**: The materialized views already provide caching, but consider application-level caching for frequently accessed data
3. **Monitoring**: Add query performance monitoring to track execution times for different roles 