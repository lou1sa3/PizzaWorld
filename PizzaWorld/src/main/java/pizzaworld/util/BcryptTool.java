package pizzaworld.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptTool {
    public static void main(String[] args) {
        System.out.println("store:   " + new BCryptPasswordEncoder().encode("store"));
        System.out.println("state:   " + new BCryptPasswordEncoder().encode("state"));
        System.out.println("hq:   " + new BCryptPasswordEncoder().encode("hq"));

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

// Beispiel: Test für state_1
String input = "store";
String hashFromDB = "$2a$10$Et/HYIS9vFi1JavUCIRaFeRHEnhYENYHjBq6FaFpRGXaNNE3yYt7a";

System.out.println(encoder.matches(input, hashFromDB));  // true → wenn korrekt

    }
}

