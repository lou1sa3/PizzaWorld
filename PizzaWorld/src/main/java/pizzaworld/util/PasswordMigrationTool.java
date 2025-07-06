package pizzaworld.util;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import pizzaworld.repository.UserRepo;

@Component  // Re-enabled for security
public class PasswordMigrationTool implements CommandLineRunner {

    private final UserRepo repo;

    public PasswordMigrationTool(UserRepo repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        var encoder = new BCryptPasswordEncoder();

        repo.findAll().forEach(user -> {
            String pw = user.getPassword();

            if (!pw.startsWith("$2a$")) {  // Nur wenn noch nicht verschlüsselt
                String hashed = encoder.encode(pw);
                user.setPassword(hashed);
                repo.save(user);
                System.out.println("Updated password for: " + user.getUsername());
            }
        });
    }
}
