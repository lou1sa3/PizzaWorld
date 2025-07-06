package pizzaworld.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pizzaworld.model.AIInsight;
import pizzaworld.model.ChatMessage;
import pizzaworld.model.CustomUserDetails;
import pizzaworld.model.User;
import pizzaworld.service.AIService;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Logger;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {
    
    private static final Logger logger = Logger.getLogger(AIController.class.getName());
    
    @Autowired
    private AIService aiService;
    
    /**
     * Chat endpoint for AI assistant
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestBody ChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        try {
            User user = userDetails.getUser();
            
            // Generate session ID if not provided
            String sessionId = request.sessionId != null ? request.sessionId : UUID.randomUUID().toString();
            
            // Process the message
            ChatMessage response = aiService.processChatMessage(sessionId, request.message, user);
            
            // Return response with session ID
            Map<String, Object> result = new HashMap<>();
            result.put("sessionId", sessionId);
            result.put("message", response);
            result.put("success", true);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.severe("Error in chat endpoint: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to process your message at this time."
            ));
        }
    }

    /**
     * Streaming chat endpoint (Server-Sent Events).
     * Accepts the same ChatRequest but returns a text/event-stream where each SSE data field
     * contains one whitespace-delimited token of the assistant’s answer.
     * This keeps implementation simple while giving the front-end incremental updates.
     */
    @PostMapping(path = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chatStream(
            @RequestBody ChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User user = userDetails.getUser();

        // Produce the assistant message (blocking call – could be made reactive later)
        ChatMessage aiMsg = aiService.processChatMessage(
                request.sessionId != null ? request.sessionId : UUID.randomUUID().toString(),
                request.message,
                user);

        String answer = aiMsg.getMessage();
        if (answer == null) answer = "";

        // Stream words every 40 ms for a smooth effect
        String[] tokens = answer.split("\\s+");

        return Flux.range(0, tokens.length)
                .delayElements(Duration.ofMillis(40))
                .map(i -> ServerSentEvent.builder(tokens[i]).event("message").build())
                .concatWith(Flux.just(ServerSentEvent.<String>builder()
                        .event("done").data("[DONE]").build()));
    }
    
    /**
     * Get chat history for a session
     */
    @GetMapping("/chat/history/{sessionId}")
    public ResponseEntity<?> getChatHistory(
            @PathVariable String sessionId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        try {
            List<ChatMessage> history = aiService.getChatHistory(sessionId);
            
            return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "messages", history,
                "success", true
            ));
            
        } catch (Exception e) {
            logger.severe("Error getting chat history: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to retrieve chat history."
            ));
        }
    }
    
    /**
     * Generate business insights
     */
    @GetMapping("/insights")
    public ResponseEntity<?> getInsights(@AuthenticationPrincipal CustomUserDetails userDetails) {
        
        try {
            User user = userDetails.getUser();
            List<AIInsight> insights = aiService.generateBusinessInsights(user);
            
            return ResponseEntity.ok(Map.of(
                "insights", insights,
                "success", true,
                "userRole", user.getRole()
            ));
            
        } catch (Exception e) {
            logger.severe("Error generating insights: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to generate insights at this time."
            ));
        }
    }
    
    /**
     * Analyze natural language query
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeQuery(
            @RequestBody AnalyzeRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        try {
            User user = userDetails.getUser();
            Map<String, Object> analysis = aiService.analyzeQuery(request.query, user);
            
            analysis.put("success", true);
            analysis.put("query", request.query);
            
            return ResponseEntity.ok(analysis);
            
        } catch (Exception e) {
            logger.severe("Error analyzing query: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to analyze your query at this time."
            ));
        }
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "AI Service",
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    /**
     * Public endpoint to check Google AI configuration (no auth required)
     */
    @GetMapping("/config")
    public ResponseEntity<?> getPublicConfig() {
        try {
            Map<String, Object> config = aiService.getAIStatus();
            
            // Remove sensitive information but keep configuration status
            Map<String, Object> publicConfig = new HashMap<>();
            publicConfig.put("gemma_available", config.get("gemma_available"));
            publicConfig.put("fallback_enabled", config.get("fallback_enabled"));
            
            @SuppressWarnings("unchecked")
            Map<String, Object> gemmaConfig = (Map<String, Object>) config.get("gemma_config");
            if (gemmaConfig != null) {
                Map<String, Object> publicGemmaConfig = new HashMap<>();
                publicGemmaConfig.put("model", gemmaConfig.get("model"));
                publicGemmaConfig.put("apiKeyConfigured", gemmaConfig.get("apiKeyConfigured"));
                publicGemmaConfig.put("endpoint", gemmaConfig.get("endpoint"));
                publicConfig.put("gemma_config", publicGemmaConfig);
            }
            
            return ResponseEntity.ok(publicConfig);
        } catch (Exception e) {
            logger.severe("Error getting public AI config: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Unable to retrieve AI configuration."
            ));
        }
    }
    
    /**
     * Get AI service status and configuration
     */
    @GetMapping("/status")
    public ResponseEntity<?> getAIStatus(@AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            Map<String, Object> status = aiService.getAIStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            logger.severe("Error getting AI status: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to retrieve AI status."
            ));
        }
    }
    
    /**
     * Test Google AI connection with a simple message
     */
    @PostMapping("/test")
    public ResponseEntity<?> testGoogleAI(@AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            User user = userDetails.getUser();
            
            // Send a test message to verify AI is working
            ChatMessage testResponse = aiService.processChatMessage(
                "test_session_" + System.currentTimeMillis(),
                "Hello, can you tell me you're powered by Google Gemma AI?",
                user
            );
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("response", testResponse.getMessage());
            result.put("isAIWorking", testResponse.getMessage() != null && 
                      testResponse.getMessage().toLowerCase().contains("gemma"));
            result.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.severe("Error testing Google AI: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Unable to test AI connection: " + e.getMessage()
            ));
        }
    }
    
    // Request DTOs
    public static class ChatRequest {
        public String sessionId;
        public String message;
        public String context; // optional context for better responses
    }
    
    public static class AnalyzeRequest {
        public String query;
        public String context; // optional context
        public String type; // optional query type hint
    }
} 