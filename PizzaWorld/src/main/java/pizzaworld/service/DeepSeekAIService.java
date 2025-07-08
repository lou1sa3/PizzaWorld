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

@Service
public class DeepSeekAIService {

    private static final Logger logger = LoggerFactory.getLogger(DeepSeekAIService.class);

    private static final String OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

    @Value("${openrouter.api.key:}")
    private String apiKey;

    @Value("${openrouter.model:deepseek/deepseek-r1-0528:free}")
    private String model;

    @Value("${openrouter.enabled:true}")
    private boolean enabled;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public DeepSeekAIService() {
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
     * Generate a response using the DeepSeek model via OpenRouter
     */
    public String generateResponse(String prompt, User user, String category, Map<String, Object> businessContext) {
        if (!isAvailable()) {
            logger.warn("OpenRouter not configured – skipping DeepSeek call");
            return null;
        }

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);

            List<Map<String, String>> messages = new ArrayList<>();
            // Simple system message – could be enhanced similar to Gemma prompt
            messages.add(Map.of(
                    "role", "system",
                    "content", "You are Pizza World business assistant. Answer concisely and helpfully."));
            messages.add(Map.of("role", "user", "content", prompt));
            body.put("messages", messages);

            String response = webClient.post()
                    .uri(OPENROUTER_ENDPOINT)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(120)) // 2-minute timeout
                    .block();

            return extractAssistantMessage(response);
        } catch (WebClientResponseException e) {
            logger.error("OpenRouter HTTP error: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            logger.error("Error calling OpenRouter: {}", e.getMessage(), e);
            return null;
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
        info.put("model", model);
        info.put("apiKeyConfigured", isAvailable());
        return info;
    }
} 