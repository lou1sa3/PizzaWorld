package pizzaworld.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    @Column(name = "store_id")
    private String storeId;

    @Column(name = "state_abbr")
    private String stateAbbr;

    public User() {}

    public User(Long id, String username, String password, String role, String storeId, String stateAbbr) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
        this.storeId = storeId;
        this.stateAbbr = stateAbbr;
    }

    // Getter
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getRole() { return role; }
    public String getStoreId() { return storeId; }
    public String getStateAbbr() { return stateAbbr; }

    // Setter
    public void setUsername(String u) { this.username = u; }
    public void setPassword(String p) { this.password = p; }
    public void setRole(String r) { this.role = r; }
    public void setStoreId(String s) { this.storeId = s; }
    public void setStateAbbr(String a) { this.stateAbbr = a; }

    // Rollenprüfung
    public boolean isHQ() { return "HQ_ADMIN".equals(role); }
    public boolean isStateManager() { return "STATE_MANAGER".equals(role); }
    public boolean isStoreManager() { return "STORE_MANAGER".equals(role); }
}
