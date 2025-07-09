package pizzaworld.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import pizzaworld.model.User;

import java.time.Duration;
import java.util.*;
import java.util.Arrays;

@Service
public class OpenRouterAIService {

    private static final Logger logger = LoggerFactory.getLogger(OpenRouterAIService.class);

    private static final String OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

    @Value("${openrouter.api.key:}")
    private String apiKey;

    @Value("${openrouter.enabled:true}")
    private boolean enabled;

    // Model 1 (Primary)
    @Value("${openrouter.model.1:openrouter/cypher-alpha:free}")
    private String model1;
    
    @Value("${openrouter.max.tokens.1:5000}")
    private int maxTokens1;

    // Model 2 (Fallback)
    @Value("${openrouter.model.2:google/gemini-2.0-flash-exp:free}")
    private String model2;
    
    @Value("${openrouter.max.tokens.2:8000}")
    private int maxTokens2;

    // Model 3 (Fallback)
    @Value("${openrouter.model.3:deepseek/deepseek-chat-v3-0324:free}")
    private String model3;
    
    @Value("${openrouter.max.tokens.3:4000}")
    private int maxTokens3;

    // Model 4 (Fallback)
    @Value("${openrouter.model.4:qwen/qwq-32b:free}")
    private String model4;
    
    @Value("${openrouter.max.tokens.4:6000}")
    private int maxTokens4;

    // Model 5 (Fallback)
    @Value("${openrouter.model.5:nvidia/llama-3.3-nemotron-super-49b-v1:free}")
    private String model5;
    
    @Value("${openrouter.max.tokens.5:4000}")
    private int maxTokens5;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public OpenRouterAIService() {
        this.webClient = WebClient.builder()
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Check if OpenRouter is configured.
     */
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.trim().isEmpty();
    }

    /**
     * Generate a response using multiple models with fallback
     */
    public String generateResponse(String prompt, User user, String category, Map<String, Object> businessContext) {
        if (!isAvailable()) {
            logger.warn("OpenRouter not configured – skipping OpenRouter call");
            return null;
        }

        // Try each model in order until one succeeds
        String[] models = {model1, model2, model3, model4, model5};
        int[] tokens = {maxTokens1, maxTokens2, maxTokens3, maxTokens4, maxTokens5};
        String[] modelNames = {"Cypher Alpha", "Gemini Flash", "DeepSeek Chat", "Qwen QwQ", "Llama Nemotron"};

        for (int i = 0; i < models.length; i++) {
            try {
                logger.info("Trying model {} ({})", i + 1, modelNames[i]);
                String response = tryModel(models[i], tokens[i], prompt, modelNames[i]);
                if (response != null && !response.trim().isEmpty()) {
                    logger.info("Successfully got response from model {} ({})", i + 1, modelNames[i]);
                    return response;
                }
            } catch (Exception e) {
                logger.warn("Model {} ({}) failed: {}", i + 1, modelNames[i], e.getMessage());
                // Continue to next model
            }
        }

        logger.error("All OpenRouter models failed");
        return null;
    }

    private String tryModel(String model, int maxTokens, String prompt, String modelName) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("max_tokens", maxTokens);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of(
                    "role", "system",
                    "content", "You are Pizza World business assistant powered by " + modelName + ". Answer concisely and helpfully with accurate business insights."));
            messages.add(Map.of("role", "user", "content", prompt));
            body.put("messages", messages);

            String response = webClient.post()
                    .uri(OPENROUTER_ENDPOINT)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30)) // Shorter timeout for faster fallback
                    .block();

            return extractAssistantMessage(response);
        } catch (WebClientResponseException e) {
            logger.error("OpenRouter HTTP error for {}: status={} body={}", modelName, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("HTTP error: " + e.getStatusCode());
        } catch (Exception e) {
            logger.error("Error calling OpenRouter with {}: {}", modelName, e.getMessage());
            throw new RuntimeException("Request failed: " + e.getMessage());
        }
    }

    private String extractAssistantMessage(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                JsonNode first = choices.get(0);
                String content = first.path("message").path("content").asText();
                return content.trim();
            }
            logger.warn("Unexpected response from OpenRouter: {}", raw);
        } catch (Exception e) {
            logger.error("Error parsing OpenRouter response: {}", e.getMessage(), e);
        }
        return null;
    }

    public Map<String, Object> getConfigInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("primaryModel", model1);
        info.put("fallbackModels", Arrays.asList(model2, model3, model4, model5));
        info.put("apiKeyConfigured", isAvailable());
        return info;
    }
} 