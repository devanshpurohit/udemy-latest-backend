# Udemy Admin Backend

A comprehensive backend API for the Udemy Admin Dashboard, built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Instructor, Student)
  - Email verification with OTP
  - Password reset functionality

- **Course Management**
  - Create, read, update, delete courses
  - Lesson management
  - File uploads (thumbnails, videos)
  - Student enrollment
  - Course ratings and reviews

- **Student Management**
  - Student profiles and progress tracking
  - Learning analytics
  - Certificate generation
  - Notes and bookmarks

- **Dashboard Analytics**
  - Revenue tracking
  - Enrollment statistics
  - Course performance metrics
  - Real-time data visualization

- **Announcement System**
  - Targeted announcements
  - Scheduling and expiry
  - Read status tracking

- **Coupon System**
  - Percentage and fixed amount discounts
  - Usage limits and restrictions
  - Course-specific coupons

- **Certificate Management**
  - Automatic certificate generation
  - Customizable templates
  - Verification system
  - PDF download support

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: Nodemailer

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/udemy-admin
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. Start the server:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "Password123"
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Courses

#### Create Course
```http
POST /api/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Learn React.js",
  "description": "Complete React.js course",
  "category": "development",
  "price": 99.99,
  "duration": 1200
}
```

#### Get All Courses
```http
GET /api/courses?page=1&limit=10&category=development
Authorization: Bearer <token>
```

#### Upload Course Thumbnail
```http
POST /api/courses/:id/upload-thumbnail
Authorization: Bearer <token>
Content-Type: multipart/form-data

thumbnail: [file]
```

### Students

#### Get All Students
```http
GET /api/students?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Student Progress
```http
GET /api/students/:studentId/courses/:courseId/progress
Authorization: Bearer <token>
```

### Dashboard

#### Get Dashboard Stats
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

#### Get Revenue Data
```http
GET /api/dashboard/revenue?period=monthly
Authorization: Bearer <token>
```

### Announcements

#### Create Announcement
```http
POST /api/announcements
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "content": "Scheduled maintenance tonight",
  "type": "system_maintenance",
  "priority": "high",
  "targetAudience": "all"
}
```

### Coupons

#### Create Coupon
```http
POST /api/coupons
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE20",
  "description": "20% off on all courses",
  "type": "percentage",
  "value": 20,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

#### Validate Coupon
```http
POST /api/coupons/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE20",
  "courseAmount": 99.99
}
```

### Certificates

#### Generate Certificate
```http
POST /api/certificates/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course_id_here",
  "studentId": "student_id_here"
}
```

#### Verify Certificate
```http
GET /api/certificates/verify/CERT-ABC123
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── courseController.js  # Course management
│   │   ├── studentController.js # Student management
│   │   ├── dashboardController.js # Dashboard analytics
│   │   ├── announcementController.js # Announcements
│   │   ├── couponController.js  # Coupon management
│   │   └── certificateController.js # Certificate management
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── upload.js            # File upload middleware
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Course.js            # Course model
│   │   ├── Student.js           # Student model
│   │   ├── Announcement.js      # Announcement model
│   │   ├── Coupon.js            # Coupon model
│   │   └── Certificate.js       # Certificate model
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── courses.js           # Course routes
│   │   ├── students.js          # Student routes
│   │   ├── dashboard.js         # Dashboard routes
│   │   ├── announcements.js     # Announcement routes
│   │   ├── coupons.js           # Coupon routes
│   │   └── certificates.js      # Certificate routes
│   ├── utils/
│   │   ├── generateToken.js     # JWT token utilities
│   │   └── emailService.js      # Email service
│   └── server.js                # Main server file
├── uploads/                     # File upload directory
├── .env                         # Environment variables
├── package.json                 # Dependencies
└── README.md                    # This file
```

## Security Features

- JWT-based authentication with expiration
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS configuration
- Input validation and sanitization
- File upload restrictions
- Role-based access control

## Error Handling

The API uses consistent error handling with appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

All error responses include:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/udemy-admin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
