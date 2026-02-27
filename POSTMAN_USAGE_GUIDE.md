# Postman से Statements बनाने के लिए Easy Guide

## 🚀 Quick Start

### 1. Postman Collection Import करें
1. Postman खोलें
2. Import पर क्लिक करें
3. `Statements_API.postman_collection.json` file select करें
4. Import बटन पर click करें

### 2. Variables Set करें
Collection में 2 variables हैं:
- `jwt_token` - आपका JWT token
- `base_url` - API URL (http://localhost:5002)

**Variables set करने के लिए:**
1. Collection पर right-click करें
2. Edit करें
3. Variables टैब में जाएं
4. JWT token डालें और Save करें

## 📝 Data Create करने के तरीके

### ✅ Single Statement Create
**Request:** "Create Statement (Easy Form)"
- Auto-generates Order ID: `ORD{{$randomInt}}`
- Auto-generates Amount: `{{$randomInt}}00`
- बस change करने के लिए fields

**Example:**
```json
{
    "orderId": "ORD12345",
    "amount": 569800,
    "paymentMethod": "UPI",
    "status": "Pending",
    "courseId": "COURSE_ID_HERE",
    "studentId": "STUDENT_ID_HERE",
    "notes": "Created via Postman"
}
```

### ✅ Batch Statements Create
**Request:** "Create Multiple Statements (Batch)"
- एक साथ 3 statements create करता है
- Different amounts और payment methods

### ✅ Quick Status Update
**Request:** "Quick Update Statement"
- PATCH method use करता है
- Status और notes दोनों update कर सकते हैं

## 🔧 Available Endpoints

| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/api/statements` | सभी statements देखने के लिए |
| POST | `/api/statements` | एक statement बनाने के लिए |
| POST | `/api/statements/batch` | कई statements एक साथ बनाने के लिए |
| GET | `/api/statements/:id` | एक specific statement देखने के लिए |
| PATCH | `/api/statements/:id` | Quick update के लिए |
| PUT | `/api/statements/:id/status` | Status update के लिए |
| GET | `/api/statements/:id/download` | PDF download के लिए |
| DELETE | `/api/statements/:id` | Statement delete के लिए |

## 📱 Frontend में Data कैसे दिखेगा

जब आप Postman से data create करेंगे, तो ये automatically Statements page पर दिखेगा:

1. **Real-time Search** - Order ID या Course name से search
2. **Payment Filter** - UPI, Bank Transfer, etc.
3. **Status Filter** - Paid, Pending, Failed, Refunded
4. **Pagination** - Page navigation के साथ
5. **Download/View** - PDF download और view options

## 🎯 Tips & Tricks

### Auto Order ID Generation
```json
"orderId": "ORD{{$randomInt}}"
```
ये random order ID generate करेगा।

### Auto Amount Generation
```json
"amount": "{{$randomInt}}00"
```
ये random amount generate करेगा (जैसे 12300, 45600)।

### Quick Testing
1. पहले "Create Statement (Easy Form)" से एक statement बनाएं
2. Response में से `_id` copy करें
3. "Get Single Statement" में `_id` paste करें
4. "Quick Update Statement" से status update करें

## 🔍 Common Issues & Solutions

### "Authentication failed"
**Solution:** JWT token check करें और variables में set करें

### "Course not found"
**Solution:** Valid course ID use करें जो database में exists करती है

### "Missing required fields"
**Solution:** सभी required fields fill करें: orderId, amount, paymentMethod, status, courseId

## 🚀 Full Workflow Example

### Step 1: Create 3 Statements
```
POST /api/statements/batch
[
    {
        "orderId": "ORD001",
        "amount": 2999,
        "paymentMethod": "UPI",
        "status": "Paid",
        "courseId": "64f1a2b3c4d5e6f7g8h9i0j",
        "notes": "Student payment"
    },
    {
        "orderId": "ORD002", 
        "amount": 4599,
        "paymentMethod": "Bank Transfer",
        "status": "Pending",
        "courseId": "64f1a2b3c4d5e6f7g8h9i0j",
        "notes": "Pending bank transfer"
    }
]
```

### Step 2: Check Frontend
- Browser में Statements page खोलें
- Data automatically load होगा
- Search और filters test करें

### Step 3: Update Status
```
PATCH /api/statements/STATEMENT_ID
{
    "status": "Paid",
    "notes": "Payment confirmed"
}
```

अब आप Postman से easily statements create और manage कर सकते हैं! 🎉
