# TAC Broker - Master Plan

## 1. App Overview and Objectives

### Purpose
To create a power selling tool for Gunbroker that enhances seller capabilities beyond the native platform, with future expansion to other marketplaces and integration with shipping and compliance services.

### Core Value Proposition
- **For Sellers**: Improved listing management, business analytics, and operational tools
- **Future Expansion**: Integration with ShipStation for shipping, Fastbound for compliance, and other marketplaces

### Business Model
- Subscription tiers using Stripe for payment processing
- Basic functionality available to all users
- Premium features and integrations reserved for higher subscription tiers

## 2. Target Audience

### Primary Audience
- **Gunbroker Sellers**: Users who actively sell firearms and related items on the Gunbroker platform
- **Power Users**: Sellers with higher volume who need better tools to manage their listings and sales

## 3. Core Features and Functionality

### MVP (Initial Phase)
1. **User Authentication**
   - Sign up/login using Supabase authentication
   - Secure storage of user data
   - Connection wizard for Gunbroker account linking

2. **Gunbroker API Integration**
   - Access token authentication
   - Retrieve active listings
   - Retrieve sold listings
   - Search functionality
   - Create new listings (basic implementation)

3. **Dashboard**
   - Basic seller metrics
   - Quick action buttons
   - Sidebar navigation for essential features
   - Overview of active and recently sold listings

4. **Subscription Infrastructure**
   - Basic Stripe integration setup
   - Preparation for future subscription tiers

### Future Phases
1. **Advanced Seller Tools**
   - Bulk listing management
   - Template creation
   - Automated listing features
   - Enhanced analytics

2. **Third-Party Integrations**
   - ShipStation for shipping label generation and tracking
   - Fastbound for compliance management
   - Additional marketplaces (eBay, etc.)

3. **Enhanced Features**
   - Inventory management
   - Customer management
   - Advanced reporting
   - Mobile applications

## 4. Technical Stack

### Frontend
- **Framework**: Next.js 15.x (latest stable version) for server-side rendering and API routes
- **Language**: TypeScript 5.x for better type safety and development experience
- **UI Components**: Shadcn UI with Tailwind CSS 3.x for modern, customizable interface
- **State Management**: React Context API or Zustand 4.x for state management
- **Data Fetching**: React Query 5.x (TanStack Query) for efficient API data fetching and caching

### Backend
- **Database & Authentication**: Supabase 2.x (latest) for user management, secure storage, and authentication
- **API Implementation**: Next.js API routes for server-side Gunbroker API calls
- **Payment Processing**: Stripe API v2023-10-16 or later for subscription management
- **Environment Variables**: Next.js built-in environment variables for secure configuration

## 5. API Architecture

### Server-Side API Implementation (Critical)
- **All Gunbroker API calls must happen server-side via Next.js API routes**
- This is essential to avoid CORS (Cross-Origin Resource Sharing) issues
- Client-side code will call our Next.js API endpoints, which will then make requests to Gunbroker's API

### Gunbroker API Details
- **Production Base URL**: `https://api.gunbroker.com`
- **Sandbox Base URL**: `https://sandbox.gunbroker.com/api`
- **Required Headers**:
  - `X-DevKey`: Your Gunbroker developer key
  - `X-AccessToken`: User's access token (for authenticated endpoints)
  - `Content-Type`: `application/json`

### Implementation Flow
1. Client initiates request to Next.js API route
2. API route retrieves user's Gunbroker credentials from Supabase
3. API route generates/retrieves access token using Gunbroker credentials via the `/Users/AccessToken` endpoint
4. API route makes authenticated request to Gunbroker API
5. API route handles any errors or rate limiting issues
6. API route returns processed response to client
7. Client renders data using React components

### Access Token Management
- Store encrypted Gunbroker credentials in Supabase
- Generate access tokens via the `/Users/AccessToken` endpoint
- Track token expiration dates (`expirationDate` from authentication response)
- Store valid tokens securely in the user's record
- Implement token refresh mechanism when tokens expire
- Implement token deactivation on user logout using the DELETE method

### Key API Endpoints for MVP
1. **Authentication**: `/Users/AccessToken` (POST)
2. **Account Information**: `/Users/AccountInfo` (GET)
3. **Active Listings**: `/ItemsSelling` (GET)
4. **Sold Orders**: `/OrdersSold` (GET)
5. **Listing Search**: `/Items` (GET)
6. **Create Listing**: `/Items` (POST)

### Error Handling & Rate Limiting
- Implement proper error handling for all API responses
- Add retry logic with exponential backoff for rate limit errors (429)
- Cache responses where appropriate to reduce API calls
- Provide meaningful error messages to users while keeping technical details hidden

## 6. Conceptual Data Model

### Core Entities
1. **Users**
   - Authentication information
   - Profile details
   - Subscription status
   - Preferences

2. **Connected Accounts**
   - Gunbroker credentials (encrypted)
   - Access tokens (encrypted)
   - Connection status
   - Account details

3. **Listings**
   - Item details
   - Pricing information
   - Status
   - Images
   - Seller association

4. **Sales**
   - Transaction details
   - Buyer information
   - Item information
   - Shipping status

5. **Subscription Data**
   - Subscription level
   - Payment status
   - Billing information
   - Feature access rights

## 7. User Interface Design Principles

### Overall Design Philosophy
- Clean, modern interface with clear visual hierarchy
- Responsive design for desktop primary, mobile secondary
- Focus on usability for power sellers

