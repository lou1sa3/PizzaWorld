package pizzaworld.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class EmailConfig {

    @Value("${spring.mail.host}")
    private String host;

    @Value("${spring.mail.port}")
    private int port;

    @Value("${spring.mail.username}")
    private String username;

    @Value("${spring.mail.password}")
    private String password;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties props = mailSender.getJavaMailProperties();
        
        // Authentication
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.ssl.trust", host);
        
        // Performance optimizations for fast sending
        props.put("mail.smtp.connectiontimeout", "3000");  // 3 seconds
        props.put("mail.smtp.timeout", "2000");            // 2 seconds
        props.put("mail.smtp.writetimeout", "2000");       // 2 seconds
        
        // Connection pooling for speed
        props.put("mail.smtp.connectionpoolsize", "10");
        props.put("mail.smtp.connectionpooltimeout", "300000");
        
        // Fast delivery options
        props.put("mail.smtp.sendpartial", "true");
        props.put("mail.smtp.quitwait", "false");
        
        // Disable debugging for production speed
        props.put("mail.debug", "false");
        
        return mailSender;
    }
} 