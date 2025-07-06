package pizzaworld.dto;

public class KpisGlobalStoreDto {
    public String state;
    public String storeId;
    public double revenue;
    public long orders;
    public double avgOrderValue;
    public long customers;
    public String lastUpdated;

    public KpisGlobalStoreDto(String state, String storeId, double revenue, long orders, double avgOrderValue, long customers, String lastUpdated) {
        this.state = state;
        this.storeId = storeId;
        this.revenue = revenue;
        this.orders = orders;
        this.avgOrderValue = avgOrderValue;
        this.customers = customers;
        this.lastUpdated = lastUpdated;
    }
}