### Core Interface Components
- **Sidebar Navigation**: For access to all main features
- **Dashboard**: Central area for displaying current data and metrics
- **Connection Wizard**: Guided flow for connecting Gunbroker accounts
- **Listing Management**: Interfaces for viewing and managing listings
- **Settings**: User and account management

### UI Technology
- Shadcn UI provides accessible, customizable components
- Tailwind CSS for consistent styling and rapid development
- Responsive design principles for various screen sizes

## 8. Security Considerations

### Authentication and Authorization
- Leverage Supabase for secure user authentication
- Implement proper role-based access control
- Secure storage of Gunbroker credentials

### Data Protection
- Encryption of sensitive user data and credentials
- Secure API communication using HTTPS
- Token-based authentication for all API calls
- Regular security audits

### API Security
- Server-side only API calls to Gunbroker
- Proper error handling to avoid exposing sensitive information
- Rate limiting to prevent abuse

## 9. Development Phases

### Phase 1: Foundation (MVP)
- Core authentication system with Supabase
- Gunbroker account connection wizard
- Basic dashboard with minimal UI
- Implementation of server-side API architecture
- Initial listing retrieval and search functionality

### Phase 2: Enhanced Seller Experience
- Improved dashboard with more metrics
- Listing management features
- Sales history and reporting
- Basic subscription tiers with Stripe

### Phase 3: Expanded Functionality
- Creation and management of listings
- Template system for faster listing
- Additional metrics and analytics
- Enhanced search capabilities

### Phase 4: Integrations
- ShipStation integration for shipping management
- Fastbound integration for compliance
- Additional marketplace connections
- Advanced subscription features

## 10. Potential Challenges and Solutions

### API Limitations
- **Challenge**: Gunbroker API may have rate limits or missing endpoints
- **Solution**: Implement caching strategies and efficient API usage patterns

### Authentication Complexity
- **Challenge**: Managing both app authentication and Gunbroker authentication
- **Solution**: Create a clear, secure flow for credential management

### User Experience
- **Challenge**: Creating an intuitive interface that simplifies complex tasks
- **Solution**: Focus on core workflows first, with progressive enhancement

### Scale and Performance
- **Challenge**: Maintaining performance as user base grows
- **Solution**: Leverage Supabase's scalability and implement proper caching

## 11. Future Expansion Possibilities

### Additional Marketplace Integration
- Expand beyond Gunbroker to other firearms and sporting goods marketplaces
- Create a unified selling interface across platforms

### Mobile Application
- Develop dedicated mobile apps for iOS and Android
- Implement push notifications for sales alerts

### Advanced Analytics
- Provide deeper market insights and trend analysis
- Offer competitive intelligence for business sellers

### Automation
- Listing automation based on inventory
- Automated pricing strategies
- Bulk operations and scheduled tasks

## 12. Initial Implementation Focus

### Focus Areas for Immediate Development
1. Set up Next.js 15.x project with TypeScript 5.x
   - Initialize with `create-next-app`
   - Configure Tailwind CSS
   - Set up environment variables structure

2. Implement Supabase 2.x integration
   - Authentication system
   - Database tables for users and credentials
   - Secure storage for Gunbroker credentials

3. Create server-side API architecture
   - Set up API routes structure
   - Implement middleware for authentication
   - Create utility functions for Gunbroker API communication

4. Implement Gunbroker authentication flow
   - Connection wizard component
   - Access token generation and storage
   - Token refresh mechanism

5. Build basic dashboard UI with Shadcn UI and Tailwind
   - Sidebar navigation
   - Dashboard layout
   - Basic metrics display

6. Develop initial Gunbroker API integrations
   - Listing retrieval functionality
   - Search implementation
   - Basic display of active listings

### Development Approach
- Start with a working prototype focusing on the core API integration
- Implement the connection wizard as a central feature
- Build up the dashboard incrementally with real data
- Test thoroughly with the Gunbroker sandbox environment before going to production
- Implement proper error handling from the beginning
- Use TypeScript interfaces based on Gunbroker API responses

### Initial Project Structure
```
tac-broker/
├── app/
│   ├── api/              # Server-side API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── gunbroker/    # Gunbroker API endpoints
│   │   └── stripe/       # Stripe payment endpoints
│   ├── dashboard/        # Dashboard pages
│   ├── settings/         # Settings pages
│   ├── connection/       # Account connection pages
│   └── layout.tsx        # Root layout component
├── components/           # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   ├── dashboard/        # Dashboard-specific components
│   └── forms/            # Form components
├── lib/                  # Utility functions and helpers
│   ├── supabase/         # Supabase client and utilities
│   ├── gunbroker/        # Gunbroker API utilities
│   └── types/            # TypeScript type definitions
├── middleware.ts         # Next.js middleware
└── package.json          # Project dependencies
```

## 13. Deployment Strategy

### Vercel Deployment
- Deploy the application using Vercel's Next.js optimized platform
- Connect GitHub repository to Vercel for automatic deployments
- Configure environment variables in Vercel dashboard:
  - Supabase URL and API keys
  - Gunbroker Dev Key
  - Stripe API keys (when ready)
- Utilize Vercel's preview deployments for testing before production
- Take advantage of Vercel's serverless functions for API routes

### Environment Configuration
- Development: Local environment with environment variables
- Production: Vercel-hosted environment with proper secrets
- Use `.env.local` for local development (added to `.gitignore`)
- Create a `.env.example` file with keys but no values for documentation

### MVP Launch Considerations
- Start with the production Vercel deployment but limited user base
- Initially focus on core functionality before expanding features
- Consider a "beta" phase with select users to gather feedback
- Implement basic analytics to understand user behavior and pain points
