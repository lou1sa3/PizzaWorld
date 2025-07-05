-- =====================================================
-- CUSTOMER ANALYTICS MATERIALIZED VIEWS FOR SUPABASE
-- =====================================================
-- Purpose: Customer lifetime value and retention analysis
-- Compatible with Supabase SQL editor
-- =====================================================

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS customer_lifetime_value CASCADE;
DROP MATERIALIZED VIEW IF EXISTS customer_retention_analysis CASCADE;

-- =====================================================
-- 1. CUSTOMER LIFETIME VALUE ANALYSIS
-- =====================================================
CREATE MATERIALIZED VIEW customer_lifetime_value AS
WITH customer_metrics AS (
    SELECT 
        o.customerid,
        COUNT(DISTINCT o.orderid) as total_orders,
        SUM(o.total) as total_spent,
        AVG(o.total) as avg_order_value,
        MIN(o.orderdate) as first_order_date,
        MAX(o.orderdate) as last_order_date,
        COUNT(DISTINCT o.storeid) as stores_visited,
        COUNT(DISTINCT o.orderid) as order_count,
        SUM(o.total) as lifetime_value
    FROM orders o
    GROUP BY o.customerid
),
customer_segments AS (
    SELECT 
        cm.*,
        EXTRACT(DAY FROM (cm.last_order_date - cm.first_order_date)) as customer_lifespan_days,
        CASE 
            WHEN cm.total_spent >= 500 AND cm.total_orders >= 10 THEN 'VIP'
            WHEN cm.total_spent >= 200 AND cm.total_orders >= 5 THEN 'Regular'
            WHEN cm.total_spent >= 50 AND cm.total_orders >= 2 THEN 'Occasional'
            ELSE 'One-time'
        END as customer_segment,
        CASE 
            WHEN cm.customer_lifespan_days > 0 THEN 
                cm.total_spent / cm.customer_lifespan_days
            ELSE 0 
        END as daily_value,
        CASE 
            WHEN cm.total_orders > 0 THEN 
                cm.total_spent / cm.total_orders
            ELSE 0 
        END as clv_per_order
    FROM customer_metrics cm
)
SELECT 
    customerid,
    total_orders,
    total_spent,
    avg_order_value,
    first_order_date,
    last_order_date,
    customer_lifespan_days,
    stores_visited,
    daily_value,
    clv_per_order,
    customer_segment
FROM customer_segments
ORDER BY total_spent DESC;

-- Create indexes
CREATE INDEX idx_customer_lifetime_value_customerid ON customer_lifetime_value(customerid);
CREATE INDEX idx_customer_lifetime_value_segment ON customer_lifetime_value(customer_segment);
CREATE INDEX idx_customer_lifetime_value_spent ON customer_lifetime_value(total_spent);

-- =====================================================
-- 2. CUSTOMER RETENTION ANALYSIS
-- =====================================================
CREATE MATERIALIZED VIEW customer_retention_analysis AS
WITH customer_cohorts AS (
    SELECT 
        customerid,
        DATE_TRUNC('month', MIN(orderdate)) as cohort_month,
        COUNT(DISTINCT orderid) as total_orders
    FROM orders
    GROUP BY customerid
),
customer_activity AS (
    SELECT 
        o.customerid,
        cc.cohort_month,
        DATE_TRUNC('month', o.orderdate) as activity_month,
        COUNT(DISTINCT o.orderid) as orders_in_month
    FROM orders o
    JOIN customer_cohorts cc ON o.customerid = cc.customerid
    GROUP BY o.customerid, cc.cohort_month, DATE_TRUNC('month', o.orderdate)
),
retention_calculation AS (
    SELECT 
        cohort_month,
        COUNT(DISTINCT customerid) as cohort_size,
        COUNT(DISTINCT CASE WHEN activity_month = cohort_month + INTERVAL '1 month' THEN customerid END) as retained_1m,
        COUNT(DISTINCT CASE WHEN activity_month = cohort_month + INTERVAL '3 months' THEN customerid END) as retained_3m,
        COUNT(DISTINCT CASE WHEN activity_month = cohort_month + INTERVAL '6 months' THEN customerid END) as retained_6m,
        COUNT(DISTINCT CASE WHEN activity_month = cohort_month + INTERVAL '12 months' THEN customerid END) as retained_12m
    FROM customer_activity
    GROUP BY cohort_month
)
SELECT 
    TO_CHAR(cohort_month, 'YYYY-MM') as cohort_month,
    cohort_size,
    retained_1m,
    retained_3m,
    retained_6m,
    retained_12m,
    CASE 
        WHEN cohort_size > 0 THEN ROUND((retained_1m::NUMERIC / cohort_size::NUMERIC) * 100, 2)
        ELSE 0 
    END as retention_rate_1m,
    CASE 
        WHEN cohort_size > 0 THEN ROUND((retained_3m::NUMERIC / cohort_size::NUMERIC) * 100, 2)
        ELSE 0 
    END as retention_rate_3m,
    CASE 
        WHEN cohort_size > 0 THEN ROUND((retained_6m::NUMERIC / cohort_size::NUMERIC) * 100, 2)
        ELSE 0 
    END as retention_rate_6m,
    CASE 
        WHEN cohort_size > 0 THEN ROUND((retained_12m::NUMERIC / cohort_size::NUMERIC) * 100, 2)
        ELSE 0 
    END as retention_rate_12m
FROM retention_calculation
ORDER BY cohort_month DESC;

-- Create indexes
CREATE INDEX idx_customer_retention_cohort ON customer_retention_analysis(cohort_month);
CREATE INDEX idx_customer_retention_rates ON customer_retention_analysis(retention_rate_1m, retention_rate_3m, retention_rate_6m, retention_rate_12m);

-- =====================================================
-- REFRESH THE MATERIALIZED VIEWS
-- =====================================================
REFRESH MATERIALIZED VIEW customer_lifetime_value;
REFRESH MATERIALIZED VIEW customer_retention_analysis;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check if views were created successfully
SELECT 'customer_lifetime_value' as view_name, COUNT(*) as row_count FROM customer_lifetime_value
UNION ALL
SELECT 'customer_retention_analysis' as view_name, COUNT(*) as row_count FROM customer_retention_analysis; 