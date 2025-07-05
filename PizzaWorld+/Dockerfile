# Use an official OpenJDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

# Set the working directory in the container
WORKDIR /app

# Copy the Maven wrapper and the pom.xml file to download dependencies
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Copy the rest of the application source code
COPY src ./src

# Build the application. -DskipTests skips running tests.
RUN ./mvnw clean package -DskipTests

# Expose port 8080 to the outside world
EXPOSE 8080

# Run the JAR file
CMD ["java", "-jar", "target/demo-0.0.1-SNAPSHOT.jar"] 