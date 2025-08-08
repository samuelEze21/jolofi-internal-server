# Jolofi Internal Gaming Server

A NestJS-based internal gaming server API with authentication, wallet management, and comprehensive documentation.

## Features

- 🔐 **Authentication System** - Phone/Email registration with OTP verification
- 💰 **Wallet Integration** - SUI blockchain wallet generation and management
- 📚 **API Documentation** - Interactive Swagger/OpenAPI documentation
- 🛡️ **Security** - JWT authentication, rate limiting, and token blacklisting
- 🔥 **Firebase Integration** - SMS and email verification services
- ⚡ **Real-time Features** - WebSocket support for live interactions

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Firebase project (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samueleze21/jolofi-internal-gaming-server.git
   cd jolofi-internal-gaming-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   Fill in the required environment variables:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=7d
   SUI_RPC=your_sui_rpc_endpoint
   FIREBASE_PROJECT_ID=your_firebase_project_id
   # Add other Firebase config variables
   ```

4. **Start the development server**
   ```bash
   npm run start:dev
   ```

## API Documentation

Once the server is running, you can access the interactive API documentation:

- **Swagger UI**: [http://localhost:3003/api/docs](http://localhost:3003/api/docs)
- **OpenAPI JSON**: [http://localhost:3003/api/docs-json](http://localhost:3003/api/docs-json)

The API documentation includes:
- Complete endpoint descriptions
- Request/response schemas
- Authentication requirements
- Interactive testing interface
- Example requests and responses

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register with email or phone | ❌ |
| POST | `/auth/verify` | Verify OTP code | ❌ |
| POST | `/auth/login` | Login with credentials | ❌ |
| POST | `/auth/complete-profile` | Complete user profile | ✅ |
| POST | `/auth/logout` | Logout and blacklist token | ✅ |

### Authentication Flow

1. **Register** - Submit email or phone number
2. **Verify** - Enter OTP code received via SMS/email
3. **Complete Profile** - Set username and password
4. **Login** - Authenticate with credentials

## Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build the application
npm run start:prod         # Start production server

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier
```

### Project Structure

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
