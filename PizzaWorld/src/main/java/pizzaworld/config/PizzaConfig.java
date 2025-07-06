package pizzaworld.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;

public class PizzaConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("storeKPIs");
    }

}
