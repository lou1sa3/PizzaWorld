# PizzaWorld Dashboard

Official Homepage: https://www.pizzaworldplus.tech/

A comprehensive business intelligence dashboard system for PizzaWorld with Spring Boot backend and Angular frontend.

**Developed for the Programming Lab module in the Business Information Systems bachelor's program.**

Contact: pizzaworldplus@gmail.com

## ► Local Setup for Evaluation

### System Requirements
- Java 17 or higher (OpenJDK or Oracle JDK)
- Node.js 18 or higher 
- npm 9 or higher (included with Node.js)
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Operating System: Windows 10+, macOS 10.15+, or Linux

Note: PostgreSQL installation is not required - the application uses a pre-configured cloud database.

### Security Implementation

This application demonstrates production-grade security practices:
- No hardcoded credentials in source code
- All sensitive data loaded from environment variables
- Application will not start without proper security configuration
- Start scripts (`start.sh` / `start.bat`) handle secure environment setup
- JWT-based authentication with role-based access control
- BCrypt password hashing for secure credential storage

**Important**: Always use the provided start scripts. Direct execution will fail due to missing environment variables.

## ■ Installation and Startup

The application uses a unified startup approach with automatic environment configuration.

### Windows Instructions

```bash
# Clone the repository
git clone <repository-url>
cd PizzaWorld+

# Start both Backend and Frontend
./start.bat
```

The script automatically:
- Sets all required environment variables
- Starts the Spring Boot backend (port 8080)
- Starts the Angular frontend (port 4200)
- Opens http://localhost:4200 in your default browser

### macOS/Linux Instructions

```bash
# Clone the repository
git clone <repository-url>
cd PizzaWorld+

# Make script executable (first time only)
chmod +x start.sh

# Start both Backend and Frontend
./start.sh
```

### Manual Installation (if needed)

If you prefer manual setup or encounter issues:

```bash
# Backend setup
cd PizzaWorld+
./mvnw clean install

# Frontend setup
cd PizzaWorld+/frontend
npm install


# Start services
# Terminal 1: Backend
./mvnw spring-boot:run

# Terminal 2: Frontend
cd frontend
npm start
```



## ◆ Project Structure

```
PizzaWorld+/
├── src/main/java/pizzaworld/          # Spring Boot Backend
│   ├── controller/                    # REST API Controllers
│   │   ├── AuthController.java        # Authentication endpoints
│   │   ├── OptimizedPizzaController.java # Main business endpoints
│   │   └── SupportController.java     # Support ticket system
│   ├── service/                       # Business Logic Layer
│   │   ├── OptimizedPizzaService.java # Core business operations
│   │   ├── UserService.java           # User management
│   │   └── EmailService.java          # Email notifications
│   ├── model/                         # Data Models
│   │   ├── User.java                  # User entity
│   │   └── CustomUserDetails.java     # Spring Security integration
│   ├── repository/                    # Database Access Layer
│   │   ├── OptimizedPizzaRepo.java    # Native SQL queries
│   │   └── UserRepo.java              # User data access
│   ├── security/                      # Security Configuration
│   │   └── JwtAuthFilter.java         # JWT authentication filter
│   ├── dto/                           # Data Transfer Objects
│   └── util/                          # Utility Classes
│       ├── JwtUtil.java               # JWT token operations
│       └── CsvExportUtil.java         # CSV export functionality
├── src/main/resources/
│   └── application.properties         # Spring configuration
├── frontend/                          # Angular Frontend
│   ├── src/app/
│   │   ├── pages/                     # Feature Pages
│   │   │   ├── dashboard/             # Main dashboard with KPIs
│   │   │   ├── orders/                # Order management
│   │   │   ├── products/              # Product catalog
│   │   │   ├── stores/                # Store management
│   │   │   ├── sales/                 # Sales analytics
│   │   │   ├── customer-analytics/    # Customer insights
│   │   │   ├── delivery-metrics/      # Delivery performance
│   │   │   └── login/                 # Authentication
│   │   ├── core/                      # Core Services
│   │   │   ├── auth.service.ts        # Authentication service
│   │   │   ├── kpi.service.ts         # KPI data management
│   │   │   └── auth.guard.ts          # Route protection
│   │   └── shared/                    # Reusable Components
│   ├── angular.json                   # Angular configuration
│   ├── proxy.conf.json                # API proxy configuration
│   └── package.json                   # Frontend dependencies
├── start.sh                           # Unix startup script
├── start.bat                          # Windows startup script
├── pom.xml                            # Maven configuration
└── README.md                          # This file
```

## ▪ Features

### Backend (Spring Boot)
- **RESTful API** with comprehensive endpoint coverage
- **JWT Authentication** with role-based access control (RBAC)
- **Spring Security** with custom authentication filter
- **PostgreSQL Integration** with optimized native queries
- **Performance Optimization** through materialized views
- **CSV Export** for all data tables
- **Global Exception Handling** with meaningful error messages
- **Request Caching** for frequently accessed data
- **Input Validation** and SQL injection protection
- **CORS Configuration** for frontend integration

### Frontend (Angular 19)
- **Responsive Design** with Tailwind CSS
- **Interactive Dashboards** with ApexCharts visualizations
- **Real-time Updates** via efficient HTTP polling
- **Role-based UI** with dynamic navigation
- **Progressive Web App** capabilities
- **Accessibility Compliance** (WCAG 2.1)
- **TypeScript** for type safety
- **Component Architecture** with lazy loading
- **State Management** with RxJS
- **Form Validation** with reactive forms

