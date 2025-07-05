package pizzaworld.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pizzaworld.service.EmailService;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api")
public class SupportController {
    
    private static final Logger logger = Logger.getLogger(SupportController.class.getName());
    
    @Autowired
    private EmailService emailService;
    
    public static class EmailRequest {
        public String to;
        public String from;
        public String senderName;
        public String subject;
        public String message;
    }
    
    @PostMapping("/send-support-email")
    public ResponseEntity<?> sendSupportEmail(@RequestBody EmailRequest emailRequest) {
        try {
            // Log the support request immediately
            logger.info("Support request from: " + emailRequest.senderName + " - " + emailRequest.subject);
            
            // Return immediate success response - don't wait for email processing
            ResponseEntity<?> response = ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Your message has been sent successfully! We'll get back to you soon."
            ));
            
            // Process email in background thread (fire-and-forget)
            new Thread(() -> {
                try {
                    emailService.sendSupportEmail(
                        emailRequest.from,
                        emailRequest.senderName,
                        emailRequest.subject,
                        emailRequest.message
                    );
                    logger.info("Background email sent for: " + emailRequest.senderName);
                } catch (Exception emailEx) {
                    logger.warning("Background email failed: " + emailEx.getMessage());
                }
            }).start();
            
            return response;
            
        } catch (Exception e) {
            logger.severe("Failed to process support request: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to process request. Please try again."
            ));
        }
    }

} 