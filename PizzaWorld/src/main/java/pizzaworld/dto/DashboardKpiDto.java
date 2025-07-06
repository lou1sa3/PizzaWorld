package pizzaworld.dto;

public class DashboardKpiDto {
    public double revenue;
    public int orders;
    public double avgOrder;
    public int customers;
    public int products;

    public DashboardKpiDto(double revenue, int orders, double avgOrder, int customers, int products) {
        this.revenue = revenue;
        this.orders = orders;
        this.avgOrder = avgOrder;
        this.customers = customers;
        this.products = products;
    }
}
