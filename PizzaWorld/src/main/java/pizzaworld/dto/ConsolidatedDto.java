package pizzaworld.dto;

import java.util.List;
import java.util.Map;

/**
 * Consolidated dashboard payload that the HQ role (and other roles) can fetch
 * in one round-trip.  It bundles the global KPIs plus the most commonly used
 * analytics slices so the front-end doesn't have to make a handful of parallel
 * calls.
 */
public class ConsolidatedDto {

    /** HQ-, state- or store-level roll-up KPIs */
    public DashboardKpiDto globalKPIs;

    /** Revenue aggregated by month (chronological order) */
    public List<Map<String, Object>> revenueByMonth;

    /** Orders aggregated by month (chronological order) */
    public List<Map<String, Object>> ordersByMonth;

    /** Revenue aggregated by store (already filtered per role) */
    public List<Map<String, Object>> revenueByStore;

    /** Top products (quantity / revenue) – limited result set */
    public List<Map<String, Object>> topProducts;

    public ConsolidatedDto() {}

    public ConsolidatedDto(
            DashboardKpiDto globalKPIs,
            List<Map<String, Object>> revenueByMonth,
            List<Map<String, Object>> ordersByMonth,
            List<Map<String, Object>> revenueByStore,
            List<Map<String, Object>> topProducts) {
        this.globalKPIs = globalKPIs;
        this.revenueByMonth = revenueByMonth;
        this.ordersByMonth = ordersByMonth;
        this.revenueByStore = revenueByStore;
        this.topProducts = topProducts;
    }
} 