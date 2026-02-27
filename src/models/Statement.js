const mongoose = require('mongoose');

const statementSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['UPI', 'Bank Transfer', 'Credit Card', 'Debit Card', 'PayPal', 'Other']
    },
    status: {
        type: String,
        required: true,
        enum: ['Paid', 'Pending', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactionId: {
        type: String,
        sparse: true
    },
    paymentDate: {
        type: Date
    },
    refundDate: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Indexes for better query performance
statementSchema.index({ orderId: 1 });
statementSchema.index({ student: 1 });
statementSchema.index({ instructor: 1 });
statementSchema.index({ course: 1 });
statementSchema.index({ status: 1 });
statementSchema.index({ paymentMethod: 1 });
statementSchema.index({ createdAt: -1 });

// Virtual for formatted amount
statementSchema.virtual('formattedAmount').get(function() {
    return `$${this.amount.toFixed(2)}`;
});

// Pre-save middleware
statementSchema.pre('save', function(next) {
    // Set payment date when status changes to Paid
    if (this.isModified('status') && this.status === 'Paid' && !this.paymentDate) {
        this.paymentDate = new Date();
    }
    
    // Set refund date when status changes to Refunded
    if (this.isModified('status') && this.status === 'Refunded' && !this.refundDate) {
        this.refundDate = new Date();
    }
    
    next();
});

module.exports = mongoose.model('Statement', statementSchema);
