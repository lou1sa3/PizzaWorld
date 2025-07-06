package pizzaworld.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pizzaworld.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepo extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE upper(u.username) = upper(:username)")
    Optional<User> findByUsername(@Param("username") String username);

}
