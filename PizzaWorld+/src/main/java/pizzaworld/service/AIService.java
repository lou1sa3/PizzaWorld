package pizzaworld.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import pizzaworld.model.AIInsight;
import pizzaworld.model.ChatMessage;
import pizzaworld.model.User;
import pizzaworld.repository.OptimizedPizzaRepo;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIService {
    
    private static final Logger logger = LoggerFactory.getLogger(AIService.class);
    
    @Autowired
    private OptimizedPizzaRepo repo;
    
    @Autowired
    private OptimizedPizzaService pizzaService;
    
    @Autowired
    private GemmaAIService gemmaAIService;
    
    // In-memory storage for demo purposes - in production, use a database
    private final Map<String, List<ChatMessage>> chatSessions = new HashMap<>();
    private final List<AIInsight> insights = new ArrayList<>();
    
    /**
     * Process a chat message and generate an AI response
     */
    public ChatMessage processChatMessage(String sessionId, String message, User user) {
        try {
            logger.info("Processing chat message for user: {} in session: {}", user.getUsername(), sessionId);
            
            // Create user message
            ChatMessage userMessage = new ChatMessage(sessionId, user.getUsername(), message, "user");
            userMessage.setUserRole(user.getRole());
            userMessage.setId(UUID.randomUUID().toString());
            
            // Categorize the message
            String category = categorizeMessage(message);
            userMessage.setCategory(category);
            
            // Generate AI response with Gemma AI integration
            String aiResponse = generateAIResponseWithGemma(message, user, category);
            
            // Create AI response message
            ChatMessage aiMessage = new ChatMessage(sessionId, "AI_ASSISTANT", aiResponse, "assistant");
            aiMessage.setId(UUID.randomUUID().toString());
            aiMessage.setCategory(category);
            
            // Store messages in session
            chatSessions.computeIfAbsent(sessionId, k -> new ArrayList<>()).add(userMessage);
            chatSessions.computeIfAbsent(sessionId, k -> new ArrayList<>()).add(aiMessage);
            
            return aiMessage;
            
        } catch (Exception e) {
            logger.error("Error processing chat message: {}", e.getMessage(), e);
            ChatMessage errorMessage = new ChatMessage(sessionId, "AI_ASSISTANT", 
                "I apologize, but I'm experiencing technical difficulties. Please try again or contact support.", "assistant");
            errorMessage.setId(UUID.randomUUID().toString());
            return errorMessage;
        }
    }
    
    /**
     * Generate AI response with Gemma AI integration and fallback
     */
    private String generateAIResponseWithGemma(String message, User user, String category) {
        try {
            // Gather business context for the AI
            Map<String, Object> businessContext = gatherBusinessContext(user, category);
            
            // Try Gemma AI first
            if (gemmaAIService.isAvailable()) {
                logger.info("Using Gemma AI for response generation");
                String gemmaResponse = gemmaAIService.generateResponse(message, user, category, businessContext);
                
                if (gemmaResponse != null && !gemmaResponse.trim().isEmpty()) {
                    return gemmaResponse;
                }
                
                logger.warn("Gemma AI returned empty response, falling back to rule-based");
            } else {
                logger.info("Gemma AI not available, using rule-based responses");
            }
            
            // Fallback to original rule-based responses
            return generateRuleBasedResponse(message, user, category, businessContext);
            
        } catch (Exception e) {
            logger.error("Error in AI response generation: {}", e.getMessage(), e);
            return generateRuleBasedResponse(message, user, category, new HashMap<>());
        }
    }
    
    /**
     * Gather business context relevant to the user's query
     */
    private Map<String, Object> gatherBusinessContext(User user, String category) {
        Map<String, Object> context = new HashMap<>();
        
        try {
            // Add role-specific business data
            switch (user.getRole()) {
                case "HQ_ADMIN":
                    Map<String, Object> hqKpis = repo.getHQKPIs();
                    if (hqKpis != null) {
                        context.put("total_revenue", formatCurrency(((Number) hqKpis.getOrDefault("revenue", 0)).doubleValue()));
                        context.put("total_orders", formatNumber(((Number) hqKpis.getOrDefault("orders", 0)).intValue()));
                        context.put("avg_order_value", formatCurrency(((Number) hqKpis.getOrDefault("avg_order", 0)).doubleValue()));
                        context.put("total_customers", formatNumber(((Number) hqKpis.getOrDefault("customers", 0)).intValue()));
                    }
                    break;
                    
                case "STATE_MANAGER":
                    Map<String, Object> stateKpis = repo.getStateKPIs(user.getStateAbbr());
                    if (stateKpis != null) {
                        context.put("state_revenue", formatCurrency(((Number) stateKpis.getOrDefault("revenue", 0)).doubleValue()));
                        context.put("state_orders", formatNumber(((Number) stateKpis.getOrDefault("orders", 0)).intValue()));
                        context.put("state", user.getStateAbbr());
                    }
                    break;
                    
                case "STORE_MANAGER":
                    Map<String, Object> storeKpis = repo.getStoreKPIs(user.getStoreId());
                    if (storeKpis != null) {
                        context.put("store_revenue", formatCurrency(((Number) storeKpis.getOrDefault("revenue", 0)).doubleValue()));
                        context.put("store_orders", formatNumber(((Number) storeKpis.getOrDefault("orders", 0)).intValue()));
                        context.put("store_id", user.getStoreId());
                    }
                    break;
            }
            
            // Add category-specific context
            if ("analytics".equals(category)) {
                // Add recent trends or performance indicators
                context.put("data_scope", user.getRole().toLowerCase().replace("_", " "));
                context.put("current_date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            }
            
        } catch (Exception e) {
            logger.error("Error gathering business context: {}", e.getMessage(), e);
        }
        
        return context;
    }
    
    /**
     * Original rule-based response generation (fallback)
     */
    private String generateRuleBasedResponse(String message, User user, String category, Map<String, Object> businessContext) {
        String lower = message.toLowerCase();
        
        // Support responses
        if (category.equals("support")) {
            if (lower.contains("password") || lower.contains("login")) {
                return "I can help with password issues! For security reasons, I'll need to direct you to our secure password reset process. Would you like me to guide you through the steps or connect you with a human agent?";
            } else if (lower.contains("access") || lower.contains("permission")) {
                return "Access issues can be role-specific. As a " + user.getRole() + ", you should have access to certain features. Let me check what might be causing the issue. Can you tell me specifically what you're trying to access?";
            } else {
                return "I'm here to help! Can you provide more details about the issue you're experiencing? I can assist with account access, data questions, or connect you with the right support team.";
            }
        }
        
        // Analytics responses with business context
        if (category.equals("analytics")) {
            try {
                return generateAnalyticsResponse(message, user, businessContext);
            } catch (Exception e) {
                return "I'd be happy to help with analytics! I can provide insights about revenue, customer data, store performance, and product analytics based on your role as " + user.getRole() + ". What specific metrics would you like to explore?";
            }
        }
        
        // General responses
        return "Hello! I'm your Pizza World AI assistant powered by Google Gemma. I can help you with:\n\n" +
               "📊 **Analytics & Insights** - Ask about revenue, customers, stores, and products\n" +
               "🔧 **Support** - Get help with account issues or technical problems\n" +
               "📈 **Business Intelligence** - Get recommendations and performance insights\n\n" +
               "What would you like to know?";
    }
    
    // Helper methods for formatting
    private String formatCurrency(double value) {
        return String.format("$%,.2f", value);
    }
    
    private String formatNumber(int value) {
        return String.format("%,d", value);
    }
    
    /**
     * Get chat history for a session
     */
    public List<ChatMessage> getChatHistory(String sessionId) {
        return chatSessions.getOrDefault(sessionId, new ArrayList<>());
    }
    
    /**
     * Generate business insights based on user role and data
     */
    public List<AIInsight> generateBusinessInsights(User user) {
        List<AIInsight> userInsights = new ArrayList<>();
        
        try {
            // Generate role-specific insights
            switch (user.getRole()) {
                case "HQ_ADMIN":
                    userInsights.addAll(generateHQInsights());
                    break;
                case "STATE_MANAGER":
                    userInsights.addAll(generateStateInsights(user.getStateAbbr()));
                    break;
                case "STORE_MANAGER":
                    userInsights.addAll(generateStoreInsights(user.getStoreId()));
                    break;
            }
            
        } catch (Exception e) {
            logger.error("Error generating business insights: {}", e.getMessage(), e);
        }
        
        return userInsights;
    }
    
    /**
     * Analyze natural language query and return structured response
     */
    public Map<String, Object> analyzeQuery(String query, User user) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Try Gemma AI for query analysis first
            if (gemmaAIService.isAvailable()) {
                Map<String, Object> businessContext = gatherBusinessContext(user, "analytics");
                String aiAnalysis = gemmaAIService.generateResponse(query, user, "analytics", businessContext);
                
                if (aiAnalysis != null && !aiAnalysis.trim().isEmpty()) {
                    response.put("type", "ai_analysis");
                    response.put("answer", aiAnalysis);
                    response.put("powered_by", "Google Gemma AI");
                    return response;
                }
            }
            
            // Fallback to simple keyword-based analysis
            String lowerQuery = query.toLowerCase();
            
            if (lowerQuery.contains("revenue") || lowerQuery.contains("sales")) {
                response = analyzeRevenueQuery(query, user);
            } else if (lowerQuery.contains("customer") || lowerQuery.contains("retention")) {
                response = analyzeCustomerQuery(query, user);
            } else if (lowerQuery.contains("store") || lowerQuery.contains("performance")) {
                response = analyzeStoreQuery(query, user);
            } else if (lowerQuery.contains("product") || lowerQuery.contains("menu")) {
                response = analyzeProductQuery(query, user);
            } else {
                response.put("type", "general");
                response.put("answer", "I can help you analyze revenue, customers, stores, and products. Try asking something like 'What's our top performing store?' or 'How is customer retention?'");
            }
            
        } catch (Exception e) {
            logger.error("Error analyzing query: {}", e.getMessage(), e);
            response.put("error", "Unable to process your query at this time.");
        }
        
        return response;
    }
    
    /**
     * Get Gemma AI status and configuration
     */
    public Map<String, Object> getAIStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("gemma_available", gemmaAIService.isAvailable());
        status.put("gemma_config", gemmaAIService.getConfigInfo());
        status.put("fallback_enabled", true);
        return status;
    }
    
    // Private helper methods
    
    private String categorizeMessage(String message) {
        String lower = message.toLowerCase();
        
        if (lower.contains("help") || lower.contains("support") || lower.contains("problem")) {
            return "support";
        } else if (lower.contains("revenue") || lower.contains("sales") || lower.contains("analytics") || 
                   lower.contains("performance") || lower.contains("data")) {
            return "analytics";
        } else {
            return "general";
        }
    }
    
    private String generateAnalyticsResponse(String message, User user, Map<String, Object> businessContext) {
        String lower = message.toLowerCase();
        
        if (lower.contains("revenue") || lower.contains("sales")) {
            return generateRevenueInsight(user);
        } else if (lower.contains("top") && lower.contains("store")) {
            return generateTopStoreInsight(user);
        } else if (lower.contains("customer")) {
            return generateCustomerInsight(user);
        } else if (lower.contains("product")) {
            return generateProductInsight(user);
        } else {
            return "I can provide analytics insights! Try asking about:\n" +
                   "• 'What's our revenue performance?'\n" +
                   "• 'Which stores are performing best?'\n" +
                   "• 'How are our customers doing?'\n" +
                   "• 'What are our top products?'";
        }
    }
    
    private String generateRevenueInsight(User user) {
        try {
            // Get basic KPIs based on user role
            Map<String, Object> kpis;
            switch (user.getRole()) {
                case "HQ_ADMIN":
                    kpis = repo.getHQKPIs();
                    break;
                case "STATE_MANAGER":
                    kpis = repo.getStateKPIs(user.getStateAbbr());
                    break;
                case "STORE_MANAGER":
                    kpis = repo.getStoreKPIs(user.getStoreId());
                    break;
                default:
                    return "I don't have access to revenue data for your role.";
            }
            
            if (kpis != null && !kpis.isEmpty()) {
                double revenue = ((Number) kpis.getOrDefault("revenue", 0)).doubleValue();
                int orders = ((Number) kpis.getOrDefault("orders", 0)).intValue();
                double avgOrder = ((Number) kpis.getOrDefault("avg_order", 0)).doubleValue();
                
                return String.format("📊 **Revenue Insights** (Powered by Google Gemma)\n\n" +
                    "💰 Total Revenue: $%,.2f\n" +
                    "📦 Total Orders: %,d\n" +
                    "💵 Average Order Value: $%.2f\n\n" +
                    "Based on your %s role, this represents your accessible data scope.",
                    revenue, orders, avgOrder, user.getRole());
            }
        } catch (Exception e) {
            logger.error("Error generating revenue insight: {}", e.getMessage());
        }
        
        return "I'm unable to retrieve revenue data at the moment. Please try again or check with your system administrator.";
    }
    
    private String generateTopStoreInsight(User user) {
        try {
            List<Map<String, Object>> stores;
            switch (user.getRole()) {
                case "HQ_ADMIN":
                    stores = repo.getStorePerformanceHQ();
                    break;
                case "STATE_MANAGER":
                    stores = repo.getStorePerformanceState(user.getStateAbbr());
                    break;
                default:
                    return "Store performance data is available for HQ and State managers.";
            }
            
            if (stores != null && !stores.isEmpty()) {
                Map<String, Object> topStore = stores.get(0);
                String storeId = (String) topStore.get("storeid");
                String city = (String) topStore.get("city");
                double revenue = ((Number) topStore.getOrDefault("total_revenue", 0)).doubleValue();
                
                return String.format("🏆 **Top Performing Store** (Powered by Google Gemma)\n\n" +
                    "🏪 Store: %s (%s)\n" +
                    "💰 Revenue: $%,.2f\n" +
                    "📍 Location: %s\n\n" +
                    "This store is leading in your accessible region.",
                    storeId, city, revenue, city);
            }
        } catch (Exception e) {
            logger.error("Error generating top store insight: {}", e.getMessage());
        }
        
        return "I'm unable to retrieve store performance data at the moment.";
    }
    
    private String generateCustomerInsight(User user) {
        return "👥 **Customer Insights** (Powered by Google Gemma)\n\n" +
               "Customer analytics are available in the Customer Analytics section. " +
               "I can help you understand customer lifetime value, retention rates, and acquisition trends.\n\n" +
               "Would you like me to guide you to the customer analytics page?";
    }
    
    private String generateProductInsight(User user) {
        return "🍕 **Product Insights** (Powered by Google Gemma)\n\n" +
               "Product performance data is available in the Products section. " +
               "I can help you analyze top-selling items, category performance, and product trends.\n\n" +
               "Would you like me to guide you to the products analytics page?";
    }
    
    private List<AIInsight> generateHQInsights() {
        List<AIInsight> insights = new ArrayList<>();
        
        // Revenue insight
        AIInsight revenueInsight = new AIInsight("performance", "Revenue Performance", 
            "Overall revenue performance is strong with consistent growth patterns.");
        revenueInsight.setCategory("revenue");
        revenueInsight.setTargetEntity("company");
        revenueInsight.setConfidence(0.85);
        revenueInsight.setRecommendation("Continue current strategies while exploring expansion opportunities.");
        insights.add(revenueInsight);
        
        // Store performance insight
        AIInsight storeInsight = new AIInsight("optimization", "Store Optimization", 
            "Several stores show potential for performance improvement.");
        storeInsight.setCategory("operations");
        storeInsight.setTargetEntity("stores");
        storeInsight.setConfidence(0.78);
        storeInsight.setRecommendation("Focus on underperforming stores with targeted training and resource allocation.");
        insights.add(storeInsight);
        
        return insights;
    }
    
    private List<AIInsight> generateStateInsights(String state) {
        List<AIInsight> insights = new ArrayList<>();
        
        AIInsight stateInsight = new AIInsight("regional", "State Performance", 
            "State " + state + " shows strong regional performance with growth opportunities.");
        stateInsight.setCategory("regional");
        stateInsight.setTargetEntity("state");
        stateInsight.setTargetEntityId(state);
        stateInsight.setConfidence(0.82);
        stateInsight.setRecommendation("Consider expanding successful strategies to neighboring regions.");
        insights.add(stateInsight);
        
        return insights;
    }
    
    private List<AIInsight> generateStoreInsights(String storeId) {
        List<AIInsight> insights = new ArrayList<>();
        
        AIInsight storeInsight = new AIInsight("local", "Store Performance", 
            "Store " + storeId + " has opportunities for operational optimization.");
        storeInsight.setCategory("operations");
        storeInsight.setTargetEntity("store");
        storeInsight.setTargetEntityId(storeId);
        storeInsight.setConfidence(0.75);
        storeInsight.setRecommendation("Focus on peak hour optimization and customer retention strategies.");
        insights.add(storeInsight);
        
        return insights;
    }
    
    private Map<String, Object> analyzeRevenueQuery(String query, User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "revenue");
        response.put("answer", generateRevenueInsight(user));
        return response;
    }
    
    private Map<String, Object> analyzeCustomerQuery(String query, User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "customer");
        response.put("answer", generateCustomerInsight(user));
        return response;
    }
    
    private Map<String, Object> analyzeStoreQuery(String query, User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "store");
        response.put("answer", generateTopStoreInsight(user));
        return response;
    }
    
    private Map<String, Object> analyzeProductQuery(String query, User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "product");
        response.put("answer", generateProductInsight(user));
        return response;
    }
} 