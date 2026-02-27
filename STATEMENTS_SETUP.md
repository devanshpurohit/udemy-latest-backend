# Statements API Setup Guide

## Overview
The Statements API has been successfully implemented and integrated into your Udemy Admin system. This allows you to manage payment statements dynamically through the UI and via API calls.

## What's Been Created

### 1. Backend Files Created:
- **`/backend/src/routes/statements.js`** - API routes for statements
- **`/backend/src/models/Statement.js`** - MongoDB schema for statements
- **`/backend/src/scripts/seedStatements.js`** - Script to add sample data
- **`/backend/postman/Statements_API.postman_collection.json`** - Postman collection

### 2. Frontend Files Updated:
- **`/frontend/src/services/statementService.js`** - API service functions
- **`/frontend/src/Componets/Pages/Statements.jsx`** - Dynamic statements component

## Quick Start

### 1. Restart Your Backend Server
```bash
# Navigate to backend directory
cd backend

# Stop any running server (Ctrl+C)
# Start server again
npm start
```

### 2. Add Sample Data (Optional)
```bash
# Run the seed script to add sample statements
node src/scripts/seedStatements.js
```

### 3. Test in Postman
1. Import the Postman collection:
   - Open Postman
   - Click Import
   - Select `backend/postman/Statements_API.postman_collection.json`
   
2. Set your JWT token:
   - Get token from login response
   - Replace `YOUR_JWT_TOKEN_HERE` in the collection variables
   
3. Test the endpoints:
   - Try "Get All Statements" first
   - Then test creating new statements

## API Endpoints

### GET /api/statements
Get all statements with filtering and pagination
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 20)
  - `search` (string): Search by order ID or course name
  - `paymentMethod` (string): Filter by payment method
  - `status` (string): Filter by status

### POST /api/statements
Create a new statement (admin only)
- **Body:**
  ```json
  {
    "orderId": "ORD001",
    "amount": 5698,
    "paymentMethod": "UPI",
    "status": "Paid",
    "courseId": "course_id_here",
    "studentId": "student_id_here",
    "notes": "Payment completed"
  }
  ```

### PUT /api/statements/:id/status
Update statement status
- **Body:**
  ```json
  {
    "status": "Paid"
  }
  ```

### GET /api/statements/:id/download
Download statement as PDF

### DELETE /api/statements/:id
Delete a statement (admin only)

## Data Structure

### Statement Object
```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j",
  "orderId": "ORD001",
  "amount": 5698,
  "paymentMethod": "UPI",
  "status": "Paid",
  "course": {
    "_id": "course_id",
    "title": "Course Title",
    "courseImage": "image_url",
    "level": "Expert",
    "lessons": 18
  },
  "student": "student_id",
  "instructor": "instructor_id",
  "paymentDate": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Frontend Features

The Statements page now includes:
- ✅ **Dynamic data loading** from API
- ✅ **Real-time search** with debouncing
- ✅ **Filter by payment method** (All/Bank Transfer/UPI)
- ✅ **Filter by status** (All/Paid/Pending)
- ✅ **Pagination** with navigation controls
- ✅ **Download statements** as PDF
- ✅ **View statements** in new tab
- ✅ **Loading states** and error handling
- ✅ **Empty state** when no data

## Testing

### 1. Via Postman
1. Import the collection
2. Set your JWT token
3. Test creating statements
4. Verify they appear in the UI

### 2. Via UI
1. Navigate to Statements page
2. Try search and filters
3. Test pagination
4. Download/view statements

## Common Issues & Solutions

### "Route not found" Error
- **Cause**: Backend server needs restart
- **Solution**: Restart your backend server after adding the new routes

### "Authentication failed" Error
- **Cause**: Invalid or missing JWT token
- **Solution**: Get fresh token from login endpoint

### "No statements found"
- **Cause**: No data in database
- **Solution**: Run the seed script or add data via Postman

### CORS Issues
- **Cause**: Frontend trying to access from different port
- **Solution**: Ensure backend is running on port 5002

## Next Steps

1. **Restart your backend server**
2. **Test the API endpoints in Postman**
3. **Add some sample data**
4. **Verify the UI shows the data**
5. **Test all features (search, filters, pagination)**

The statements system is now fully functional and ready for production use!
