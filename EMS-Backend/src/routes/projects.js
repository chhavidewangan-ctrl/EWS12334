const express = require('express');
const router = express.Router();
const { getProjects, getProject, createProject, updateProject, deleteProject, getTasks, createTask, updateTask, deleteTask, addTaskComment } = require('../controllers/projectController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);
router.use(companyCheck);

router.route('/').get(getProjects).post(authorize('admin', 'manager'), createProject);
router.route('/:id').get(getProject).put(authorize('admin', 'manager'), updateProject).delete(authorize('admin'), deleteProject);

// Tasks
router.get('/tasks/all', getTasks);
router.post('/tasks', authorize('superadmin', 'admin', 'manager'), createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', authorize('superadmin', 'admin', 'manager'), deleteTask);
router.post('/tasks/:id/comments', addTaskComment);

module.exports = router;