### Security Features
- **Environment Variables** for all sensitive configuration
- **JWT Tokens** with 24-hour expiration
- **BCrypt Hashing** for password storage
- **Role-based Access Control** at API and UI levels
- **HTTPS Ready** configuration
- **XSS Protection** in frontend
- **CSRF Protection** disabled for API usage
- **SQL Injection Prevention** through parameterized queries

## ● User Roles & Permission Matrix

| Role | Dashboard | Orders | Products | Stores | Analytics | Export | Admin |
|------|-----------|--------|----------|---------|-----------|---------|--------|
| **HQ_ADMIN** | ✓ All data | ✓ All stores | ✓ Full CRUD | ✓ All states | ✓ Full access | ✓ All reports | ✓ User mgmt |
| **STATE_MANAGER** | ✓ State data | ✓ State stores | ✓ View/Edit | ✓ Own state | ✓ State analytics | ✓ State reports | ✗ |
| **STORE_MANAGER** | ✓ Store data | ✓ Own store | ✓ View only | ✓ Own store | ✓ Store analytics | ✓ Store reports | ✗ |

## ◈ API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `GET /api/me` - Current user information
- `POST /api/logout` - Session termination

### Dashboard & Analytics
- `GET /api/dashboard-kpis` - Main KPI metrics
- `GET /api/recent-orders` - Recent order list
- `GET /api/kpi/revenue-trend` - Revenue analytics
- `GET /api/kpi/orders-per-day` - Order frequency
- `GET /api/analytics/customer-lifetime-value` - CLV analysis
- `GET /api/analytics/customer-retention` - Retention metrics

### Business Operations
- `GET /api/orders` - Order management
- `GET /api/products` - Product catalog
- `GET /api/stores` - Store directory
- `GET /api/sales` - Sales data
- `POST /api/support/contact` - Support tickets

### Data Export
- `GET /api/orders/export` - Orders CSV
- `GET /api/products/export` - Products CSV
- `GET /api/stores/export` - Stores CSV

## ◐ Technology Stack

### Backend
- **Spring Boot 3.4.0** - Application framework
- **Spring Security 6** - Authentication & authorization
- **Spring Data JPA** - ORM layer
- **PostgreSQL** - Primary database
- **HikariCP** - Connection pooling
- **Maven** - Build automation
- **Java 17** - Runtime environment

### Frontend
- **Angular 19** - SPA framework
- **TypeScript 5.7** - Type-safe JavaScript
- **RxJS 7.8** - Reactive programming
- **Tailwind CSS 3.4** - Utility-first CSS
- **PrimeNG 19** - UI component library
- **ApexCharts 3.41** - Data visualization
- **Webpack** - Module bundling

## ■ Configuration

### Environment Variables

The application requires the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_URL` | PostgreSQL connection URL | Yes |
| `DB_USERNAME` | Database username | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |

### Database Configuration

The application uses a cloud-hosted PostgreSQL database with:
- Connection pooling (20 max connections)
- SSL/TLS encryption
- Automatic reconnection handling
- Query optimization through indexes
- Materialized views for analytics

## ▸ Development

### Backend Development
```bash
# Run in development mode
./mvnw spring-boot:run

# Run tests
./mvnw test

# Build JAR
./mvnw clean package

# Skip tests during build
./mvnw clean package -DskipTests
```

### Frontend Development
```bash
# Development server with hot reload
ng serve

# Production build
ng build --configuration production

# Run unit tests
ng test

# Run linting
ng lint

# Generate component
ng generate component component-name
```

## ◉ Troubleshooting

### Common Issues

**Backend won't start**
- Ensure using start scripts (`start.bat` / `start.sh`)
- Verify Java 17+ installed: `java -version`
- Check environment variables are set

**Frontend compilation errors**
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall dependencies: `npm install`
- Check Node.js version: `node -v` (should be 18+)

**Database connection issues**
- Verify internet connection (cloud database)
- Check firewall settings
- Ensure environment variables are correct

**Port conflicts**
- Frontend (4200): `ng serve --port 4201`
- Backend (8080): Edit `application.properties`

## ▲ Demo Data

The application includes comprehensive demo data:
- **4 US States**: Arizona, California, Nevada, Utah
- **52 Stores**: Distributed across states
- **100,000+ Orders**: 3 years of historical data (2021-2023
- **25 Products**: Various pizza types and sizes
- **Performance Metrics**: Pre-calculated analytics

## ◆ Academic Context

This application was developed as part of the Programming Lab module in the Business Information Systems bachelor's program. It demonstrates practical implementation of:

### Software Engineering
- Clean architecture with separation of concerns
- Design patterns (Repository, DTO, Factory)
- SOLID principles application
- Comprehensive error handling
- Code documentation and comments

### Full-Stack Development
- RESTful API design and implementation
- Single Page Application architecture
- Responsive web design principles
- State management patterns
- Asynchronous programming

### Security & Performance
- Authentication and authorization
- Secure credential management
- Database query optimization
- Caching strategies
- Load time optimization

### Professional Practices
- Version control with Git
- Build automation
- Testing strategies
- Documentation
- Deployment preparation

---

**© 2025 PizzaWorld Dashboard - Academic Project** 
