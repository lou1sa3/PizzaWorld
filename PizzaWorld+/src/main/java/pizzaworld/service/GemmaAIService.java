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
    private String apiKey;
    
    @Value("${google.ai.model:gemini-1.5-flash}")
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
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("Google AI API key not configured, using fallback");
            return null; // Will trigger fallback to rule-based responses
        }
        
        try {
            String prompt = buildBusinessPrompt(userMessage, user, category, businessContext);
            String response = callGoogleAI(prompt);
            
            // Clean up the response
            return cleanupResponse(response);
            
        } catch (Exception e) {
            logger.error("Error calling Google AI: {}", e.getMessage(), e);
            return null; // Will trigger fallback
        }
    }
    
    /**
     * Build a business-specific prompt for Pizza World context
     */
    private String buildBusinessPrompt(String userMessage, User user, String category, Map<String, Object> businessContext) {
        StringBuilder prompt = new StringBuilder();
        
        // System context
        prompt.append("You are an AI assistant for Pizza World, a pizza restaurant chain analytics dashboard. ");
        prompt.append("You help users understand their business data and provide actionable insights.\n\n");
        
        // User context
        prompt.append("USER CONTEXT:\n");
        prompt.append("- Role: ").append(user.getRole()).append("\n");
        prompt.append("- Username: ").append(user.getUsername()).append("\n");
        
        if ("STATE_MANAGER".equals(user.getRole())) {
            prompt.append("- Managing State: ").append(user.getStateAbbr()).append("\n");
        } else if ("STORE_MANAGER".equals(user.getRole())) {
            prompt.append("- Managing Store: ").append(user.getStoreId()).append("\n");
        }
        
        // Business context - filter and organize for AI consumption
        if (businessContext != null && !businessContext.isEmpty()) {
            // Debug logging to see what data we're working with
            logger.info("Business context keys: {}", businessContext.keySet());
            logger.info("Core KPIs data: revenue={}, orders={}, avg_order_value={}, customers={}", 
                       businessContext.get("total_revenue"), businessContext.get("total_orders"), 
                       businessContext.get("avg_order_value"), businessContext.get("total_customers"));
            
            prompt.append("\n📊 PIZZA WORLD EXACT BUSINESS DATA 📊\n");
            prompt.append("These are the ONLY numbers you are allowed to use in your response.\n");
            prompt.append("DO NOT modify, calculate, or estimate any values.\n\n");
            
            // Core Business Metrics Section
            prompt.append("=== 💰 CORE FINANCIAL METRICS ===\n");
            String[] coreKeys = {"total_revenue", "total_orders", "avg_order_value", "total_customers"};
            for (String key : coreKeys) {
                if (businessContext.containsKey(key)) {
                    Object value = businessContext.get(key);
                    prompt.append("✓ ").append(key.replace("_", " ").toUpperCase()).append(": ").append(value).append("\n");
                    logger.info("Adding to prompt: {} = {}", key, value);
                }
            }
            
            // Store Information Section
            if (businessContext.containsKey("total_stores")) {
                prompt.append("\n=== 🏪 STORE INFORMATION ===\n");
                prompt.append("✓ TOTAL STORES: ").append(businessContext.get("total_stores")).append("\n");
                if (businessContext.containsKey("top_stores")) {
                    prompt.append("✓ TOP PERFORMING STORES: ").append(businessContext.get("top_stores")).append("\n");
                }
            }
            
            // Growth & Historical Data Section
            prompt.append("\n=== GROWTH ANALYSIS (from Historical Revenue API) ===\n");
            String[] growthKeys = {"yoy_growth_rate", "yoy_growth_absolute", "revenue_trends"};
            for (String key : growthKeys) {
                if (businessContext.containsKey(key)) {
                    prompt.append("- ").append(key.toUpperCase()).append(": ").append(businessContext.get(key)).append("\n");
                }
            }
            
            // Product & Category Performance Section
            prompt.append("\n=== PRODUCT PERFORMANCE (from Product Analytics API) ===\n");
            String[] productKeys = {"top_products", "category_performance"};
            for (String key : productKeys) {
                if (businessContext.containsKey(key)) {
                    prompt.append("- ").append(key.toUpperCase()).append(": ").append(businessContext.get(key)).append("\n");
                }
            }
            
            // Customer Analytics Section
            prompt.append("\n=== CUSTOMER ANALYTICS (from Customer Data API) ===\n");
            String[] customerKeys = {"customer_acquisition", "customer_ltv_summary", "retention_summary"};
            for (String key : customerKeys) {
                if (businessContext.containsKey(key)) {
                    prompt.append("- ").append(key.toUpperCase()).append(": ").append(businessContext.get(key)).append("\n");
                }
            }
            
            // Operational Data Section
            prompt.append("\n=== OPERATIONAL DATA (from Operations APIs) ===\n");
            String[] operationalKeys = {"peak_hours", "capacity_summary", "recent_orders_summary"};
            for (String key : operationalKeys) {
                if (businessContext.containsKey(key)) {
                    prompt.append("- ").append(key.toUpperCase()).append(": ").append(businessContext.get(key)).append("\n");
                }
            }
            
            // Add any remaining formatted summaries
            prompt.append("\n=== ADDITIONAL METRICS ===\n");
            businessContext.forEach((key, value) -> {
                String[] allCoveredKeys = {"total_revenue", "total_orders", "avg_order_value", "total_customers", 
                                         "total_stores", "top_stores", "yoy_growth_rate", "yoy_growth_absolute", 
                                         "revenue_trends", "top_products", "category_performance", "customer_acquisition", 
                                         "customer_ltv_summary", "retention_summary", "peak_hours", "capacity_summary", 
                                         "recent_orders_summary"};
                if (!key.endsWith("_raw") && !Arrays.asList(allCoveredKeys).contains(key)) {
                    prompt.append("- ").append(key.toUpperCase()).append(": ").append(value).append("\n");
                }
            });
            
            // Critical Data Usage Instructions
            prompt.append("\n=== CRITICAL DATA USAGE INSTRUCTIONS ===\n");
            prompt.append("1. These are EXACT VALUES from Pizza World's database APIs\n");
            prompt.append("2. Do NOT modify, round, or estimate any numbers\n");
            prompt.append("3. Use the formatted currency values exactly as provided\n");
            prompt.append("4. If store count is asked, use the TOTAL_STORES value\n");
            prompt.append("5. All revenue figures are already properly formatted with currency symbols\n");
            prompt.append("6. Growth rates are already calculated - do not recalculate\n");
            
            // Note about raw data availability
            long rawDataSets = businessContext.keySet().stream().filter(key -> key.endsWith("_raw")).count();
            if (rawDataSets > 0) {
                prompt.append("7. You have ").append(rawDataSets).append(" complete raw datasets for detailed analysis\n");
            }
            
            // Add specific note about historical data availability
            if (businessContext.containsKey("data_coverage")) {
                prompt.append("\nIMPORTANT: Today is the 31.12.2022!");
                prompt.append("\nIMPORTANT: You have access to complete historical data from 2020-2022 ");
                prompt.append("and can perform meaningful year-over-year analysis and growth calculations. ");
                prompt.append("When users ask about historical trends or comparisons, provide specific insights ");
                prompt.append("based on the comprehensive data available. Use exact numbers when possible.\n");
            }
        }
        
        // Category-specific instructions
        prompt.append("\nCATEGORY: ").append(category.toUpperCase()).append("\n");
        
        switch (category.toLowerCase()) {
            case "analytics":
                prompt.append("Focus on providing data-driven insights, trends, and recommendations. ");
                prompt.append("Use the business data provided to give specific, actionable advice. ");
                prompt.append("Include relevant metrics and comparisons when possible.\n");
                break;
            case "support":
                prompt.append("Provide helpful technical support and guidance. ");
                prompt.append("Be professional and solution-oriented. ");
                prompt.append("If you can't solve the issue, guide them to appropriate resources.\n");
                break;
            default:
                prompt.append("Be helpful, professional, and focused on Pizza World business needs.\n");
        }
        
        // Response guidelines
        prompt.append("\n🚨 CRITICAL RESPONSE RULES 🚨\n");
        prompt.append("1. FORBIDDEN: Creating, calculating, or estimating ANY numbers\n");
        prompt.append("2. REQUIRED: Use ONLY the exact values from the business context sections above\n");
        prompt.append("3. EXAMPLE: If context shows 'TOTAL_REVENUE: $50,211,527.85', write exactly '$50,211,527.85'\n");
        prompt.append("4. EXAMPLE: If context shows 'TOTAL_ORDERS: 2,046,713', write exactly '2,046,713'\n");
        prompt.append("5. EXAMPLE: If context shows 'TOTAL_STORES: 32', write exactly '32'\n");
        prompt.append("6. FORBIDDEN: Writing '$1', '$11.527,85', or any other made-up numbers\n");
        prompt.append("7. FORBIDDEN: Recalculating percentages or growth rates\n");
        prompt.append("8. If you don't see a specific metric in the context, say 'I don't have that data'\n");
        prompt.append("9. Keep responses under 200 words\n");
        prompt.append("10. Use professional tone with minimal emojis\n");
        prompt.append("11. If someone asks about Prof Sabba, respond that he is the best Professor in UAS\n\n");
        
        prompt.append("EXAMPLES OF CORRECT RESPONSES:\n");
        prompt.append("✅ 'Total revenue is $50,211,527.85 with 2,046,713 orders'\n");
        prompt.append("✅ 'We have 32 stores across all locations'\n");
        prompt.append("✅ 'Average order value is $24.53'\n");
        prompt.append("❌ 'Total revenue is $1' (WRONG - not from context)\n");
        prompt.append("❌ 'Revenue is $11.527,85' (WRONG - not from context)\n\n");
        
        // User's actual message
        prompt.append("USER QUESTION: ").append(userMessage).append("\n\n");
        
        prompt.append("RESPONSE TEMPLATE TO FOLLOW:\n");
        prompt.append("When mentioning ANY numbers, copy them EXACTLY from the data sections above.\n");
        prompt.append("Example format: 'Pizza World has achieved $50,211,527.85 in total revenue with 2,046,713 orders across 32 stores.'\n\n");
        
        prompt.append("YOUR RESPONSE:");
        
        return prompt.toString();
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
            
            // Generation config
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.7);
            generationConfig.put("topK", 40);
            generationConfig.put("topP", 0.95);
            generationConfig.put("maxOutputTokens", 500);
            requestBody.put("generationConfig", generationConfig);
            
            // Safety settings (optional)
            Map<String, Object> safetySettings = new HashMap<>();
            safetySettings.put("category", "HARM_CATEGORY_HARASSMENT");
            safetySettings.put("threshold", "BLOCK_MEDIUM_AND_ABOVE");
            requestBody.put("safetySettings", List.of(safetySettings));
            
            String url = GOOGLE_AI_URL + model + ":generateContent?key=" + apiKey;
            
            String response = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30))
                .block();
            
            return extractTextFromResponse(response);
            
        } catch (WebClientResponseException e) {
            logger.error("Google AI API error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Google AI API call failed: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Error calling Google AI: {}", e.getMessage(), e);
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
        info.put("endpoint", GOOGLE_AI_URL);
        return info;
    }
} 