const express = require('express');
const router = express.Router();
const Statement = require('../models/Statement');
const Course = require('../models/Course');
const { protect } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// All routes are protected
router.use(protect);

// Get all statements with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Build filter object
        const filter = {};
        
        if (req.query.search) {
            filter.$or = [
                { orderId: { $regex: req.query.search, $options: 'i' } },
                { 'course.title': { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
            filter.paymentMethod = req.query.paymentMethod;
        }
        
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        
        // Get total count for pagination
        const total = await Statement.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);
        
        // Get statements with population
        const statements = await Statement.find(filter)
            .populate('course', 'title courseImage thumbnail level lessons')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.json({
            success: true,
            data: {
                statements,
                totalPages,
                currentPage: page,
                total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching statements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statements'
        });
    }
});

// Get single statement by ID
router.get('/:id', async (req, res) => {
    try {
        const statement = await Statement.findById(req.params.id)
            .populate('course', 'title courseImage thumbnail level lessons');
        
        if (!statement) {
            return res.status(404).json({
                success: false,
                message: 'Statement not found'
            });
        }
        
        res.json({
            success: true,
            data: statement
        });
    } catch (error) {
        console.error('Error fetching statement:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statement'
        });
    }
});

// Create new statement (for admin use)
router.post('/', async (req, res) => {
    try {
        const {
            orderId,
            amount,
            paymentMethod,
            status,
            courseId,
            studentId
        } = req.body;
        
        // Validate required fields
        if (!orderId || !amount || !paymentMethod || !status || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }
        
        // Create statement
        const statement = new Statement({
            orderId,
            amount,
            paymentMethod,
            status,
            course: courseId,
            student: studentId || req.user.id,
            instructor: course.instructor
        });
        
        await statement.save();
        
        // Populate course data for response
        await statement.populate('course', 'title courseImage thumbnail level lessons');
        
        res.status(201).json({
            success: true,
            message: 'Statement created successfully',
            data: statement
        });
    } catch (error) {
        console.error('Error creating statement:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating statement'
        });
    }
});

// Create multiple statements at once (batch operation)
router.post('/batch', async (req, res) => {
    try {
        const statements = req.body;
        
        if (!Array.isArray(statements) || statements.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Statements array is required'
            });
        }
        
        const createdStatements = [];
        const errors = [];
        
        // Process each statement
        for (let i = 0; i < statements.length; i++) {
            try {
                const stmt = statements[i];
                const { orderId, amount, paymentMethod, status, courseId, studentId } = stmt;
                
                // Validate required fields
                if (!orderId || !amount || !paymentMethod || !status || !courseId) {
                    errors.push(`Statement ${i + 1}: Missing required fields`);
                    continue;
                }
                
                // Verify course exists
                const course = await Course.findById(courseId);
                if (!course) {
                    errors.push(`Statement ${i + 1}: Course not found`);
                    continue;
                }
                
                // Create statement
                const statement = new Statement({
                    orderId,
                    amount,
                    paymentMethod,
                    status,
                    course: courseId,
                    student: studentId || req.user.id,
                    instructor: course.instructor,
                    notes: stmt.notes || `Batch statement ${i + 1}`
                });
                
                const savedStatement = await statement.save();
                await savedStatement.populate('course', 'title courseImage thumbnail level lessons');
                createdStatements.push(savedStatement);
                
            } catch (error) {
                errors.push(`Statement ${i + 1}: ${error.message}`);
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Some statements failed to create',
                errors,
                created: createdStatements
            });
        }
        
        res.status(201).json({
            success: true,
            message: `${createdStatements.length} statements created successfully`,
            data: createdStatements
        });
        
    } catch (error) {
        console.error('Error creating batch statements:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating batch statements'
        });
    }
});

// Quick update status (simplified)
router.patch('/:id', async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const statement = await Statement.findByIdAndUpdate(
            req.params.id,
            { status, notes: notes || undefined },
            { new: true }
        ).populate('course', 'title courseImage thumbnail level lessons');
        
        if (!statement) {
            return res.status(404).json({
                success: false,
                message: 'Statement not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Statement updated successfully',
            data: statement
        });
    } catch (error) {
        console.error('Error updating statement:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating statement'
        });
    }
});

// Update statement status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const statement = await Statement.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('course', 'title courseImage thumbnail level lessons');
        
        if (!statement) {
            return res.status(404).json({
                success: false,
                message: 'Statement not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Statement status updated successfully',
            data: statement
        });
    } catch (error) {
        console.error('Error updating statement status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating statement status'
        });
    }
});

// Download statement as PDF
router.get('/:id/download', async (req, res) => {
    try {
        const statement = await Statement.findById(req.params.id)
            .populate('course', 'title level lessons')
            .populate('student', 'name email');
        
        if (!statement) {
            return res.status(404).json({
                success: false,
                message: 'Statement not found'
            });
        }
        
        // Generate PDF content (simplified version)
        const pdfContent = generateStatementPDF(statement);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="statement-${statement.orderId}.pdf"`);
        res.send(pdfContent);
        
    } catch (error) {
        console.error('Error downloading statement:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading statement'
        });
    }
});

// Delete statement
router.delete('/:id', async (req, res) => {
    try {
        const statement = await Statement.findByIdAndDelete(req.params.id);
        
        if (!statement) {
            return res.status(404).json({
                success: false,
                message: 'Statement not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Statement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting statement:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting statement'
        });
    }
});

// Helper function to generate PDF content (simplified)
function generateStatementPDF(statement) {
    return `
        <html>
            <head>
                <title>Statement - ${statement.orderId}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .info { margin-bottom: 20px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    .table th { background-color: #f2f2f2; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Payment Statement</h1>
                    <h2>Order ID: ${statement.orderId}</h2>
                </div>
                
                <div class="info">
                    <div class="info-row">
                        <strong>Student:</strong> ${statement.student?.name || 'N/A'}
                    </div>
                    <div class="info-row">
                        <strong>Email:</strong> ${statement.student?.email || 'N/A'}
                    </div>
                    <div class="info-row">
                        <strong>Course:</strong> ${statement.course?.title || 'N/A'}
                    </div>
                    <div class="info-row">
                        <strong>Level:</strong> ${statement.course?.level || 'N/A'}
                    </div>
                    <div class="info-row">
                        <strong>Payment Method:</strong> ${statement.paymentMethod}
                    </div>
                    <div class="info-row">
                        <strong>Status:</strong> ${statement.status}
                    </div>
                    <div class="info-row">
                        <strong>Amount:</strong> $${statement.amount}
                    </div>
                    <div class="info-row">
                        <strong>Date:</strong> ${new Date(statement.createdAt).toLocaleDateString()}
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is a computer-generated statement. No signature required.</p>
                </div>
            </body>
        </html>
    `;
}

module.exports = router;
