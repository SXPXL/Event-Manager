# Event Manager

A comprehensive event management system built with FastAPI (Backend) and React + Vite (Frontend). This application allows users to register for events, make payments, and provides admin/staff dashboards for managing events, registrations, and data export.

## Features

- **User Registration & Management**: Users can register, update profiles, and check registration status via UID.
- **Event Management**: Create, view, and delete events (solo or team-based).
- **Payment Integration**: Supports online payments via Cashfree and cash payments with token verification.
- **Admin Dashboard**: Manage volunteers, events, users, and view analytics.
- **Staff Tools**: Walk-in registration, attendance marking, user search, and data export.
- **Data Export**: Export registration data as CSV with filtering and sorting options.
- **QR Code Integration**: Generate and verify QR codes for payments and check-ins.
- **Email Notifications**: Automated emails for registration confirmations.
- **Security**: Rate limiting, CORS, password hashing, and webhook signature verification.
- **Real-time Updates**: Webhook handling for payment status updates.

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy and SQLModel
- **ORM**: SQLModel
- **Migrations**: Alembic
- **Authentication**: JWT tokens with bcrypt hashing
- **Rate Limiting**: SlowAPI
- **Email**: SMTP (Gmail/Brevo)
- **Payments**: Cashfree API
- **Other**: QR code generation (qrcode[pil]), dotenv for environment variables

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: Custom CSS with glassmorphism effects
- **QR Code**: react-qr-code and @yudiel/react-qr-scanner
- **Payments**: @cashfreepayments/cashfree-js
- **HTTP Client**: Axios
- **Linting**: ESLint

## Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL database
- Git

## Installation & Setup

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Event-manager/Backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in the required values:
     ```
     DATABASE_URL=postgresql://user:password@host/dbname
     EMAIL_USER=your_gmail@gmail.com
     EMAIL_PASS=your_app_password
     CASHFREE_APP_ID=your_cashfree_app_id
     CASHFREE_SECRET_KEY=your_cashfree_secret
     CASHFREE_ENV=PRODUCTION/SANDBOX
     FRONTEND_URL=https://your-vercel-app.vercel.app
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_password
     WEBHOOK_URL=https://your-render-app.onrender.com/api/webhooks/cashfree
     BREVO_API_KEY=your_brevo_api_key
     ```

5. **Set up the database**:
   - Ensure PostgreSQL is running.
   - Run migrations:
     ```bash
     alembic upgrade head
     ```

6. **Run the backend**:
   ```bash
   uvicorn main:app --reload
   ```
   - API will be available at `http://localhost:8000`
   - Swagger docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd ../Frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` (if exists) or create one with:
     ```
     VITE_API_BASE_URL=http://localhost:8000
     ```

4. **Run the frontend**:
   ```bash
   npm run dev
   ```
   - App will be available at `http://localhost:5173`

## API Documentation

The API is built with FastAPI and includes automatic Swagger documentation at `/docs`. Below is a comprehensive list of all endpoints.

### Authentication Routes (`/api/auth`)

- **GET /api/auth/check-uid/{uid}**
  - Check if a UID exists and get user details with registered events.
  - Rate limited: 30/minute
  - Response: `CheckUIDResponse`

- **POST /api/auth/users**
  - Register a new user and send confirmation email.
  - Rate limited: 10/minute
  - Body: `UserCreateUpdate`
  - Response: `UserResponse`

- **POST /api/auth/admin/login**
  - Admin/volunteer login.
  - Rate limited: 5/minute
  - Body: `AdminLoginRequest`
  - Response: `AdminLoginResponse`

- **PUT /api/auth/users/{uid}**
  - Update user profile.
  - Body: `UserUpdateProfile`
  - Response: `UserResponse`

### Event Routes (`/api/events`)

- **GET /api/events**
  - Get all events with registration counts and revenue.
  - Response: `List[EventDisplay]`

- **POST /api/events/validate-team**
  - Validate team composition before registration.
  - Body: `TeamValidationRequest`
  - Response: Validation result

