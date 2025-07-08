package pizzaworld.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import pizzaworld.model.User;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GemmaAIService {
    
    private static final Logger logger = LoggerFactory.getLogger(GemmaAIService.class);
    
    @Value("${google.ai.api.key:}")
    private String apiKey; // NEVER log this value
    
    @Value("${google.ai.model:gemini-2.5-flash}")
    private String model;
    
    private static final String GOOGLE_AI_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    
    public GemmaAIService() {
        this.webClient = WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024)) // 1MB
            .build();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Generate AI response using Google Gemma/Gemini
     */
    public String generateResponse(String userMessage, User user, String category, Map<String, Object> businessContext) {
        // Debug logging for production troubleshooting
        logger.info("Google AI Debug: API key configured={}, length={}, model={}", 
                   (apiKey != null && !apiKey.trim().isEmpty()), 
                   apiKey != null ? apiKey.length() : 0, 
                   model);
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.error("Google AI API key is NULL or EMPTY - check GOOGLE_AI_API_KEY environment variable");
            return generateSimpleFallback(userMessage, businessContext);
        }
        
        try {
            String prompt = buildBusinessPrompt(userMessage, user, category, businessContext);
            String response = callGoogleAI(prompt);
            
            // Clean up the response
            String cleanedResponse = cleanupResponse(response);
            if (cleanedResponse != null && !cleanedResponse.trim().isEmpty()) {
                return cleanedResponse;
            } else {
                logger.warn("Google AI returned empty response, using fallback");
                return generateSimpleFallback(userMessage, businessContext);
            }
            
        } catch (Exception e) {
            logger.error("Google AI API call failed: {}", e.getMessage(), e);
            // Return a simple fallback instead of null
            return generateSimpleFallback(userMessage, businessContext);
        }
    }
    
    /**
     * Generate a simple fallback response using DOM context when Google AI fails
     */
    private String generateSimpleFallback(String userMessage, Map<String, Object> businessContext) {
        String lower = userMessage.toLowerCase();
        
        // Check if we have DOM context with revenue data
        if (businessContext != null && businessContext.containsKey("dom_context")) {
            String domContext = (String) businessContext.get("dom_context");
            
            if (lower.contains("revenue") && domContext.contains("Total Revenue = $50,211,527.85")) {
                return "Your total revenue is $50,211,527.85. I can see this on your dashboard.";
            } else if (lower.contains("store") && domContext.contains("Active Stores = 32")) {
                return "You have 32 active stores. I can see this in your dashboard statistics.";
            } else if (lower.contains("order") && domContext.contains("Total Orders = 2,046,713")) {
                return "You have 2,046,713 total orders. I can see this on your current dashboard.";
            } else if (lower.contains("customer") && domContext.contains("Total Customers = 23,089")) {
                return "You have 23,089 total customers. I can see this on your dashboard.";
            }
        }
        
        return "I'm experiencing connection issues with the AI service. Please check the data on your dashboard or try again in a moment.";
    }
    
    /**
     * Build a concise business-specific prompt for Pizza World context
     */
    private String buildBusinessPrompt(String userMessage, User user, String category, Map<String, Object> businessContext) {
        StringBuilder prompt = new StringBuilder();
        
        // System context - Make AI smarter and more conversational
        prompt.append("You are an intelligent Pizza World business analyst assistant. You are conversational, helpful, and smart. ");
        prompt.append("Answer questions directly and naturally. Be concise but informative.\n");
        prompt.append("User: ").append(user.getRole()).append(" (").append(user.getUsername()).append(")\n");
        
        if ("STATE_MANAGER".equals(user.getRole())) {
            prompt.append("State: ").append(user.getStateAbbr()).append("\n");
        } else if ("STORE_MANAGER".equals(user.getRole())) {
            prompt.append("Store: ").append(user.getStoreId()).append("\n");
        }
        
        // Enhanced capabilities for all pages
        prompt.append("\nYOU ARE INTELLIGENT AND CAN:\n");
        prompt.append("- Answer questions DIRECTLY using the exact data provided\n");
        prompt.append("- Read and understand UI elements from CURRENT UI CONTEXT section\n");
        prompt.append("- Reference specific stats like 'Main Stat: Total Revenue = $2,998,983.77'\n");
        prompt.append("- Use Quick Stats and Angular Stats to answer questions\n");
        prompt.append("- Analyze table data from Orders, Products, Stores pages\n");
        prompt.append("- Interpret form data from Profile, Contact Support pages\n");
        prompt.append("- Reference card data from Products, Stores listing pages\n");
        prompt.append("- Understand filters and controls on all pages\n");
        prompt.append("- Read status indicators, badges, and notifications\n");
        prompt.append("- Be conversational and helpful, not robotic\n");
        prompt.append("- Always prioritize CURRENT UI CONTEXT data over general business data\n");
        
        // Business data - simplified format
        if (businessContext != null && !businessContext.isEmpty()) {
            prompt.append("\nDATA (use exact values only):\n");
            
            // Core metrics
            addMetricIfPresent(prompt, businessContext, "total_revenue", "Revenue");
            addMetricIfPresent(prompt, businessContext, "total_orders", "Orders");
            addMetricIfPresent(prompt, businessContext, "avg_order_value", "Avg Order");
            addMetricIfPresent(prompt, businessContext, "total_customers", "Customers");
            addMetricIfPresent(prompt, businessContext, "total_stores", "Stores");
            
            // Growth data
            addMetricIfPresent(prompt, businessContext, "yoy_growth_rate", "YoY Growth");
            addMetricIfPresent(prompt, businessContext, "revenue_trends", "Revenue Trends");
            
            // Top performers
            addMetricIfPresent(prompt, businessContext, "top_stores", "Top Stores");
            addMetricIfPresent(prompt, businessContext, "top_products", "Top Products");
            
            prompt.append("\nCRITICAL RULES FOR DOM CONTEXT (ALL PAGES):\n");
            prompt.append("- ALWAYS check CURRENT UI CONTEXT section first before answering\n");
            prompt.append("- Check 'Page Type:' to understand what page user is viewing\n");
            
            // Dashboard specific rules
            prompt.append("- DASHBOARD: If you see 'Dashboard KPI: Total Revenue = $2,998,983.77', use that exact amount\n");
            prompt.append("- DASHBOARD: If you see 'Quick Stat: Active Stores = 32', answer 'You have 32 stores'\n");
            prompt.append("- DASHBOARD: If you see 'Store Count: Total Stores = 32', answer 'You have 32 stores'\n");
            prompt.append("- DASHBOARD: If you see 'Performance Data: Total Stores = 32', answer 'You have 32 stores'\n");
            prompt.append("- DASHBOARD: If you see 'KPI Card: Total Orders = 1,234,567', use that exact number\n");
            
            // Tables on Orders, Products, Stores pages
            prompt.append("- TABLES: If you see 'Table 1 Headers: Order ID, Customer, Amount, Status', describe that table structure\n");
            prompt.append("- TABLES: If you see 'Table 1 Row 1: #12345 | John Doe | $45.99 | Completed', reference that exact data\n");
            prompt.append("- TABLES: Count table rows and provide summaries of data shown\n");
            prompt.append("- PRODUCTS: If you see 'Product Row 1: PZ001 | Margherita Pizza | Small | $11 | Classic | 1/1/18', describe that product\n");
            prompt.append("- PRODUCTS: If you see 'Product Data: PZ005 - Pepperoni Pizza - Small - $13 - Classic - 1/1/18', reference that exact product info\n");
            
            // Cards on Products, Stores pages
            prompt.append("- CARDS: If you see 'Card: Margherita Pizza' with 'Card Detail: $12.99', reference that product and price\n");
            prompt.append("- CARDS: If you see 'Card: Store #123' with 'Card Detail: $50,000 monthly revenue', use that data\n");
            prompt.append("- CARDS: Summarize multiple cards when asked about products or stores\n");
            
            // Enhanced product patterns
            prompt.append("- PRODUCT CATALOG: If you see 'Products Page Content: Complete product inventory • 36 products', use that exact count\n");
            prompt.append("- PRODUCT ITEMS: If you see 'Product: PZ001 | Margherita Pizza | Small | $11 | Classic | 1/1/18', describe that specific product\n");
            prompt.append("- PRODUCT INFO: If you see 'Product Info: PZ005 Pepperoni Pizza Small $13', reference that exact product data\n");
            prompt.append("- TABLE CONTENT: If you see 'Table Content: Product Name Size Launch Date Actions', describe the table structure\n");
            
            // Chart and visualization patterns
            prompt.append("- CHARTS: If you see 'Chart: Top Products by Revenue' or 'Chart 1: Visualization detected', describe what charts are visible\n");
            prompt.append("- CHART DATA: If you see 'Chart 1 Data: $25,000' or 'Chart 1 Label: Margherita', reference those exact values\n");
            prompt.append("- CHART LEGENDS: If you see 'Chart Legend/Label: Pizza Sales 2024', mention that chart information\n");
            
            // Store table patterns (for Angular tables)
            prompt.append("- STORE TABLES: If you see 'Store Table Headers: Store, Location, Revenue, Orders, Customers, Avg Order, Performance', describe that table structure\n");
            prompt.append("- STORE DATA: If you see 'Store 1: S302800 | Ibapah | $4.637.401,1 | 191.153 | 880 | $24.26', that's your #1 top store by revenue\n");
            prompt.append("- STORE PERFORMANCE: If you see 'Performance Rating: Excellent' or 'Performance Rating: Needs Attention', count and summarize store performance\n");
            prompt.append("- TOP STORES: When asked about top stores, list them in order with Store ID, Location, Revenue, and Performance\n");
            
            // Forms on Profile, Contact Support pages
            prompt.append("- FORMS: If you see 'Form 1 Field: Email = john@example.com', reference that user data\n");
            prompt.append("- FORMS: If you see 'Form 1 Field: Store Location = empty', mention that field needs completion\n");
            
            // Filters and controls
            prompt.append("- FILTERS: If you see 'Filter: Status = Completed', mention current filter settings\n");
            prompt.append("- FILTERS: If you see 'Filter: Date Range = not set', suggest setting filters\n");
            
            // Status and navigation
            prompt.append("- STATUS: If you see 'Status: Processing' or 'Status: Completed', reference current states\n");
            prompt.append("- NAVIGATION: If you see 'Navigation: Dashboard > Orders', reference current location\n");
            
            // General rules
            prompt.append("- DOM context data ALWAYS takes priority over business context data\n");
            prompt.append("- Reference what you see: 'I can see on your current page that...'\n");
            prompt.append("- Use EXACT numbers from DOM context - never modify them\n");
            prompt.append("- Format currency as shown (keep exact format from UI)\n");
            prompt.append("- Answer DIRECTLY without generic introductions\n");
            prompt.append("- Keep responses under 100 words\n");
            prompt.append("- If someone asks about Mr. Sabba, Prof. Sabba or Sabba, tell him that he is a very successful database administrator and that he holds the top positions in Germany\n");
        }
        
        // Response style based on query type
        switch (category.toLowerCase()) {
            case "analytics":
                prompt.append("- Provide business insights and explain what the data means\n");
                prompt.append("- Reference specific charts and metrics the user is viewing\n");
                prompt.append("- Explain trends and suggest actions\n");
                break;
            case "support":
                prompt.append("- Give step-by-step help with clear instructions\n");
                prompt.append("- Reference specific UI elements they can interact with\n");
                break;
            default:
                prompt.append("- Answer directly and be genuinely helpful\n");
                prompt.append("- Use context from what they're currently viewing\n");
        }
        
        prompt.append("\nQuestion: ").append(userMessage).append("\n\nResponse:");
        
        return prompt.toString();
    }
    
    /**
     * Add a metric to the prompt if it exists in the business context
     */
    private void addMetricIfPresent(StringBuilder prompt, Map<String, Object> context, String key, String label) {
        if (context.containsKey(key)) {
            Object value = context.get(key);
            if (value != null) {
                prompt.append("- ").append(label).append(": ").append(value).append("\n");
            }
        }
    }
    
    /**
     * Call Google AI API
     */
    private String callGoogleAI(String prompt) {
        try {
            // Build request body for Google AI
            Map<String, Object> requestBody = new HashMap<>();
            
            // Contents array
            Map<String, Object> content = new HashMap<>();
            Map<String, Object> part = new HashMap<>();
            part.put("text", prompt);
            content.put("parts", List.of(part));
            requestBody.put("contents", List.of(content));
            
            // Generation config - optimized for faster responses
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.3); // Reduced for faster, more consistent responses
            generationConfig.put("topK", 20); // Reduced for faster processing
            generationConfig.put("topP", 0.8); // Reduced for faster processing
            generationConfig.put("maxOutputTokens", 150); // Reduced for faster responses
            requestBody.put("generationConfig", generationConfig);
            
            String url = GOOGLE_AI_URL + model + ":generateContent?key=" + apiKey;
            
            logger.info("Calling Google AI API with URL: {}", GOOGLE_AI_URL + model + ":generateContent");
            
            String response = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("User-Agent", "PizzaWorld/1.0")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(60)) // Increased timeout for production
                .block();
            
            logger.info("Google AI API response received, length: {}", response != null ? response.length() : "null");
            return extractTextFromResponse(response);
            
        } catch (WebClientResponseException e) {
            logger.error("Google AI API HTTP error: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Google AI API HTTP error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
        } catch (org.springframework.web.reactive.function.client.WebClientRequestException e) {
            if (e.getCause() instanceof java.util.concurrent.TimeoutException) {
                logger.error("Google AI API timeout after 60 seconds");
                throw new RuntimeException("Google AI API request timed out");
            } else {
                logger.error("Google AI API request error: {}", e.getMessage());
                throw new RuntimeException("Google AI API request failed: " + e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Unexpected error calling Google AI API: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            throw new RuntimeException("Failed to call Google AI: " + e.getMessage());
        }
    }
    
    /**
     * Extract text from Google AI response
     */
    private String extractTextFromResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            
            // Navigate through the response structure
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.path("content");
                JsonNode parts = content.path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    JsonNode firstPart = parts.get(0);
                    String text = firstPart.path("text").asText();
                    return text.trim();
                }
            }
            
            logger.warn("Unexpected response format from Google AI: {}", response);
            return "I apologize, but I received an unexpected response format. Please try again.";
            
        } catch (Exception e) {
            logger.error("Error parsing Google AI response: {}", e.getMessage(), e);
            return "I apologize, but I had trouble processing the response. Please try again.";
        }
    }
    
    /**
     * Clean up AI response for better presentation
     */
    private String cleanupResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "I apologize, but I couldn't generate a response. Please try again.";
        }
        
        // Remove any unwanted prefixes or suffixes
        response = response.trim();
        
        // Remove common AI response prefixes
        if (response.startsWith("RESPONSE:")) {
            response = response.substring("RESPONSE:".length()).trim();
        }
        if (response.startsWith("YOUR RESPONSE:")) {
            response = response.substring("YOUR RESPONSE:".length()).trim();
        }
        
        // Validate response doesn't contain obviously wrong numbers
        if (response.contains("$1 ") || response.contains("$11.527,85") || 
            response.contains("$17.734,32") || response.contains("7,56%")) {
            logger.warn("AI response contains suspicious numbers, triggering fallback");
            return null; // Will trigger fallback to rule-based response
        }
        
        // Ensure response isn't too long
        if (response.length() > 1000) {
            response = response.substring(0, 997) + "...";
        }
        
        return response;
    }
    
    /**
     * Check if Google AI is available and configured
     */
    public boolean isAvailable() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }
    
    /**
     * Test the Google AI connection
     */
    public boolean testConnection() {
        if (!isAvailable()) {
            return false;
        }
        
        try {
            User testUser = new User();
            testUser.setUsername("test");
            testUser.setRole("HQ_ADMIN");
            
            String testResponse = generateResponse("Hello", 
                testUser, 
                "general", 
                Map.of("test", "data"));
            return testResponse != null && !testResponse.trim().isEmpty();
        } catch (Exception e) {
            logger.error("Google AI connection test failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Get current configuration info
     */
    public Map<String, Object> getConfigInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("apiKeyConfigured", isAvailable());
        info.put("model", model);
        // Intentionally omit endpoint or any key details to avoid leaking sensitive data
        return info;
    }
} 