package pizzaworld.dto;

public class StoreRevenueAllTimeDto {
    public String storeid;
    public String city;
    public String stateName;
    public String stateAbbr;
    public double totalRevenue;
    public long totalOrders;
    public long totalUniqueCustomers;
    public double avgOrderValue;
    public long totalItemsSold;
    public String firstOrderDate;
    public String lastOrderDate;
    public long totalActiveDays;
    public String lastUpdated;

    public StoreRevenueAllTimeDto(String storeid, String city, String stateName, String stateAbbr,
                                 double totalRevenue, long totalOrders, long totalUniqueCustomers,
                                 double avgOrderValue, long totalItemsSold, String firstOrderDate,
                                 String lastOrderDate, long totalActiveDays, String lastUpdated) {
        this.storeid = storeid;
        this.city = city;
        this.stateName = stateName;
        this.stateAbbr = stateAbbr;
        this.totalRevenue = totalRevenue;
        this.totalOrders = totalOrders;
        this.totalUniqueCustomers = totalUniqueCustomers;
        this.avgOrderValue = avgOrderValue;
        this.totalItemsSold = totalItemsSold;
        this.firstOrderDate = firstOrderDate;
        this.lastOrderDate = lastOrderDate;
        this.totalActiveDays = totalActiveDays;
        this.lastUpdated = lastUpdated;
    }
}