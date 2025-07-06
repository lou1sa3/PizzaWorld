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
        
        // Business context
        if (businessContext != null && !businessContext.isEmpty()) {
            prompt.append("\nCURRENT BUSINESS DATA:\n");
            businessContext.forEach((key, value) -> {
                prompt.append("- ").append(key).append(": ").append(value).append("\n");
            });
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
        prompt.append("\nRESPONSE GUIDELINES:\n");
        prompt.append("- Keep responses concise but informative (max 300 words)\n");
        prompt.append("- Use emojis sparingly and professionally\n");
        prompt.append("- Provide specific, actionable recommendations when possible\n");
        prompt.append("- Reference the actual data provided when relevant\n");
        prompt.append("- Stay focused on Pizza World business context\n");
        prompt.append("- If you don't have enough data, ask clarifying questions\n\n");
        
        // User's actual message
        prompt.append("USER MESSAGE: ").append(userMessage).append("\n\n");
        prompt.append("RESPONSE:");
        
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