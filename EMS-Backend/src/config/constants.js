module.exports = {
  roles: ['superadmin', 'admin', 'hr', 'manager', 'accountant', 'employee'],

  permissions: {
    superadmin: ['*'],
    admin: [
      'employees.*', 'attendance.*', 'leaves.*', 'payroll.*',
      'projects.*', 'tasks.*', 'clients.*', 'vendors.*',
      'invoices.*', 'expenses.*', 'inventory.*', 'sales.*',
      'purchases.*', 'reports.*', 'notifications.*',
      'announcements.*', 'tickets.*', 'documents.*',
      'branches.read', 'settings.read'
    ],
    hr: [
      'employees.*', 'attendance.*', 'leaves.*', 'payroll.*',
      'documents.*', 'announcements.*', 'reports.employee',
      'reports.attendance', 'reports.salary'
    ],
    manager: [
      'employees.read', 'attendance.read', 'leaves.approve',
      'projects.*', 'tasks.*', 'reports.project',
      'announcements.read', 'notifications.read'
    ],
    accountant: [
      'payroll.*', 'sales.*', 'purchases.*', 'expenses.*',
      'invoices.*', 'vendors.*', 'clients.*',
      'reports.salary', 'reports.sales', 'reports.expense',
      'reports.profit_loss', 'inventory.read'
    ],
    employee: [
      'attendance.own', 'leaves.own', 'payroll.own',
      'projects.own', 'tasks.own', 'documents.own',
      'profile.own', 'notifications.own', 'tickets.own',
      'announcements.read'
    ]
  },

  leaveTypes: [
    'casual', 'sick', 'earned', 'maternity', 'paternity',
    'compensatory', 'unpaid', 'other'
  ],

  attendanceStatus: [
    'present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'weekend'
  ],

  taskStatus: ['todo', 'in_progress', 'in_review', 'completed', 'on_hold'],
  taskPriority: ['low', 'medium', 'high', 'critical'],
  projectStatus: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],

  invoiceStatus: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
  expenseStatus: ['pending', 'approved', 'rejected', 'paid'],

  ticketStatus: ['open', 'in_progress', 'resolved', 'closed'],
  ticketPriority: ['low', 'medium', 'high', 'urgent']
};
