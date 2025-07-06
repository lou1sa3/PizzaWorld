package pizzaworld.dto;

public class StoreRevenueByTimeDto {
    public String storeid;
    public String city;
    public String stateName;
    public String stateAbbr;
    public Integer year;
    public Integer month;
    public Integer quarter;
    public Integer week;
    public String yearLabel;
    public String monthLabel;
    public String monthNameLabel;
    public String quarterLabel;
    public String weekLabel;
    public double totalRevenue;
    public long orderCount;
    public long uniqueCustomers;
    public double avgOrderValue;
    public long totalItemsSold;
    public String lastUpdated;

    public StoreRevenueByTimeDto(String storeid, String city, String stateName, String stateAbbr,
                                Integer year, Integer month, Integer quarter, Integer week,
                                String yearLabel, String monthLabel, String monthNameLabel,
                                String quarterLabel, String weekLabel, double totalRevenue,
                                long orderCount, long uniqueCustomers, double avgOrderValue,
                                long totalItemsSold, String lastUpdated) {
        this.storeid = storeid;
        this.city = city;
        this.stateName = stateName;
        this.stateAbbr = stateAbbr;
        this.year = year;
        this.month = month;
        this.quarter = quarter;
        this.week = week;
        this.yearLabel = yearLabel;
        this.monthLabel = monthLabel;
        this.monthNameLabel = monthNameLabel;
        this.quarterLabel = quarterLabel;
        this.weekLabel = weekLabel;
        this.totalRevenue = totalRevenue;
        this.orderCount = orderCount;
        this.uniqueCustomers = uniqueCustomers;
        this.avgOrderValue = avgOrderValue;
        this.totalItemsSold = totalItemsSold;
        this.lastUpdated = lastUpdated;
    }
}