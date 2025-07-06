package pizzaworld.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.util.logging.Logger;

@Service
public class EmailService {
    
    private static final Logger logger = Logger.getLogger(EmailService.class.getName());
    
    @Autowired(required = false)
    private JavaMailSender mailSender;
    
    @Value("${spring.mail.username:pizzaworldplus@gmail.com}")
    private String systemEmailAddress;
    
    public boolean sendEmail(String to, String from, String subject, String text) {
        try {
            if (mailSender == null) {
                logger.warning("JavaMailSender not configured. Email will not be sent.");
                logger.info("Email that would have been sent:");
                logger.info("To: " + to);
                logger.info("From: " + from);
                logger.info("Subject: " + subject);
                logger.info("Body: " + text);
                return false;
            }
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            // Use system email address as the sender for authentication
            message.setFrom(systemEmailAddress);
            message.setReplyTo(from); // Set reply-to as the customer's email
            message.setSubject(subject);
            message.setText(text);
            
            // Add Gmail label header for automatic labeling
            // This works with Gmail's automatic filtering based on headers
            
            mailSender.send(message);
            logger.info("Email sent successfully to: " + to);
            return true;
            
        } catch (Exception e) {
            logger.severe("Failed to send email: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    public boolean sendSupportEmail(String customerEmail, String customerName, String subject, String message) {
        try {
            // Minimal logging for speed
            logger.info("Processing: " + customerName);
            
            // Simple email body format
            String emailBody = String.format(
                "Support Request - Pizza World Dashboard\n\n" +
                "From: %s <%s>\n" +
                "Subject: %s\n\n" +
                "%s",
                customerName, customerEmail, subject, message
            );
            
            // Direct fast send
            boolean result = sendEmail(
                "pizzaworldplus@gmail.com", 
                customerEmail, 
                "Pizza World Support: " + subject, 
                emailBody
            );
            
            // Minimal result logging
            if (!result) logger.warning("Email failed: " + customerName);
            return result;
            
        } catch (Exception e) {
            logger.warning("Error: " + e.getMessage());
            return false;
        }
    }
    

} 