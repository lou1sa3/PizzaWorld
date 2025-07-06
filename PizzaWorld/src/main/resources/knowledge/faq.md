## How do I reset my password?
Go to **Profile → Security → Reset Password**. Follow the email instructions. If you don't receive an email, contact HQ support at support@pizzaworldplus.tech.

## What is the gluten-free crust surcharge?
The gluten-free crust costs **$1.25 extra** per pizza.

## How long are tokens valid?
JWT access tokens are valid for **24 hours**. After that users must log in again.

## What user roles exist in Pizza World?
There are three user roles with different data access levels:
- **HQ_ADMIN**: Access to all company-wide data including `kpis_global_hq`, revenue across all states, and store performance analytics
- **STATE_MANAGER**: Access to state-specific data using `kpis_global_state` and store performance within their assigned state
- **STORE_MANAGER**: Access limited to their store using `kpis_global_store` and store-specific analytics

## What KPI data is available in Pizza World?
The system tracks these core KPIs through materialized views:
- **Total Revenue**: From all orders and transactions
- **Total Orders**: Count of completed orders
- **Total Customers**: Unique customer count
- **Average Order Value**: Calculated as total revenue divided by total orders
- **Store Count**: Number of active Pizza World locations

## How does revenue analytics work?
Revenue analytics uses several materialized views:
- **`revenue_by_year_hq`**: Yearly revenue trends for HQ users
- **`revenue_by_month_hq`**: Monthly revenue trends with up to 12 months of data
- **`revenue_by_week_hq`**: Weekly revenue trends with up to 12 weeks of data
- **State and store versions**: Similar data filtered by state (`revenue_by_month_state`) or store (`revenue_by_month_store`)

## What store performance data is tracked?
Store performance uses materialized views that include:
- **Store ID and Location**: `storeid`, `city`, `state_name`, `state_abbr`
- **Financial Metrics**: `total_revenue`, `total_orders`, `avg_order_value`
- **Customer Data**: `unique_customers`
- **Capacity Metrics**: Available through `store_capacity_analysis` view

## What product analytics are available?
Product analytics come from several materialized views:
- **`top_products_hq`**: Shows `sku`, `name`, `category`, `size`, `price`, `total_quantity`, `total_revenue`, `total_orders`, `unique_customers`
- **`category_performance_hq`**: Revenue and performance by product category
- **State/Store versions**: Filtered data for specific states or stores

## How does customer analytics work?
Customer analytics uses these materialized views:
- **`customer_lifetime_value`**: Tracks `customerid`, `total_orders`, `total_spent`, `avg_order_value`, `customer_lifespan_days`, `customer_segment`
- **`customer_acquisition_hq`**: Shows new customer acquisition by month with `new_customers` and `revenue_from_new_customers`
- **`customer_retention_analysis`**: Cohort analysis with retention rates at 1, 3, 6, and 12 months

## What operational analytics exist?
Operational data comes from these sources:
- **Hourly Performance**: `revenue_by_hour_hq` and `orders_by_hour_hq` for peak time analysis
- **Store Capacity**: `store_capacity_analysis` with `hour_of_day`, `actual_orders`, `peak_capacity`, `utilization_percentage`, `capacity_status`
- **Recent Orders**: `recent_orders_hq` for real-time order monitoring

## How are orders filtered and searched?
The system uses the `orders_flat` view for complex filtering with these parameters:
- **Store filtering**: `storeId` parameter
- **State filtering**: `state` parameter  
- **Customer filtering**: `customerId` parameter
- **Date filtering**: `fromDate` and `toDate` parameters
- **Order details**: `orderId` and `nitems` parameters
- **Pagination**: `maxRows` and `startRow` for large datasets

## What materialized views power the dashboard?
Key materialized views include:
- **KPI Views**: `kpis_global_hq`, `kpis_global_state`, `kpis_global_store`
- **Revenue Views**: `revenue_by_year_hq`, `revenue_by_month_hq`, `revenue_by_week_hq`
- **Store Views**: `store_performance_hq`, `store_revenue_all_time`
- **Product Views**: `top_products_hq`, `category_performance_hq`
- **Customer Views**: `customer_lifetime_value`, `customer_retention_analysis`

## How does the filtering system work?
Most analytics queries support role-based filtering:
- **HQ Admins**: See all data with no filters applied
- **State Managers**: Data automatically filtered by their `state_abbr`
- **Store Managers**: Data automatically filtered by their `storeId`

## What time period analytics are available?
The system provides multiple time-based views:
- **All Time**: `store_revenue_all_time` for cumulative data
- **By Year**: Annual aggregations using `EXTRACT(YEAR FROM orderdate)`
- **By Month**: Monthly data with `year` and `month` fields
- **By Week**: Weekly aggregations using `year_week` format
- **By Day**: Daily trends available through `revenue_by_day_hq`

## How does store capacity analysis work?
Store capacity uses the `store_capacity_analysis` view with:
- **Hourly Analysis**: `hour_of_day` field shows capacity by hour
- **Utilization Metrics**: `utilization_percentage` shows how busy each hour is
- **Capacity Status**: Categories like 'Overloaded', 'High', 'Medium', 'Low'
- **V3 Enhanced**: Additional views like `store_capacity_summary_v3` and `delivery_metrics_v3`

## What customer segmentation exists?
The `customer_lifetime_value` view includes automatic segmentation:
- **VIP**: High-value customers with multiple orders
- **Regular**: Consistent repeat customers
- **Occasional**: Infrequent but returning customers  
- **One-time**: Single-order customers

## How are products organized in the system?
Products in the `products` table have:
- **Identification**: `sku` (unique identifier), `product_name`, `category`
- **Details**: `size`, `price`, `launch_date`, `ingredients`
- **Performance**: Tracked through `order_items` joins for revenue analytics

## What geographic data is available?
Store location data includes:
- **Store Details**: `storeid`, `city`, `state`, `state_abbr`, `zipcode`
- **Coordinates**: `latitude`, `longitude` for mapping
- **Performance by Geography**: State-level aggregations and comparisons

## How does real-time monitoring work?
Recent activity is tracked through:
- **Recent Orders**: `recent_orders_hq` with configurable row limits
- **Live KPIs**: Materialized views updated regularly
- **Order Status**: Real-time order tracking through the main `orders` table

## What export capabilities exist?
The system supports data export through:
- **Filtered Queries**: All views support parameter-based filtering
- **Pagination**: Large datasets use `LIMIT` and `OFFSET`
- **CSV Format**: Data can be exported in standard formats
- **Role-based Access**: Exports respect user permission levels

## How does the analytics API work?
Analytics data is accessed through repository methods like:
- **`getHQKPIs()`**: Core KPI data for HQ users
- **`getStorePerformanceHQ()`**: Store comparison data
- **`getTopProductsHQ(limit)`**: Best-selling products with row limits
- **`getCustomerLifetimeValueHQ(limit)`**: Customer value analysis

## What maintenance and monitoring exists?
System health is monitored through:
- **Materialized View Status**: Views are refreshed regularly
- **Query Performance**: Optimized queries with proper indexing
- **Data Freshness**: Recent data available through live order tracking
- **Error Handling**: Graceful fallbacks when data is unavailable

