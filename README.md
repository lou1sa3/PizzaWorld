# PizzaWorld+ Dashboard

A comprehensive business intelligence dashboard system for PizzaWorld with Spring Boot backend and Angular frontend.

**Developed for the Programming Lab module in the Business Information Systems bachelor's program.**

Contact: pizzaworldplus@proton.me

## Local Setup for Evaluation

### System Requirements
- Java 17 or higher (OpenJDK or Oracle JDK)
- Node.js 16 or higher 
- npm 8 or higher (included with Node.js)
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Operating System: Windows 10+, macOS 10.15+, or Linux

Note: PostgreSQL installation is not required - the application uses a pre-configured cloud database.

**Security Implementation**: This application demonstrates production-grade security practices:
- No hardcoded credentials in source code
- All sensitive data loaded from environment variables
- Application will not start without proper security configuration
- Start scripts (`start.sh` / `start.bat`) handle secure environment setup

**Important**: Always use the provided start scripts. Direct execution with `mvn spring-boot:run` will fail due to missing environment variables.

### Installation and Startup

The application requires environment variables for security. Use the provided start scripts that handle this automatically.

#### Windows Instructions

**Step 1: Start Backend (Terminal 1)**
```bash
cd PizzaWorld+
start.bat
```

**Step 2: Start Frontend (Terminal 2)**
```bash
cd PizzaWorld+/frontend
npm install    # Only needed first time
npm start
```

#### macOS/Linux Instructions

**Step 1: Start Backend (Terminal 1)**
```bash
cd PizzaWorld+
./start.sh
```

**Step 2: Start Frontend (Terminal 2)**
```bash
cd PizzaWorld+/frontend
npm install    # Only needed first time
npm start
```

**Note**: The start scripts (start.bat/start.sh) automatically set all required environment variables and start the backend. Without these scripts, the application will not start due to missing security configuration.

### Login Credentials

The application automatically creates test users:

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `test` | `test` | `HQ_ADMIN` | Full access to all features |

### Accessing the Application

After startup, services are available at:
- Frontend: http://localhost:4200
- Backend API: http://localhost:8080
- Login: Use `test/test` for immediate access

### Quick Start for Instructors

**Windows (PowerShell/CMD):**
```bash
# Clone and setup
git clone <repository-url>
cd PizzaWorld+

# Terminal 1: Backend
start.bat

# Terminal 2: Frontend
cd frontend
npm install
npm start
```

**macOS/Linux (Terminal):**
```bash
# Clone and setup
git clone <repository-url>
cd PizzaWorld+

# Terminal 1: Backend
./start.sh

# Terminal 2: Frontend
cd frontend
npm install
npm start
```

**Access the application:**
- URL: http://localhost:4200
- Login: `test` / `test`

## Project Structure

```
PizzaWorld+/
├── src/main/java/pizzaworld/          # Spring Boot Backend
│   ├── controller/                    # REST API Controllers
│   ├── service/                       # Business Logic
│   ├── model/                         # Data Models
│   ├── repository/                    # Database Access
│   ├── security/                      # JWT Authentication
│   └── util/                          # Utility Functions
├── src/main/resources/
│   └── application.properties         # Configuration
├── frontend/                          # Angular Frontend
│   ├── src/app/
│   │   ├── pages/                     # Pages (Dashboard, Orders, etc.)
│   │   ├── core/                      # Services and Guards
│   │   └── shared/                    # Reusable Components
│   └── package.json
├── start.sh                          # Required start script for macOS/Linux
├── start.bat                         # Required start script for Windows
└── README.md                         # This file
```

## Features

### Backend (Spring Boot)
- RESTful API with role-based authentication (JWT)
- Spring Security with custom authentication filter
- PostgreSQL integration with optimized queries
- Materialized views for performance-critical analytics
- CSV export functionality for all data reports
- Global exception handling
- Caching for frequently accessed data
- Input validation and SQL injection protection

### Frontend (Angular)
- Responsive design with Tailwind CSS
- Interactive dashboards with ApexCharts
- Role-based navigation and route guards
- Real-time data updates via HTTP polling
- Progressive Web App capabilities
- Accessibility standards compliance (WCAG 2.1)
- TypeScript for type safety
- Component-based architecture

