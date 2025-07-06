
package pizzaworld.dto;
public record SalesKpiDto(
  double revenue,
  long   totalOrders,
  long   uniqueCustomers,
  double avgOrder
) {}
