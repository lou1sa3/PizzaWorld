package pizzaworld.controller;

import java.time.LocalDate;
import java.util.Date;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import pizzaworld.service.OptimizedPizzaService;
import pizzaworld.service.UserService;
import pizzaworld.model.CustomUserDetails;
import pizzaworld.model.User;
import pizzaworld.util.CsvExportUtil;
import pizzaworld.dto.DashboardKpiDto;
import pizzaworld.model.CustomUserDetails;
import pizzaworld.model.User;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/v2")
public class OptimizedPizzaController {

    private static final Logger logger = LoggerFactory.getLogger(OptimizedPizzaController.class);

    @Autowired
    private OptimizedPizzaService pizzaService;

    @Autowired
    private UserService userService;

    // =================================================================
    // DASHBOARD KPIs - Fast materialized view queries
    // =================================================================

    @GetMapping("/dashboard/kpis") //works, all time data for HQ_ADMIN
    public ResponseEntity<DashboardKpiDto> getDashboardKPIs(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getDashboardKPIs(user));
    }

   // =================================================================
    // GLOBAL STORE KPIs - Materialized View Access
    // =================================================================

    @GetMapping("/kpis/global-store")
    public ResponseEntity<List<Map<String, Object>>> getGlobalStoreKPIs(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getGlobalStoreKPIs(user));
    }

    @GetMapping("/kpis/global-store/export")
    public void exportGlobalStoreKPIs(@AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getGlobalStoreKPIs(user);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "global-store-kpis.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "global-store-kpis.csv");
    }

    // =================================================================
    // STORE REVENUE CHART - Dynamic Time Period Filtering
    // =================================================================

    @GetMapping("/chart/store-revenue")
    public ResponseEntity<List<Map<String, Object>>> getStoreRevenueChart(
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreRevenueByTimePeriod(user, timePeriod, year, month, quarter));
    }

    @GetMapping("/chart/store-revenue/date-range")
    public ResponseEntity<List<Map<String, Object>>> getStoreRevenueByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreRevenueByDateRange(user, startDate, endDate));
    }

    @GetMapping("/chart/store-revenue/export")
    public void exportStoreRevenueChart(
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getStoreRevenueByTimePeriod(user, timePeriod, year, month, quarter);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "store-revenue-chart.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "store-revenue-chart.csv");
    }

    // Time period utility endpoints
    @GetMapping("/chart/time-periods/years")
    public ResponseEntity<List<Map<String, Object>>> getAvailableYears() {
        return ResponseEntity.ok(pizzaService.getAvailableYears());
    }

    @GetMapping("/chart/time-periods/months")
    public ResponseEntity<List<Map<String, Object>>> getAvailableMonthsForYear(@RequestParam Integer year) {
        return ResponseEntity.ok(pizzaService.getAvailableMonthsForYear(year));
    }

    @GetMapping("/chart/time-periods/quarters")
    public ResponseEntity<List<Map<String, Object>>> getAvailableQuartersForYear(@RequestParam Integer year) {
        return ResponseEntity.ok(pizzaService.getAvailableQuartersForYear(year));
    }

    // =================================================================
    // FINAL STORE REVENUE CHART API - Production Ready
    // =================================================================

    @GetMapping("/store-revenue-chart")
    public ResponseEntity<List<Map<String, Object>>> getStoreRevenueChart(
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreRevenueChart(user, timePeriod, year, month));
    }

    @GetMapping("/store-revenue-chart/export")
    public void exportStoreRevenueChart(
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getStoreRevenueChart(user, timePeriod, year, month);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "store-revenue-chart.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "store-revenue-chart.csv");
    }

    @GetMapping("/store-revenue-chart/years")
    public ResponseEntity<List<Map<String, Object>>> getChartAvailableYears() {
        return ResponseEntity.ok(pizzaService.getChartAvailableYears());
    }

    @GetMapping("/store-revenue-chart/months")
    public ResponseEntity<List<Map<String, Object>>> getChartAvailableMonths(@RequestParam Integer year) {
        return ResponseEntity.ok(pizzaService.getChartAvailableMonths(year));
    }


    @GetMapping("/dashboard/kpis/export") //works, all time data for HQ_ADMIN - in csv
    public void exportDashboardKPIs(@AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        DashboardKpiDto data = pizzaService.getDashboardKPIs(userDetails.getUser());
        List<String> headers = List.of("Revenue", "Orders", "AvgOrder", "Customers");
        List<List<String>> rows = List.of(List.of(
                String.valueOf(data.revenue),
                String.valueOf(data.orders),
                String.valueOf(data.avgOrder),
                String.valueOf(data.customers)));
        CsvExportUtil.writeCsv(response, headers, rows, "dashboard-kpis.csv");
    }

    // =================================================================
    // REVENUE ANALYTICS - Role-based materialized views
    // =================================================================

    @GetMapping("/analytics/revenue/by-year") //- works, gives out revenue by year for hq
    public ResponseEntity<List<Map<String, Object>>> getRevenueByYear(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByYear(user));
    }

    @GetMapping("/analytics/revenue/by-month")
    public ResponseEntity<List<Map<String, Object>>> getRevenueByMonth(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByMonth(user));
    }

    @GetMapping("/analytics/revenue/by-week")
    public ResponseEntity<List<Map<String, Object>>> getRevenueByWeek(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByWeek(user));
    }

    // =================================================================
    // ORDER ANALYTICS - Role-based materialized views
    // =================================================================


    @GetMapping("/orders/recent") //works
    public ResponseEntity<List<Map<String, Object>>> getRecentOrders(
            @RequestParam(defaultValue = "50") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRecentOrders(user, limit));
    }

    // =================================================================
    // FILTERED ORDERS - Enhanced with pagination
    // =================================================================


    // =================================================================
    // PRODUCT ANALYTICS - Role-based
    // =================================================================

    @GetMapping("/products/top") //work - 3.29ms -all stores
    public ResponseEntity<List<Map<String, Object>>> getTopProducts(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getTopProducts(user, category, limit));
    }

    @GetMapping("/products/top/export") //works, all stores
    public void exportTopProducts(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "100") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> products = pizzaService.getTopProducts(user, category, limit);
        
        if (products.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "top-products.csv");
            return;
        }

        List<String> headers = List.copyOf(products.get(0).keySet());
        List<List<String>> rows = products.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "top-products.csv");
    }

    // =================================================================
    // STORES - Role-based
    // =================================================================

    @GetMapping("/stores") //works, all stores
    public ResponseEntity<List<Map<String, Object>>> getStores(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStores(user));
    }

    @GetMapping("/stores/export") //works, exports all stores to csv
    public void exportStores(@AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> stores = pizzaService.getStores(user);
        
        if (stores.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "stores.csv");
            return;
        }

        List<String> headers = List.copyOf(stores.get(0).keySet());
        List<List<String>> rows = stores.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "stores.csv");
    }


    @GetMapping("/profile") //works, gives out user profile
    public ResponseEntity<Map<String, Object>> getUserProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "role", user.getRole(),
                "storeId", user.getStoreId() != null ? user.getStoreId() : "",
                "state", user.getStateAbbr() != null ? user.getStateAbbr() : ""));
    }

    // =================================================================
    // ADDITIONAL DASHBOARD ANALYTICS - Enhanced Data
    // =================================================================

    @GetMapping("/analytics/revenue/by-store") //works
    public ResponseEntity<List<Map<String, Object>>> getRevenueByStore(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByStore(user));
    }

    @GetMapping("/analytics/store-performance") //works but same as above
    public ResponseEntity<List<Map<String, Object>>> getStorePerformance(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStorePerformance(user));
    }

    // =================================================================
    // COMPREHENSIVE ANALYTICS - Advanced Business Intelligence
    // =================================================================

    @GetMapping("/analytics/hourly-performance")
    public ResponseEntity<List<Map<String, Object>>> getHourlyPerformanceAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getHourlyPerformanceAnalytics(user));
    }

    @GetMapping("/analytics/product-performance")
    public ResponseEntity<List<Map<String, Object>>> getProductPerformanceAnalytics(
            @RequestParam(required = false) String category,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getProductPerformanceAnalytics(user, category, null));
    }

    @GetMapping("/analytics/category-performance")
    public ResponseEntity<List<Map<String, Object>>> getCategoryPerformanceAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getCategoryPerformanceAnalytics(user));
    }

    @GetMapping("/analytics/customer-acquisition")
    public ResponseEntity<List<Map<String, Object>>> getCustomerAcquisitionAnalytics(
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getCustomerAcquisitionAnalytics(user, states, storeIds));
    }

    @GetMapping("/analytics/daily-trends")
    public ResponseEntity<List<Map<String, Object>>> getDailyRevenueTrends(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getDailyRevenueTrends(user));
    }

    @GetMapping("/analytics/monthly-trends")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyRevenueTrends(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getMonthlyRevenueTrends(user));
    }

    @GetMapping("/analytics/store-comparison")
    public ResponseEntity<List<Map<String, Object>>> getStorePerformanceComparison(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStorePerformanceComparison(user));
    }
    
    @GetMapping("/analytics/state-comparison")
    public ResponseEntity<List<Map<String, Object>>> getStateRevenueTrends(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStateRevenueTrends(user));
    }

    // Export endpoints for comprehensive analytics
    @GetMapping("/analytics/hourly-performance/export")
    public void exportHourlyPerformanceAnalytics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getHourlyPerformanceAnalytics(user);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "hourly-performance.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "hourly-performance.csv");
    }

    @GetMapping("/analytics/product-performance/export")
    public void exportProductPerformanceAnalytics(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "100") Integer limit,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getProductPerformanceAnalytics(user, category, limit);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "product-performance.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "product-performance.csv");
    }

    // =================================================================
    // HEALTH CHECK
    // =================================================================

    @GetMapping("/health") //works
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "service", "Optimized Pizza API v2",
                "timestamp", java.time.LocalDateTime.now().toString()));
    }

    // =================================================================
    // ENHANCED STORE ANALYTICS - For the new stores page
    // =================================================================

    @GetMapping("/stores/performance")
    public ResponseEntity<List<Map<String, Object>>> getStorePerformanceAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStorePerformanceAnalytics(user));
    }

    @GetMapping("/analytics/state-performance")
    public ResponseEntity<List<Map<String, Object>>> getStatePerformanceAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStatePerformanceAnalytics(user));
    }

    @GetMapping("/analytics/monthly-revenue-trends")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyRevenueTrendsByStore(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getMonthlyRevenueTrendsByStore(user));
    }

    @GetMapping("/stores/performance/export")
    public void exportStorePerformanceAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getStorePerformanceAnalytics(user);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "store-performance-analytics.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "store-performance-analytics.csv");
    }

    // ============================================================================
    // NEW STORE ANALYTICS ENDPOINTS - Enhanced Store Intelligence
    // ============================================================================

    @GetMapping("/stores/hourly-performance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreHourlyPerformance(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreHourlyPerformance(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store hourly performance", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stores/customer-acquisition")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCustomerAcquisition(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreCustomerAcquisition(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store customer acquisition", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stores/product-mix")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreProductMix(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreProductMix(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store product mix", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stores/weekly-trends")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreWeeklyTrends(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreWeeklyTrends(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store weekly trends", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stores/daily-operations")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreDailyOperations(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreDailyOperations(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store daily operations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stores/efficiency-metrics")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreEfficiencyMetrics(Authentication authentication) {
        try {
            String role = authentication.getAuthorities().iterator().next().getAuthority();
            User user = ((CustomUserDetails) authentication.getPrincipal()).getUser();
            String stateAbbr = user.getStateAbbr();
            String storeId = user.getStoreId();

            List<Map<String, Object>> result = pizzaService.getStoreEfficiencyMetrics(role, stateAbbr, storeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching store efficiency metrics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ===== STORE-SPECIFIC ANALYTICS ENDPOINTS =====

    @GetMapping("/stores/{storeId}/analytics/overview")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreAnalyticsOverview(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreAnalyticsOverview(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/revenue-trends")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreRevenueTrends(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreRevenueTrends(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/hourly-performance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreHourlyPerformance(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreHourlyPerformance(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/category-performance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCategoryPerformance(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreCategoryPerformance(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/daily-operations")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreDailyOperations(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreDailyOperations(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/customer-insights")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCustomerInsights(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreCustomerInsights(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/product-performance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreProductPerformance(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreProductPerformance(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/recent-orders")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreRecentOrders(
            @PathVariable String storeId,
            @RequestParam(defaultValue = "50") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreRecentOrders(storeId, user, limit));
    }

    @GetMapping("/stores/{storeId}/analytics/efficiency-metrics")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreEfficiencyMetrics(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        return ResponseEntity.ok(pizzaService.getStoreEfficiencyMetrics(storeId, user, filters));
    }

    // =================================================================
    // ENHANCED STORE ANALYTICS - Unified Filtering with Contextual Comparison
    // =================================================================

    @GetMapping("/stores/{storeId}/analytics/contextual-overview")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreContextualOverview(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "false") boolean compareWithState,
            @RequestParam(defaultValue = "false") boolean compareWithNational,
            @RequestParam(defaultValue = "false") boolean includeRankings,
            @RequestParam(defaultValue = "false") boolean includeTrends,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = buildEnhancedFilters(timePeriod, year, month, quarter, startDate, endDate, 
                                                           compareWithState, compareWithNational, includeRankings, includeTrends);
        return ResponseEntity.ok(pizzaService.getStoreContextualOverview(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/enhanced-revenue-trends")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getEnhancedStoreRevenueTrends(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "false") boolean compareWithState,
            @RequestParam(defaultValue = "false") boolean compareWithNational,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = buildEnhancedFilters(timePeriod, year, month, quarter, startDate, endDate, 
                                                           compareWithState, compareWithNational, false, false);
        return ResponseEntity.ok(pizzaService.getEnhancedStoreRevenueTrends(storeId, user, filters));
    }

    @GetMapping("/stores/{storeId}/analytics/enhanced-performance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getEnhancedStorePerformance(
            @PathVariable String storeId,
            @RequestParam(required = false) String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "true") boolean includeStateComparison,
            @RequestParam(defaultValue = "true") boolean includeNationalComparison,
            @RequestParam(defaultValue = "true") boolean includeRankings,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = buildEnhancedFilters(timePeriod, year, month, quarter, startDate, endDate, 
                                                           includeStateComparison, includeNationalComparison, includeRankings, true);
        return ResponseEntity.ok(pizzaService.getEnhancedStorePerformance(storeId, user, filters));
    }

    // =================================================================
    // CUSTOM RANGE AND COMPARE FUNCTIONALITY
    // =================================================================

    @GetMapping("/stores/{storeId}/analytics/custom-range")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreCustomRangeAnalytics(
            @PathVariable String storeId,
            @RequestParam Integer startYear,
            @RequestParam Integer startMonth,
            @RequestParam Integer endYear,
            @RequestParam Integer endMonth,
            @RequestParam(defaultValue = "false") boolean includeComparison,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", "custom-range");
        filters.put("startYear", startYear);
        filters.put("startMonth", startMonth);
        filters.put("endYear", endYear);
        filters.put("endMonth", endMonth);
        filters.put("includeComparison", includeComparison);
        return ResponseEntity.ok(pizzaService.getStoreCustomRangeAnalytics(storeId, user, filters));
    }

    @PostMapping("/stores/{storeId}/analytics/compare")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreComparePeriods(
            @PathVariable String storeId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> periods = (List<Map<String, Object>>) requestBody.get("periods");
        
        // Validate we have 2-4 periods
        if (periods == null || periods.size() < 2 || periods.size() > 4) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<Map<String, Object>> result = pizzaService.getStoreComparePeriods(storeId, periods);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error comparing store periods for storeId: " + storeId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Map<String, Object> buildEnhancedFilters(String timePeriod, Integer year, Integer month, Integer quarter,
                                                     String startDate, String endDate, boolean compareWithState, 
                                                     boolean compareWithNational, boolean includeRankings, boolean includeTrends) {
        Map<String, Object> filters = new HashMap<>();
        filters.put("timePeriod", timePeriod != null ? timePeriod : "all-time");
        filters.put("year", year);
        filters.put("month", month);
        filters.put("quarter", quarter);
        filters.put("startDate", startDate);
        filters.put("endDate", endDate);
        filters.put("compareWithState", compareWithState);
        filters.put("compareWithNational", compareWithNational);
        filters.put("includeRankings", includeRankings);
        filters.put("includeTrends", includeTrends);
        return filters;
    }

    // =================================================================
    // PRODUCTS INFO ALL - New MV-based Product Analytics
    // =================================================================

    @GetMapping("/products/kpi")
    public ResponseEntity<Map<String, Object>> getProductKPI(
            @RequestParam String sku,
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer endMonth,
            @RequestParam(defaultValue = "false") boolean sinceLaunch,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        Map<String, Object> filters = buildProductFilters(sku, timePeriod, year, month, startYear, startMonth, endYear, endMonth, sinceLaunch);
        return ResponseEntity.ok(pizzaService.getProductKPI(user, filters));
    }

    @GetMapping("/products/trend")
    public ResponseEntity<List<Map<String, Object>>> getProductTrend(
            @RequestParam String sku,
            @RequestParam String metric,
            @RequestParam(defaultValue = "month") String interval,
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer endMonth,
            @RequestParam(defaultValue = "false") boolean sinceLaunch,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        Map<String, Object> filters = buildProductFilters(sku, timePeriod, year, month, startYear, startMonth, endYear, endMonth, sinceLaunch);
        filters.put("metric", metric);
        filters.put("interval", interval);
        return ResponseEntity.ok(pizzaService.getProductTrend(user, filters));
    }

    @GetMapping("/products/compare")
    public ResponseEntity<Map<String, Object>> getProductComparison(
            @RequestParam String sku,
            @RequestParam String periodLength,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer endMonth,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        Map<String, Object> filters = new HashMap<>();
        filters.put("sku", sku);
        filters.put("periodLength", periodLength);
        filters.put("year", year);
        filters.put("month", month);
        filters.put("startYear", startYear);
        filters.put("startMonth", startMonth);
        filters.put("endYear", endYear);
        filters.put("endMonth", endMonth);
        return ResponseEntity.ok(pizzaService.getProductComparison(user, filters));
    }

    @GetMapping("/products/trend/export")
    public void exportProductTrend(
            @RequestParam String sku,
            @RequestParam String metric,
            @RequestParam(defaultValue = "month") String interval,
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer endMonth,
            @RequestParam(defaultValue = "false") boolean sinceLaunch,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        
        User user = userDetails.getUser();
        Map<String, Object> filters = buildProductFilters(sku, timePeriod, year, month, startYear, startMonth, endYear, endMonth, sinceLaunch);
        filters.put("metric", metric);
        filters.put("interval", interval);
        
        List<Map<String, Object>> data = pizzaService.getProductTrend(user, filters);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "product-trend.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, String.format("product-trend-%s-%s.csv", sku, metric));
    }

    // =================================================================
    // NEW PRODUCTS PAGE API - Following Specification
    // =================================================================

    @GetMapping("/products")
    public ResponseEntity<List<Map<String, Object>>> getProductsCatalogue(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        List<Map<String, Object>> products = pizzaService.getProductsCatalogueWithLaunchDate(search, user);
        return ResponseEntity.ok(products);
    }

    @GetMapping("/products/performance") 
    public ResponseEntity<List<Map<String, Object>>> getProductsPerformance(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> storeIds,
            @RequestParam(required = false) List<String> states,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getProductsPerformance(year, month, category, search, user, storeIds, states));
    }

    @GetMapping("/products/kpis")
    public ResponseEntity<Map<String, Object>> getProductsKpis(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> storeIds,
            @RequestParam(required = false) List<String> states,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getProductsKpis(year, month, category, user, storeIds, states));
    }

    @GetMapping("/products/revenue-by-category")
    public ResponseEntity<List<Map<String, Object>>> getRevenueByCategory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> storeIds,
            @RequestParam(required = false) List<String> states,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByCategory(year, month, search, user, storeIds, states));
    }

    @GetMapping("/products/export")
    public void exportProductsCatalogue(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        
        User user = userDetails.getUser();
        
        try {
            List<Map<String, Object>> products = pizzaService.getProductsCatalogueWithLaunchDate(search, user);
            
            List<String> headers = List.of("SKU", "Product Name", "Size", "Price", "Category", "Launch Date");
            List<List<String>> rows = products.stream()
                .map(product -> List.of(
                    String.valueOf(product.get("sku")),
                    String.valueOf(product.get("product_name")),
                    String.valueOf(product.get("size")),
                    String.valueOf(product.get("price")),
                    String.valueOf(product.get("category")),
                    String.valueOf(product.get("launch_date"))
                ))
                .toList();
            
            String filename = "products-catalogue-" + (search != null ? "filtered-" : "") + new Date().toInstant().toString().split("T")[0] + ".csv";
            CsvExportUtil.writeCsv(response, headers, rows, filename);
        } catch (Exception e) {
            logger.error("Error exporting products catalogue", e);
            List<String> headers = List.of("Error");
            List<List<String>> rows = List.of(List.of("Export failed"));
            CsvExportUtil.writeCsv(response, headers, rows, "error.csv");
        }
    }

    @GetMapping("/products/performance/export")
    public void exportProductsPerformance(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> storeIds,
            @RequestParam(required = false) List<String> states,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        
        User user = userDetails.getUser();
        
        try {
            List<Map<String, Object>> performance = pizzaService.getProductsPerformance(year, month, category, search, user, storeIds, states);
            
            List<String> headers = List.of("SKU", "Product Name", "Size", "Price", "Category", "Launch Date", "Total Revenue", "Orders", "Units Sold");
            List<List<String>> rows = performance.stream()
                .map(product -> List.of(
                    String.valueOf(product.get("sku")),
                    String.valueOf(product.get("product_name")),
                    String.valueOf(product.get("size")),
                    String.valueOf(product.get("price")),
                    String.valueOf(product.get("category")),
                    String.valueOf(product.get("launch_date")),
                    String.valueOf(product.get("total_revenue")),
                    String.valueOf(product.get("amount_ordered")),
                    String.valueOf(product.get("units_sold"))
                ))
                .toList();
            
            String filterSuffix = (year != null ? "-year" + year : "") + 
                                (month != null ? "-month" + month : "") + 
                                (category != null ? "-" + category.toLowerCase() : "") +
                                (search != null ? "-filtered" : "") +
                                (storeIds != null && !storeIds.isEmpty() ? "-stores" : "");
            String filename = "products-performance" + filterSuffix + "-" + new Date().toInstant().toString().split("T")[0] + ".csv";
            CsvExportUtil.writeCsv(response, headers, rows, filename);
        } catch (Exception e) {
            logger.error("Error exporting products performance", e);
            List<String> headers = List.of("Error");
            List<List<String>> rows = List.of(List.of("Export failed"));
            CsvExportUtil.writeCsv(response, headers, rows, "error.csv");
        }
    }

    @GetMapping("/products/overview-chart")
    public ResponseEntity<List<Map<String, Object>>> getProductsOverviewChart(
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getProductsOverviewChart(user, timePeriod, year, month));
    }

    @GetMapping("/products/overview-chart/custom-range")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getProductsCustomRangeOverview(
            @RequestParam Integer startYear,
            @RequestParam Integer startMonth,
            @RequestParam Integer endYear,
            @RequestParam Integer endMonth,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        
        try {
            List<Map<String, Object>> result = pizzaService.getProductsCustomRangeOverview(user, startYear, startMonth, endYear, endMonth);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error getting products custom range overview for user: " + user.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/products/overview-chart/compare")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getProductsComparePeriodsOverview(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> periods = (List<Map<String, Object>>) requestBody.get("periods");
        
        if (periods == null || periods.size() < 2 || periods.size() > 4) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Map<String, Object> result = pizzaService.getProductsComparePeriodsOverview(user, periods);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error comparing products periods for user: " + user.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/products/analytics/custom-range")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getProductCustomRangeAnalytics(
            @RequestParam String sku,
            @RequestParam Integer startYear,
            @RequestParam Integer startMonth,
            @RequestParam Integer endYear,
            @RequestParam Integer endMonth,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        
        try {
            Map<String, Object> result = pizzaService.getProductCustomRangeAnalytics(user, sku, startYear, startMonth, endYear, endMonth);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error getting product custom range analytics for sku: " + sku, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/products/analytics/compare")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getProductComparePeriods(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        
        String sku = (String) requestBody.get("sku");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> periods = (List<Map<String, Object>>) requestBody.get("periods");
        
        if (sku == null || periods == null || periods.size() < 2 || periods.size() > 4) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<Map<String, Object>> result = pizzaService.getProductComparePeriods(user, sku, periods);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error comparing product periods for sku: " + sku, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/products/analytics/custom-range/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportProductCustomRangeAnalytics(
            @RequestParam String sku,
            @RequestParam Integer startYear,
            @RequestParam Integer startMonth,
            @RequestParam Integer endYear,
            @RequestParam Integer endMonth,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        
        User user = userDetails.getUser();
        
        try {
            Map<String, Object> analytics = pizzaService.getProductCustomRangeAnalytics(user, sku, startYear, startMonth, endYear, endMonth);
            
            // Convert analytics to CSV-friendly format
            List<String> headers = List.of("SKU", "Period", "Revenue", "Orders", "Units Sold", "Unique Customers", "Avg Order Value");
            List<List<String>> rows = List.of(List.of(
                sku,
                startYear + "-" + startMonth + " to " + endYear + "-" + endMonth,
                String.valueOf(analytics.get("totalRevenue")),
                String.valueOf(analytics.get("totalOrders")),
                String.valueOf(analytics.get("totalUnits")),
                String.valueOf(analytics.get("totalCustomers")),
                String.valueOf(analytics.get("avgOrderValue"))
            ));
            
            String filename = "product-analytics-" + sku + "-" + startYear + "-" + startMonth + "-to-" + endYear + "-" + endMonth + ".csv";
            CsvExportUtil.writeCsv(response, headers, rows, filename);
        } catch (Exception e) {
            logger.error("Error exporting product custom range analytics for sku: " + sku, e);
            List<String> headers = List.of("Error");
            List<List<String>> rows = List.of(List.of("Export failed"));
            CsvExportUtil.writeCsv(response, headers, rows, "error.csv");
        }
    }

    @PostMapping("/products/analytics/compare/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportProductCompareAnalytics(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> result = pizzaService.getProductComparePeriods(user, (String) requestBody.get("sku"),
                (List<Map<String, Object>>) requestBody.get("periods"));
        
        if (result.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "product-comparison.csv");
            return;
        }

        List<String> headers = List.copyOf(result.get(0).keySet());
        List<List<String>> rows = result.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();
        
        CsvExportUtil.writeCsv(response, headers, rows, "product-comparison.csv");
    }

    @GetMapping("/products/revenue-trend")
    public ResponseEntity<List<Map<String, Object>>> getProductRevenueTrend(
            @RequestParam String sku,
            @RequestParam(defaultValue = "all-time") String timePeriod,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        List<Map<String, Object>> trend = pizzaService.getProductRevenueTrend(user, sku, timePeriod);
        return ResponseEntity.ok(trend);
    }

    private Map<String, Object> buildProductFilters(String sku, String timePeriod, Integer year, Integer month,
                                                   Integer startYear, Integer startMonth, Integer endYear, Integer endMonth,
                                                   boolean sinceLaunch) {
        Map<String, Object> filters = new HashMap<>();
        filters.put("sku", sku);
        filters.put("timePeriod", timePeriod);
        filters.put("year", year);
        filters.put("month", month);
        filters.put("startYear", startYear);
        filters.put("startMonth", startMonth);
        filters.put("endYear", endYear);
        filters.put("endMonth", endMonth);
        filters.put("sinceLaunch", sinceLaunch);
        return filters;
    }

    // =================================================================
    // ORDERS ANALYTICS - Dashboard with Filtering and Pagination
    // =================================================================

    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrdersWithFiltersAndPagination(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) String store,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String orderid,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "orderdate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        User user = userDetails.getUser();
        
        Map<String, Object> result = pizzaService.getOrdersWithFiltersAndPagination(
            page, limit, store, state, orderid, search, from, to, sortBy, sortOrder, user);
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/orders/export")
    public void exportOrdersWithFilters(
            @RequestParam(required = false) String store,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String orderid,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        
        User user = userDetails.getUser();
        
        // Get all orders without pagination for export
        Map<String, Object> result = pizzaService.getOrdersWithFiltersAndPagination(
            0, 10000, store, state, orderid, search, from, to, "orderdate", "desc", user);
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> orders = (List<Map<String, Object>>) result.get("orders");
        
        if (orders.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "orders.csv");
            return;
        }

        List<String> headers = List.of(
            "Order ID", "Customer ID", "Order Date", "Store ID", "State", "City", "Items", "Total"
        );
        
        List<List<String>> rows = orders.stream()
                .map(order -> List.of(
                    String.valueOf(order.get("orderid")),
                    String.valueOf(order.get("customerid")),
                    String.valueOf(order.get("orderdate")),
                    String.valueOf(order.get("storeid")),
                    String.valueOf(order.get("state_code")),
                    String.valueOf(order.get("city")),
                    String.valueOf(order.get("nitems")),
                    String.valueOf(order.get("order_value"))
                ))
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "pizza-world-orders.csv");
    }

    @GetMapping("/orders/available-states")
    public ResponseEntity<List<Map<String, Object>>> getAvailableStatesForOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            User user = userDetails.getUser();
            List<Map<String, Object>> states = pizzaService.getAvailableStatesForOrders(user);
            return ResponseEntity.ok(states);
        } catch (Exception e) {
            logger.error("Error fetching available states for orders", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/orders/kpis")
    public ResponseEntity<Map<String, Object>> getOrdersKPIs(
            @RequestParam(required = false) String store,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String orderid,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        try {
            User user = userDetails.getUser();
            Map<String, Object> kpis = pizzaService.getOrdersKPIs(
                store, state, orderid, search, from, to, user);
            return ResponseEntity.ok(kpis);
        } catch (Exception e) {
            logger.error("Error fetching orders KPIs", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/products/details/{sku}")
    public ResponseEntity<Map<String, Object>> getProductDetailsBySku(@PathVariable String sku) {
        Map<String, Object> product = pizzaService.getProductBySku(sku);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(product);
    }

    // =================================================================
    // CUSTOMER LIFETIME VALUE ANALYTICS - New Endpoints
    // =================================================================

    @GetMapping("/analytics/customer-lifetime-value")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getCustomerLifetimeValue(
            @RequestParam(defaultValue = "100") Integer limit,
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getCustomerLifetimeValue(user, limit, states, storeIds));
    }

    @GetMapping("/analytics/customer-lifetime-value/summary")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getCustomerLifetimeValueSummary(
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getCustomerLifetimeValueSummary(user, states, storeIds));
    }

    @GetMapping("/analytics/customer-lifetime-value/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportCustomerLifetimeValue(
            @RequestParam(defaultValue = "1000") Integer limit,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getCustomerLifetimeValue(user, limit);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "customer-lifetime-value.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "customer-lifetime-value.csv");
    }

    // =================================================================
    // CUSTOMER RETENTION ANALYTICS - New Endpoints
    // =================================================================

    @GetMapping("/analytics/customer-retention")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getCustomerRetentionAnalysis(
            @RequestParam(defaultValue = "24") Integer limit,
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getCustomerRetentionAnalysis(user, limit, states, storeIds));
    }

    @GetMapping("/analytics/customer-retention/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportCustomerRetentionAnalysis(
            @RequestParam(defaultValue = "48") Integer limit,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getCustomerRetentionAnalysis(user, limit);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "customer-retention-analysis.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "customer-retention-analysis.csv");
    }

    // =================================================================
    // STORE CAPACITY ANALYTICS - New Endpoints
    // =================================================================

    @GetMapping("/analytics/store-capacity")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityAnalysis(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityAnalysis(user));
    }

    @GetMapping("/analytics/store-capacity/summary")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreCapacitySummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacitySummary(user));
    }

    @GetMapping("/analytics/store-capacity/peak-hours")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getPeakHoursAnalysis(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getPeakHoursAnalysis(user));
    }

    @GetMapping("/analytics/store-capacity/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportStoreCapacityAnalysis(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getStoreCapacityAnalysis(user);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "store-capacity-analysis.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "store-capacity-analysis.csv");
    }

    // =================================================================
    // STORE CAPACITY V3 - Enhanced capacity analysis with delivery metrics
    // =================================================================

    @GetMapping("/analytics/store-capacity-v3/summary")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityV3Summary(
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3Summary(user, states, storeIds));
    }

    @GetMapping("/analytics/store-capacity-v3/metrics")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityV3Metrics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3Metrics(user, year, month));
    }

    @GetMapping("/analytics/store-capacity-v3/peak-hours")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityV3PeakHours(
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3PeakHours(user, states, storeIds));
    }

    @GetMapping("/analytics/store-capacity-v3/customer-distance")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStoreCapacityV3CustomerDistance(
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3CustomerDistance(user, states, storeIds));
    }

    @GetMapping("/analytics/store-capacity-v3/delivery-metrics")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityV3DeliveryMetrics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) List<String> states,
            @RequestParam(required = false) List<String> storeIds,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3DeliveryMetrics(user, year, month, states, storeIds));
    }

    @GetMapping("/analytics/store-capacity-v3/utilization-chart")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getStoreCapacityV3UtilizationChart(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getStoreCapacityV3UtilizationChart(user, year, month));
    }

    @GetMapping("/analytics/store-capacity-v3/export")
    @PreAuthorize("hasAuthority('HQ_ADMIN') or hasAuthority('STATE_MANAGER') or hasAuthority('STORE_MANAGER')")
    public void exportStoreCapacityV3Analysis(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.getStoreCapacityV3Summary(user);
        
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("No Data"), List.of(), "store-capacity-v3.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "store-capacity-v3.csv");
    }

}