- **POST /api/events/register-bulk**
  - Register for multiple events (bulk registration with payment).
  - Body: `BulkRegisterRequest`
  - Response: Registration result with payment data

### Admin Routes (`/api/admin`) - Requires Admin Authentication

- **GET /api/admin/volunteers**
  - List all volunteers.
  - Response: List of volunteers

- **POST /api/admin/volunteers**
  - Create a new volunteer.
  - Rate limited: 5/minute
  - Body: `VolunteerCreate`
  - Response: Success message

- **POST /api/events**
  - Create a new event.
  - Rate limited: 10/minute
  - Body: `EventCreate`
  - Response: Success message

- **DELETE /api/events/{event_id}**
  - Delete an event and all associated data.
  - Rate limited: 5/minute
  - Response: Success message

- **DELETE /api/admin/users/{uid}**
  - Delete a user.
  - Rate limited: 5/minute
  - Response: Success message

- **DELETE /api/admin/volunteers/{vol_id}**
  - Delete a volunteer (cannot delete root admin).
  - Rate limited: 5/minute
  - Response: Success message

- **GET /api/admin/users**
  - List all users.
  - Response: List of users

- **GET /api/admin/export/master**
  - Export all registration data as CSV.
  - Response: CSV file download

### Staff Routes (`/api/staff`)

- **POST /api/staff/walk-in-register**
  - Walk-in bulk registration.
  - Rate limited: 10/minute
  - Body: `WalkInBulkRequest`
  - Response: Registration data

- **GET /api/staff/search**
  - Search users by query.
  - Query param: `q`
  - Response: Search results

- **POST /api/staff/mark-attendance**
  - Mark user attendance for an event.
  - Body: `MarkAttendanceRequest`
  - Response: Success message

- **POST /api/staff/generate-token**
  - Generate a cash token for payment.
  - Body: `TokenRequest`
  - Response: Token data

- **GET /api/staff/user-profile/{uid}**
  - Get full user profile.
  - Response: User profile data

- **GET /api/staff/export/event/{event_id}**
  - Export event-specific data as CSV with filtering and sorting.
  - Query params: `filter` (ALL/PAID/PENDING), `sort` (NAME/UID/etc.)
  - Response: CSV file download

- **GET /api/staff/all-registrations**
  - Get all paid registrations for check-in.
  - Response: List of registrations

### Payment Routes (`/api/payment`)

- **POST /api/webhooks/cashfree**
  - Webhook endpoint for Cashfree payment notifications.
  - Headers: `x-webhook-signature`, `x-webhook-timestamp`
  - Response: Status confirmation

- **GET /api/payment/status/{order_id}**
  - Check payment status for an order.
  - Response: Payment status details

## Database Schema

The application uses PostgreSQL with the following main tables:
- **Users**: User information (uid, name, email, phone, college)
- **Events**: Event details (name, type, fee, team size limits)
- **Registrations**: Links users to events with payment status
- **Teams**: Team information for group events
- **Volunteers**: Staff/admin accounts with roles
- **PaymentOrders**: Tracks payment orders and status

Run `alembic upgrade head` to apply all migrations.

## Deployment

### Backend Deployment (e.g., Render)
1. Set up a PostgreSQL database.
2. Deploy the FastAPI app to Render or similar.
3. Set environment variables in the deployment platform.
4. Ensure the webhook URL is publicly accessible.

### Frontend Deployment (Vercel)
1. The `vercel.json` is configured for Vercel deployment.
2. Build the app: `npm run build`
3. Deploy to Vercel, setting `VITE_API_BASE_URL` to your backend URL.

### Production Considerations
- Use HTTPS for all communications.
- Set `CASHFREE_ENV=PRODUCTION` for live payments.
- Monitor rate limits and implement additional security measures.
- Set up logging and error monitoring.
- Ensure database backups.

## Development

- **Linting**: Run `npm run lint` in frontend.
- **Testing**: No tests implemented yet (add unit tests for critical functions).
- **Migrations**: Use `alembic revision --autogenerate -m "message"` for new migrations.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes and test thoroughly.
4. Submit a pull request.

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue in the repository.