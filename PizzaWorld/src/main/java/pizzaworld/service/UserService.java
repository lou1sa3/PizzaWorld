package pizzaworld.service;

import org.springframework.stereotype.Service;
import pizzaworld.model.User;
import pizzaworld.repository.UserRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class UserService {

    private final UserRepo repo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserService(UserRepo repo) {
        this.repo = repo;
    }

    public User save(User u) {
        if (!u.getPassword().startsWith("$2a$")) {
            u.setPassword(passwordEncoder.encode(u.getPassword()));
        }
        return repo.save(u);
    }

    public User find(String username) {
        return repo.findByUsername(username).orElse(null);
    }
}
