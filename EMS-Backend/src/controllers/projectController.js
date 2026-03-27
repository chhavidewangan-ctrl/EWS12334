const { Project, Task } = require('../models/Project');

// ---- PROJECT CONTROLLERS ----

exports.getProjects = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { status, search, page = 1, limit = 10 } = req.query;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('client', 'name')
      .populate({ path: 'projectManager', populate: { path: 'user', select: 'firstName lastName avatar' } })
      .populate({ path: 'team', populate: { path: 'user', select: 'firstName lastName avatar' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({ success: true, count: projects.length, total, totalPages: Math.ceil(total / limit), projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate({ path: 'projectManager', populate: { path: 'user', select: 'firstName lastName avatar email' } })
      .populate({ path: 'team', populate: { path: 'user', select: 'firstName lastName avatar' } });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const tasks = await Task.find({ project: project._id })
      .populate({ path: 'assignedTo', populate: { path: 'user', select: 'firstName lastName avatar' } });

    res.status(200).json({ success: true, project, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const companyId = req.companyId || req.body.company || "69c3b5002dbdfb6f286af947";

const project = await Project.create({
  ...req.body,
  company: companyId, 
  createdBy: req.user?.id || null
});
    res.status(201).json({ success: true, project });
  } catch (error) {
  console.error("PROJECT ERROR:", error); // 🔥 ADD THIS
  res.status(500).json({ success: false, message: error.message });
}
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await Task.deleteMany({ project: project._id });
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---- TASK CONTROLLERS ----

exports.getTasks = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { project, status, assignedTo, priority, page = 1, limit = 20 } = req.query;
    if (project) query.project = project;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('project', 'name')
      .populate({ path: 'assignedTo', populate: { path: 'user', select: 'firstName lastName avatar' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({ success: true, count: tasks.length, total, totalPages: Math.ceil(total / limit), tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const companyId = req.companyId || req.body.company || "69c3b5002dbdfb6f286af947";
    
    const task = await Task.create({
      ...req.body,
      company: companyId,
      assignedBy: req.user?.id || null
    });
    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error("TASK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    if (req.body.status === 'completed') req.body.completedDate = new Date();
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Update project progress
    const allTasks = await Task.find({ project: task.project });
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
    await Project.findByIdAndUpdate(task.project, { progress });

    res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error("DELETE TASK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTaskComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.comments.push({ user: req.user.id, text: req.body.text });
    await task.save();
    res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("COMMENT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
