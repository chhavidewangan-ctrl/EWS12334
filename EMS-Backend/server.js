require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const connectDB = require('./src/config/database');
const socketHandler = require('./src/socket/socketHandler');

// Route imports
const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employees');
const attendanceRoutes = require('./src/routes/attendance');
const leaveRoutes = require('./src/routes/leaves');
const payrollRoutes = require('./src/routes/payroll');
const projectRoutes = require('./src/routes/projects');
const erpRoutes = require('./src/routes/erp');
const systemRoutes = require('./src/routes/system');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

socketHandler(io);

// Make io accessible in routes
app.set('io', io);

// Create uploads directory
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/auth', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api', systemRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'EMS ERP API is running', timestamp: new Date() });
});

// API docs endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'EMS ERP API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login',
        'POST /api/auth/register': 'Register',
        'GET /api/auth/me': 'Get current user',
        'POST /api/auth/forgotpassword': 'Forgot password',
        'POST /api/auth/resetpassword': 'Reset password',
        'POST /api/auth/verifyemail': 'Verify email',
        'PUT /api/auth/updatepassword': 'Update password'
      },
      employees: {
        'GET /api/employees': 'Get all employees',
        'POST /api/employees': 'Create employee',
        'GET /api/employees/:id': 'Get employee',
        'PUT /api/employees/:id': 'Update employee',
        'DELETE /api/employees/:id': 'Delete employee',
        'GET /api/employees/stats': 'Get stats',
        'POST /api/employees/:id/documents': 'Upload document'
      },
      attendance: {
        'POST /api/attendance/checkin': 'Check in',
        'POST /api/attendance/checkout': 'Check out',
        'GET /api/attendance': 'Get attendance',
        'POST /api/attendance/mark': 'Mark attendance (admin)',
        'GET /api/attendance/today': 'Today summary',
        'GET /api/attendance/my-today': 'My today attendance'
      },
      leaves: {
        'GET /api/leaves': 'Get leaves',
        'POST /api/leaves': 'Apply leave',
        'PUT /api/leaves/:id/status': 'Update status',
        'GET /api/leaves/balance': 'Get balance',
        'PUT /api/leaves/:id/cancel': 'Cancel leave'
      },
      payroll: {
        'POST /api/payroll/generate': 'Generate payroll',
        'GET /api/payroll': 'Get payrolls',
        'GET /api/payroll/:id': 'Get payroll',
        'PUT /api/payroll/:id/status': 'Update status',
        'GET /api/payroll/report': 'Salary report'
      },
      projects: {
        'GET /api/projects': 'Get projects',
        'POST /api/projects': 'Create project',
        'GET /api/projects/:id': 'Get project',
        'PUT /api/projects/:id': 'Update project',
        'DELETE /api/projects/:id': 'Delete project',
        'GET /api/projects/tasks/all': 'Get all tasks',
        'POST /api/projects/tasks': 'Create task',
        'PUT /api/projects/tasks/:id': 'Update task'
      },
      erp: {
        clients: 'GET|POST /api/erp/clients',
        vendors: 'GET|POST /api/erp/vendors',
        invoices: 'GET|POST /api/erp/invoices',
        expenses: 'GET|POST /api/erp/expenses',
        inventory: 'GET|POST /api/erp/inventory',
        sales: 'GET|POST /api/erp/sales',
        purchases: 'GET|POST /api/erp/purchases'
      },
      system: {
        'GET /api/dashboard': 'Dashboard overview',
        'GET /api/reports/:type': 'Reports',
        'GET /api/notifications': 'Notifications',
        'GET /api/announcements': 'Announcements',
        'GET /api/tickets': 'Tickets',
        'GET /api/holidays': 'Holidays',
        'GET /api/companies': 'Companies',
        'GET /api/branches': 'Branches'
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Connect to DB and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`📄 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  });
});

module.exports = { app, server, io };
