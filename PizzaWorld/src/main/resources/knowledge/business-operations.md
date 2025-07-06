## Pizza World Business Operations Knowledge

## How is Pizza World's data structured?
Pizza World uses a sophisticated database with materialized views for fast analytics:
- **Core Tables**: `orders`, `order_items`, `products`, `stores`, `users`
- **Materialized Views**: Pre-computed analytics for instant dashboard loading
- **Role-based Access**: Data automatically filtered based on user role and permissions

## What are the actual business metrics tracked?
Real KPIs tracked in the `kpis_global_*` views:
- **Revenue Metrics**: Total revenue, average order value, revenue trends
- **Order Metrics**: Total orders, orders by time period, order composition
- **Customer Metrics**: Unique customers, customer acquisition, lifetime value
- **Store Metrics**: Store performance rankings, capacity utilization

## How does the store hierarchy work?
Pizza World operates with a three-tier data access model:
- **HQ Level**: Access to all stores through `*_hq` materialized views
- **State Level**: State-filtered data through `*_state` views using `state_abbr`
- **Store Level**: Individual store data through `*_store` views using `storeid`

## What operational hours are tracked?
The system tracks business by hour using these views:
- **`revenue_by_hour_hq`**: Revenue performance by hour of day
- **`orders_by_hour_hq`**: Order volume by hour
- **Store capacity**: Peak hour analysis through `store_capacity_analysis`

## How are products categorized and tracked?
Product organization in the system:
- **SKU System**: Unique product identifiers with size and variant tracking
- **Categories**: Product categories tracked in performance analytics
- **Pricing**: Dynamic pricing with historical price tracking
- **Performance**: Revenue and quantity metrics through `top_products_*` views

## What customer data is available?
Customer analytics through specialized views:
- **Lifetime Value**: `customer_lifetime_value` with spending patterns and segmentation
- **Retention Analysis**: `customer_retention_analysis` with cohort tracking
- **Acquisition**: `customer_acquisition_*` showing new customer trends
- **Segmentation**: Automatic classification into VIP, Regular, Occasional, One-time

## How does store performance analysis work?
Store performance tracked through multiple dimensions:
- **Revenue Performance**: `store_performance_*` views with ranking
- **Capacity Analysis**: `store_capacity_analysis` for operational efficiency
- **Time-based Trends**: `store_revenue_by_time_periods` for temporal analysis
- **Geographic Performance**: State-level aggregations and comparisons

## What revenue analysis capabilities exist?
Comprehensive revenue analytics:
- **Temporal Views**: By year, month, week, and day
- **Geographic Views**: By HQ, state, and store levels
- **Product Views**: Revenue by product, category, and SKU
- **Customer Views**: Revenue by customer segment and lifetime value

## How does the capacity analysis system work?
Store capacity tracked through multiple metrics:
- **Hourly Utilization**: `utilization_percentage` by hour of day
- **Capacity Status**: Categorized as Overloaded, High, Medium, Low
- **Peak Analysis**: Identification of busiest hours and periods
- **V3 Enhanced**: Advanced metrics with delivery time analysis

## What order management capabilities exist?
Order processing and analysis:
- **Real-time Tracking**: Recent orders through `recent_orders_*` views
- **Complex Filtering**: Multi-parameter filtering through `orders_flat`
- **Historical Analysis**: Order trends and patterns over time
- **Performance Metrics**: Order accuracy, timing, and customer satisfaction

## How does geographic analysis work?
Location-based analytics:
- **Store Locations**: Latitude/longitude for mapping and distance analysis
- **State Performance**: State-level aggregations and rankings
- **Market Analysis**: Regional performance comparisons
- **Distance Analytics**: Customer proximity analysis for delivery optimization

## What inventory and product insights are available?
Product performance analytics:
- **Top Performers**: Best-selling products by revenue and quantity
- **Category Analysis**: Performance by product category
- **Seasonal Trends**: Product popularity over time
- **Launch Analysis**: New product performance tracking

## How does customer journey analysis work?
Customer behavior tracking:
- **First Order Analysis**: Customer acquisition patterns
- **Retention Tracking**: Repeat purchase behavior
- **Lifetime Value**: Long-term customer worth analysis
- **Segmentation**: Behavioral grouping for targeted strategies

## What operational efficiency metrics exist?
Efficiency tracking through:
- **Order Processing Times**: From order to delivery
- **Peak Hour Management**: Capacity utilization during busy periods
- **Store Productivity**: Orders per hour and revenue per day
- **Staff Efficiency**: Orders handled per time period

## How does the data refresh and update system work?
Data freshness management:
- **Materialized Views**: Automatically refreshed on schedule
- **Real-time Data**: Live order tracking for immediate insights
- **Historical Data**: Archived data for trend analysis
- **Data Quality**: Validation and consistency checks

## What are the system's analytical capabilities?
Advanced analytics features:
- **Trend Analysis**: Identifying patterns in sales and customer behavior
- **Cohort Analysis**: Customer retention over time periods
- **Performance Ranking**: Store and product comparison analytics
- **Predictive Insights**: Based on historical patterns and trends

## How does role-based data access work?
Security and access control:
- **HQ Admins**: Full access to all company data and analytics
- **State Managers**: Access limited to their assigned state's data
- **Store Managers**: Access only to their specific store's information
- **Automatic Filtering**: Data queries automatically respect user permissions

## What integration capabilities exist?
System connectivity:
- **API Access**: RESTful endpoints for data retrieval
- **Export Functions**: CSV and data export capabilities
- **Real-time Updates**: Live data feeding dashboard components
- **Mobile Compatibility**: Responsive design for mobile access

## How does performance monitoring work?
System performance tracking:
- **Query Optimization**: Materialized views for fast data access
- **Load Balancing**: Efficient handling of multiple user requests
- **Error Handling**: Graceful fallbacks when data is unavailable
- **Usage Analytics**: Monitoring of system usage patterns 