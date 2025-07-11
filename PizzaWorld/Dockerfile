# Use an official OpenJDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

# Set the working directory in the container
WORKDIR /app

# Copy only backend-specific files
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x ./mvnw

# Download dependencies first (for better Docker layer caching)
RUN ./mvnw dependency:go-offline

# Copy only the backend source code (exclude frontend directory)
COPY src ./src

# Build the application. -DskipTests skips running tests.
RUN ./mvnw clean package -DskipTests

# Expose port 8080 to the outside world
EXPOSE 8080

# Run the JAR file optimized for 2GB container
CMD ["sh", "-c", "java -Xmx1400m -Xms512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseStringDeduplication -jar target/*.jar"] 