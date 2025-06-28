package pizzaworld.controller;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import pizzaworld.service.PizzaService;
import pizzaworld.service.UserService;
import pizzaworld.model.CustomUserDetails;
import pizzaworld.model.User;
import pizzaworld.util.CsvExportUtil;
import pizzaworld.dto.DashboardKpiDto;

@RestController
@RequestMapping("/api")
public class PizzaController {

    @Autowired
    private PizzaService pizzaService;

    @Autowired
    private UserService userService;

    // 📊 Dashboard KPIs
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardKPIs(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getDashboardKPIs(user));
    }

    @GetMapping("/dashboard/export")
    public void exportDashboardCsv(@AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        DashboardKpiDto data = pizzaService.getDashboardKPIs(userDetails.getUser());
        List<String> headers = List.of("Revenue", "Orders", "AvgOrder", "Customers", "Products");
        List<List<String>> rows = List.of(List.of(
                String.valueOf(data.revenue),
                String.valueOf(data.orders),
                String.valueOf(data.avgOrder),
                String.valueOf(data.customers),
                String.valueOf(data.products)));
        CsvExportUtil.writeCsv(response, headers, rows, "dashboard.csv");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "role", user.getRole()));
    }

    @GetMapping("/stores")
    public ResponseEntity<?> getFilteredStores(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.filterStores(params, user));
    }

    @GetMapping("/stores/export")
    public void exportFilteredStores(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {

        User user = userDetails.getUser();
        List<Map<String, Object>> data = pizzaService.filterStores(params, user);

        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("Keine Daten"), List.of(), "stores.csv");
            return;
        }

        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();

        CsvExportUtil.writeCsv(response, headers, rows, "stores.csv");
    }

    // 🏪 Store KPIs + Best/Worst
    @GetMapping("/store/{storeId}")
    public ResponseEntity<?> getStoreKPIsOld(@PathVariable String storeId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        System.out.println("🔍 DEBUG: OLD Controller received storeId: '" + storeId + "'");
        System.out.println("🔍 DEBUG: User role: " + userDetails.getUser().getRole());
        System.out.println("🔍 DEBUG: User storeId: " + userDetails.getUser().getStoreId());

        return ResponseEntity.ok(pizzaService.getStoreKPIs(storeId, userDetails));
    }

    @GetMapping("/stores/{storeId}/kpis")
    public ResponseEntity<?> getStoreKPIs(@PathVariable String storeId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        System.out.println("🔍 DEBUG: NEW Controller received storeId: '" + storeId + "'");

        // TEMP: Handle case where userDetails is null (no authentication)
        if (userDetails == null) {
            System.out.println("🔍 DEBUG: No authentication, using test user");
            User testUser = new User();
            testUser.setRole("HQ_ADMIN");
            testUser.setStoreId("S948821");
            testUser.setStateAbbr("CA");
            userDetails = new CustomUserDetails(testUser);
        }

        System.out.println("🔍 DEBUG: User role: " + userDetails.getUser().getRole());
        System.out.println("🔍 DEBUG: User storeId: " + userDetails.getUser().getStoreId());

        return ResponseEntity.ok(pizzaService.getStoreKPIs(storeId, userDetails));
    }

    // 📆 Sales KPIs
    @GetMapping("/sales")
    public ResponseEntity<?> getSalesKPIs(@RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getSalesKPIs(from, to, user));
    }

    @GetMapping("/sales/export")
    public void exportSalesCsv(@RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        Map<String, Object> data = pizzaService.getSalesKPIs(from, to, userDetails.getUser());
        List<String> headers = List.of("Revenue", "Total Orders", "Unique Customers", "Avg Order");
        List<List<String>> rows = List.of(List.of(
                String.valueOf(data.get("revenue")),
                String.valueOf(data.get("total_orders")),
                String.valueOf(data.get("unique_customers")),
                String.valueOf(data.get("avg_order"))));
        CsvExportUtil.writeCsv(response, headers, rows, "sales.csv");
    }

    // 📦 Orders
    @GetMapping("/orders")
    public ResponseEntity<?> getFilteredOrders(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.dynamicOrderFilter(params, user));
    }

    @GetMapping("/orders/export")
    public void exportOrdersCsv(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        List<Map<String, Object>> data = pizzaService.dynamicOrderFilter(params, userDetails.getUser());
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("Keine Daten"), List.of(), "orders.csv");
            return;
        }
        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();
        CsvExportUtil.writeCsv(response, headers, rows, "orders.csv");
    }

    /**
     * 🧀 API: GET /api/products?storeId=...&category=...&available=...
     * ⏩ Gibt Produkte gefiltert nach Filiale, Kategorie, Verfügbarkeit zurück
     * 🔐 Zugriff:
     * - HQ_ADMIN: alle Produkte
     * - STATE_MANAGER: nur Produkte aus eigenen Filialen
     * - STORE_MANAGER: nur eigene Filiale
     * ✅ Frontend:
     * - Flexibler Einsatz in Produktübersicht / Management-UI
     * - Beispiel: /api/products?storeId=S490972&category=Pizza
     */
    @GetMapping("/products")
    public ResponseEntity<?> getFilteredProducts(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        System.out.println("🔐 Controller erreicht");
        System.out.println("👤 userDetails: " + userDetails);
        return ResponseEntity.ok(pizzaService.filterProducts(params, user));
    }

    @GetMapping("/products/export")
    public void exportProducts(@RequestParam Map<String, String> params,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) {
        List<Map<String, Object>> data = pizzaService.filterProducts(params, userDetails.getUser());
        if (data.isEmpty()) {
            CsvExportUtil.writeCsv(response, List.of("Keine Daten"), List.of(), "products.csv");
            return;
        }
        List<String> headers = List.copyOf(data.get(0).keySet());
        List<List<String>> rows = data.stream()
                .map(row -> headers.stream().map(h -> String.valueOf(row.get(h))).toList())
                .toList();
        CsvExportUtil.writeCsv(response, headers, rows, "products.csv");
    }

    @GetMapping("/product/{sku}")
    public ResponseEntity<?> getProductDetail(@PathVariable String sku) {
        return ResponseEntity.ok(pizzaService.getProductDetails(sku));
    }

    @GetMapping("/orders/trend")
    public ResponseEntity<?> getOrderTrend(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User user = userDetails.getUser();
        return ResponseEntity.ok(
                pizzaService.fetchWeeklyOrderTrend(from, to, user));
    }

    // 📊 Revenue by Store for Dashboard Chart
    @GetMapping("/dashboard/revenue-by-store")
    public ResponseEntity<?> getRevenueByStore(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getRevenueByStore(user));
    }

    // 📈 KPI Endpoints for Charts
    @GetMapping("/kpi/stores-per-day")
    public ResponseEntity<?> getStoresPerDay() {
        return ResponseEntity.ok(pizzaService.getStoresPerDay());
    }

    @GetMapping("/kpi/sales-per-day")
    public ResponseEntity<?> getSalesPerDay() {
        return ResponseEntity.ok(pizzaService.getSalesPerDay());
    }

    @GetMapping("/kpi/orders-per-day")
    public ResponseEntity<?> getOrdersPerDay() {
        return ResponseEntity.ok(pizzaService.getOrdersPerDay());
    }

    // 🧪 Test endpoint to verify controller is working
    @GetMapping("/test")
    public ResponseEntity<?> testEndpoint() {
        return ResponseEntity.ok(Map.of("message", "Controller is working!"));
    }

    // 🧪 Test endpoint for store KPIs without authentication (for debugging)
    @GetMapping("/stores/{storeId}/kpis/test")
    public ResponseEntity<?> getStoreKPIsTest(@PathVariable String storeId) {
        System.out.println("🔍 DEBUG: TEST Controller received storeId: '" + storeId + "'");

        // Create a mock user for testing
        User testUser = new User();
        testUser.setRole("HQ_ADMIN");
        testUser.setStoreId("S948821");
        testUser.setStateAbbr("CA");

        CustomUserDetails testUserDetails = new CustomUserDetails(testUser);

        return ResponseEntity.ok(pizzaService.getStoreKPIs(storeId, testUserDetails));
    }

    // 📊 Performance Data (All stores + Global KPIs)
    @GetMapping("/dashboard/performance-data")
    public ResponseEntity<?> getPerformanceData(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        return ResponseEntity.ok(pizzaService.getPerformanceData(user));
    }

}