## Pizza World Technical System Guide

## What database technology does Pizza World use?
The system uses PostgreSQL with advanced features:
- **Materialized Views**: Pre-computed analytics for fast dashboard loading
- **Complex Queries**: Multi-table joins with role-based filtering
- **Indexing**: Optimized for fast data retrieval on large datasets
- **Real-time Updates**: Live data feeding through optimized queries

## How are the materialized views structured?
The system uses a comprehensive set of materialized views:
- **KPI Views**: `kpis_global_hq`, `kpis_global_state`, `kpis_global_store`
- **Revenue Views**: `revenue_by_year_hq`, `revenue_by_month_hq`, `revenue_by_week_hq`, `revenue_by_day_hq`
- **Performance Views**: `store_performance_hq`, `store_performance_state`
- **Analytics Views**: `customer_lifetime_value`, `customer_retention_analysis`, `store_capacity_analysis`

## What API endpoints are available?
The system provides RESTful APIs through Spring Boot controllers:
- **KPI Endpoints**: `/api/kpis/*` for dashboard metrics
- **Analytics Endpoints**: `/api/analytics/*` for detailed analysis
- **Store Endpoints**: `/api/stores/*` for store-specific data
- **Customer Endpoints**: `/api/customers/*` for customer analytics

## How does role-based data access work technically?
Data filtering happens at the repository level:
- **HQ Admins**: Queries use `*_hq` views with no filtering
- **State Managers**: Queries use `*_state` views with `WHERE state_abbr = :state`
- **Store Managers**: Queries use `*_store` views with `WHERE store_id = :storeId`

## What query optimization techniques are used?
Performance optimization through:
- **Materialized Views**: Pre-computed aggregations for instant results
- **Indexed Queries**: Strategic indexing on frequently queried columns
- **Parameterized Queries**: Prepared statements for SQL injection protection
- **Pagination**: `LIMIT` and `OFFSET` for large dataset handling

## How does the caching system work?
Multi-level caching strategy:
- **Application Cache**: Business context cached for 60 seconds (critical data: 30 seconds)
- **Database Cache**: Materialized views cached at database level
- **Query Cache**: Repeated queries cached by PostgreSQL
- **Role-based Cache Keys**: Separate cache entries for different user roles

## What data validation is performed?
Comprehensive data validation:
- **Field Validation**: Required fields checked before database insertion
- **Type Validation**: Numeric fields validated for proper data types
- **Range Validation**: Business rules applied (e.g., revenue cannot be negative)
- **Consistency Validation**: Cross-field validation (e.g., AOV = revenue/orders)

## How does the authentication system work?
JWT-based authentication:
- **Token Generation**: 24-hour JWT tokens with user role embedded
- **Role Authorization**: `@PreAuthorize` annotations on controller methods
- **Token Validation**: Automatic validation on each API request
- **Session Management**: Stateless authentication with token refresh

## What filtering capabilities exist in the system?
Advanced filtering through `orders_flat` and other views:
- **Date Filtering**: `fromDate` and `toDate` parameters
- **Geographic Filtering**: `storeId` and `state` parameters
- **Customer Filtering**: `customerId` for customer-specific data
- **Order Filtering**: `orderId` and `nitems` for order details

## How does pagination work for large datasets?
Efficient pagination implementation:
- **Limit/Offset**: `LIMIT :maxRows OFFSET :startRow` for result sets
- **Count Queries**: Separate count queries for total record counts
- **Performance**: Optimized pagination to handle millions of records
- **Frontend Integration**: Page size and offset managed by frontend

## What error handling and monitoring exists?
Robust error handling:
- **Exception Handling**: Global exception handlers for API errors
- **Logging**: Comprehensive logging with different levels (DEBUG, INFO, WARN, ERROR)
- **Graceful Degradation**: Fallback responses when data is unavailable
- **Health Checks**: `/api/health` endpoints for system monitoring

## How does the data export system work?
Export capabilities:
- **CSV Export**: Data formatted as CSV with proper escaping
- **Filtered Exports**: Exports respect same filters as dashboard views
- **Large Dataset Handling**: Streaming exports for large result sets
- **Role-based Exports**: Users only export data they have access to

## What real-time capabilities exist?
Live data features:
- **Recent Orders**: `recent_orders_*` views for real-time order monitoring
- **Live KPIs**: Updated KPI data through periodic materialized view refresh
- **Real-time Charts**: Dashboard charts update with fresh data
- **Order Tracking**: Live order status updates

## How does the AI assistant knowledge retrieval work?
Knowledge system architecture:
- **Static Documents**: Markdown files loaded at startup
- **Keyword Matching**: Flexible keyword search across knowledge chunks
- **Business Context**: Real-time business data injected into AI responses
- **Fallback Responses**: Rule-based responses when AI is unavailable

## What security measures are implemented?
Comprehensive security:
- **SQL Injection Protection**: Parameterized queries throughout
- **XSS Prevention**: Input sanitization and output encoding
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Role-based Access**: Data automatically filtered by user permissions

## How does the system handle high concurrency?
Scalability features:
- **Connection Pooling**: Database connection management
- **Materialized Views**: Reduce database load for analytics queries
- **Caching**: Multiple cache layers to reduce database hits
- **Stateless Design**: JWT tokens enable horizontal scaling

## What monitoring and observability exists?
System monitoring:
- **Application Logs**: Structured logging with correlation IDs
- **Performance Metrics**: Query execution time monitoring
- **Error Tracking**: Exception logging and alerting
- **Usage Analytics**: API endpoint usage tracking

## How does data consistency work across views?
Data integrity management:
- **Materialized View Refresh**: Scheduled updates to maintain consistency
- **Transaction Management**: ACID compliance for data modifications
- **Referential Integrity**: Foreign key constraints across tables
- **Data Validation**: Business rule validation at multiple levels

## What backup and recovery capabilities exist?
Data protection:
- **Database Backups**: Regular PostgreSQL backups
- **Point-in-time Recovery**: Transaction log-based recovery
- **Materialized View Rebuild**: Ability to regenerate analytics views
- **Data Validation**: Post-recovery data integrity checks

## How does the system handle schema evolution?
Database migration strategy:
- **Version Control**: Database schema versioning
- **Migration Scripts**: Automated schema updates
- **Backward Compatibility**: Gradual migration approach
- **Rollback Capability**: Ability to revert schema changes 