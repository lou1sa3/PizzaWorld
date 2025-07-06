package pizzaworld.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pizzaworld.model.User;
import pizzaworld.service.UserService;
import pizzaworld.util.JwtUtil;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    /* ---------- DTO ---------- */
    public record LoginRequest(String username, String password) {}

    private final AuthenticationManager authManager;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthenticationManager authManager, UserService userService, JwtUtil jwtUtil) {
        this.authManager = authManager;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    /* ---------- 1. Login mit Session + JWT ---------- */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest request) {

        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );

        // Session für Web-Kompatibilität
        SecurityContextHolder.getContext().setAuthentication(auth);
        request.getSession(true).setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        // Nutzer + Rolle ermitteln
        User u = userService.find(auth.getName());
        String role = u.getRole();

        // JWT erzeugen
        String token = jwtUtil.generateToken(u.getUsername(), role);

        // Antwort mit JWT
        return ResponseEntity.ok(Map.of(
                "message", "Login success",
                "username", u.getUsername(),
                "role", role,
                "token", token
        ));
    }

    /* ---------- 2. Aktuell eingeloggter Benutzer ---------- */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetails springUser) {
        if (springUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not logged in"));
        }
        User u = userService.find(springUser.getUsername());
        if (u == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not in DB"));
        }
        Map<String, Object> body = new HashMap<>();
        body.put("username", u.getUsername());
        body.put("role", u.getRole());
        body.put("storeId", u.getStoreId());
        body.put("stateAbbr", u.getStateAbbr());
        return ResponseEntity.ok(body);
    }

    /* ---------- 3. Logout ---------- */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest req) {
        req.getSession().invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    /* ---------- 4. Create Test User ---------- */
    @PostMapping("/create-test-user")
    public ResponseEntity<?> createTestUser() {
        try {
            // Check if user already exists
            User existingUser = userService.find("test");
            if (existingUser != null) {
                // Update password for existing user
                existingUser.setPassword("test");
                userService.save(existingUser);
                return ResponseEntity.ok(Map.of("message", "Test user password updated", "username", "test", "password", "test"));
            }
            
            User testUser = new User();
            testUser.setUsername("test");
            testUser.setPassword("test");
            testUser.setRole("HQ_ADMIN");
            testUser.setStoreId("HQ");
            testUser.setStateAbbr("ALL");
            
            userService.save(testUser);
            
            return ResponseEntity.ok(Map.of("message", "Test user created", "username", "test", "password", "test"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to create test user: " + e.getMessage()));
        }
    }
}