### User Roles & Permission Matrix
| Role | Dashboard | Orders | Analytics | Stores | Products | Export |
|------|-----------|--------|-----------|---------|----------|---------|
| **HQ_ADMIN** | All data | All stores | Full access | All states | All products | All reports |
| **STATE_MANAGER** | State data | State stores | State analytics | Own state | State products | State reports |
| **STORE_MANAGER** | Own store | Own store | Store analytics | Own store only | Store products | Store reports |

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/me` - Current user information
- `POST /api/logout` - User logout

### Dashboard
- `GET /api/dashboard-kpis` - Main KPIs
- `GET /api/recent-orders` - Recent orders

### Orders
- `GET /api/orders` - Filtered orders
- `GET /api/orders/export` - CSV export

### Analytics
- `GET /api/analytics/customer-lifetime-value` - Customer lifetime value
- `GET /api/analytics/customer-retention` - Customer retention analysis

## Configuration

### Security Configuration

This application implements production-grade security by requiring all sensitive configuration through environment variables:

**Required Environment Variables:**
- `DB_URL`: Database connection URL (no default - must be provided)
- `DB_USERNAME`: Database username (no default - must be provided)
- `DB_PASSWORD`: Database password (no default - must be provided)
- `JWT_SECRET`: JWT secret key for token signing (no default - must be provided)

**How it works:**
1. The application **will not start** without these environment variables
2. The provided start scripts (`start.sh` / `start.bat`) set these variables securely
3. In production, these would come from secure secret management systems

**Security Benefits:**
- Zero hardcoded credentials in the codebase
- Clear separation of code and configuration
- Demonstrates understanding of production security practices
- Easy to audit and rotate credentials

### Database Access
The application connects to a PostgreSQL cloud database. All connection details are managed through environment variables, demonstrating proper security practices for production applications.

## Technology Stack

### Backend
- Spring Boot 3.4.6
- Spring Security (JWT)
- Spring Data JPA
- PostgreSQL
- Maven

### Frontend
- Angular 19
- TypeScript
- RxJS
- ApexCharts
- PrimeNG
- Tailwind CSS

## Development

### Backend development
```bash
./mvnw spring-boot:run
```

### Frontend development
```bash
cd frontend
npm start
```

### Running tests
```bash
./mvnw test
```

## Troubleshooting

### Common Issues

#### Backend won't start
- Make sure you're using `start.bat` (Windows) or `./start.sh` (macOS/Linux)
- Do NOT use `mvn spring-boot:run` directly - it will fail without environment variables
- Check that Java 17+ is installed: `java -version`

#### Port already in use
```bash
# If port 4200 is occupied:
cd frontend
npm start
# Select 'Y' for alternative port

# If port 8080 is occupied:
# Stop other Java applications or change port in application.properties
```

#### Permission denied on macOS/Linux
```bash
chmod +x start.sh
./start.sh
```

#### Maven download issues
```bash
# Clear cache and retry:
./mvnw clean
rm -rf ~/.m2/repository/org/springframework
./mvnw spring-boot:run
```

#### npm install errors
```bash
# Reset node modules:
rm -rf node_modules package-lock.json
npm install
```

#### Database connection errors
- The application uses a cloud database
- Internet connection required
- Fallback configuration available in `application.properties`

### Logging and Debugging
- Backend logs: Console output from Spring Boot
- Frontend logs: Browser Developer Tools (F12)
- Network monitoring: Browser Network tab for API calls

## Demo Data

The application includes comprehensive demo data:
- 4 states (Arizona, California, Nevada, Utah)
- 50+ pizza stores with realistic locations
- 100,000+ orders spanning 3 years (2022-2024)
- Millions of data points for meaningful analytics

## Technical Implementation

### Architecture Principles
- Clean architecture with clear layer separation
- Dependency injection for loose coupling
- Repository pattern for data access
- DTO pattern for API communication
- Component-based frontend architecture

### Performance Optimizations
- Materialized views for complex aggregations
- Connection pooling (HikariCP) for database
- Lazy loading for large datasets
- Caching for frequent queries
- Chart virtualization for large datasets

### Security Features
- JWT authentication with refresh tokens
- CORS configuration
- SQL injection prevention
- XSS protection in frontend
- Input validation at all levels

## Additional Resources

### API Documentation
- Self-documenting endpoints
- Consistent error responses
- Standardized HTTP status codes

### Code Quality
- TypeScript for frontend type safety
- Java 17 features and best practices
- Responsive design for all screen sizes
- Accessibility standards compliance

---

## Academic Context

This application was developed as part of the Programming Lab module in the Business Information Systems bachelor's program. It demonstrates practical implementation of:

- Full-stack development with modern frameworks
- Enterprise architecture with security and performance considerations
- Responsive UI/UX with professional design patterns
- Database design with complex relationships
- RESTful API design principles
- Clean code organization and structure
- Production-ready deployment preparation

The project showcases comprehensive knowledge of modern web technologies and software development best practices. 
