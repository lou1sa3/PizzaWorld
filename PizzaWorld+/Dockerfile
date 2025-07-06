# Use an official OpenJDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

# Set the working directory in the container
WORKDIR /app

# Copy the Maven wrapper and the pom.xml file to download dependencies
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x ./mvnw

# Copy the rest of the application source code
COPY src ./src

# Build the application. -DskipTests skips running tests.
RUN ./mvnw clean package -DskipTests

# List the target directory to debug
RUN ls -la target/

# Find the actual JAR file name in case it's different
RUN find target/ -name "*.jar" -type f

# Expose port 8080 to the outside world
EXPOSE 8080

# Run the JAR file with a more flexible approach
CMD ["sh", "-c", "java -jar target/*.jar"] 