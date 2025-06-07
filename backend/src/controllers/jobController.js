const Job = require('../models/Job');
const cron = require('node-cron');

// Store active cron jobs
const activeJobs = new Map();

// Function to execute job
const executeJob = async (jobId) => {
  try {
    const job = await Job.findById(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    console.log(`Executing job: ${job.name} at ${new Date().toISOString()}`);
    // Here you can add more complex job execution logic
    console.log('Hello World');

    // Update last run time
    job.lastRun = new Date();
    await job.save();
  } catch (error) {
    console.error(`Error executing job ${jobId}:`, error);
  }
};

// Function to schedule a job
const scheduleJob = (job) => {
  try {
    let cronExpression = '';

    switch (job.scheduleType) {
      case 'hourly':
        cronExpression = `${job.scheduleConfig.minute} * * * *`;
        break;
      case 'daily':
        cronExpression = `${job.scheduleConfig.minute} ${job.scheduleConfig.hour} * * *`;
        break;
      case 'weekly':
        cronExpression = `${job.scheduleConfig.minute} ${job.scheduleConfig.hour} * * ${job.scheduleConfig.day}`;
        break;
      default:
        throw new Error('Invalid schedule type');
    }

    console.log(`Scheduling job ${job.name} with cron expression: ${cronExpression}`);
    
    // Stop existing job if it exists
    if (activeJobs.has(job._id.toString())) {
      console.log(`Stopping existing job ${job._id}`);
      activeJobs.get(job._id.toString()).stop();
      activeJobs.delete(job._id.toString());
    }

    const task = cron.schedule(cronExpression, () => executeJob(job._id));
    activeJobs.set(job._id.toString(), task);
    console.log(`Successfully scheduled job ${job._id}`);
  } catch (error) {
    console.error(`Error scheduling job ${job._id}:`, error);
    throw error;
  }
};

// Create a new job
exports.createJob = async (req, res) => {
  try {
    console.log('Creating new job with data:', req.body);
    
    // Validate required fields
    if (!req.body.name || !req.body.scheduleType || !req.body.scheduleConfig) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new job
    const job = new Job({
      name: req.body.name,
      scheduleType: req.body.scheduleType,
      scheduleConfig: {
        minute: parseInt(req.body.scheduleConfig.minute) || 0,
        hour: parseInt(req.body.scheduleConfig.hour) || 0,
        day: parseInt(req.body.scheduleConfig.day) || 0
      },
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    console.log('Saving new job:', job);
    await job.save();
    
    if (job.isActive) {
      console.log('Scheduling new job:', job._id);
      scheduleJob(job);
    }

    console.log('Job created successfully:', job);
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.stack 
    });
  }
};

// Get all jobs
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    console.log(`Found ${jobs.length} jobs`);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single job
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update a job
exports.updateJob = async (req, res) => {
  try {
    console.log('Update request received:', req.params.id, req.body);
    
    const job = await Job.findById(req.params.id);
    if (!job) {
      console.log('Job not found:', req.params.id);
      return res.status(404).json({ message: 'Job not found' });
    }

    console.log('Existing job found:', job);

    // Stop existing job if it's running
    if (activeJobs.has(job._id.toString())) {
      console.log('Stopping existing job:', job._id);
      activeJobs.get(job._id.toString()).stop();
      activeJobs.delete(job._id.toString());
    }

    // Update job with new data
    const updatedData = {
      ...job.toObject(),
      ...req.body,
      scheduleConfig: {
        ...job.scheduleConfig,
        ...req.body.scheduleConfig
      }
    };

    console.log('Updating job with data:', updatedData);

    // Update job
    Object.assign(job, updatedData);
    await job.save();

    console.log('Job updated successfully:', job);

    // Schedule new job if active
    if (job.isActive) {
      console.log('Scheduling updated job:', job._id);
      scheduleJob(job);
    }

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.stack 
    });
  }
};

// Delete a job
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Stop the job if it's running
    if (activeJobs.has(job._id.toString())) {
      activeJobs.get(job._id.toString()).stop();
      activeJobs.delete(job._id.toString());
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: error.message });
  }
};

// Initialize all active jobs on server start
exports.initializeJobs = async () => {
  try {
    const jobs = await Job.find({ isActive: true });
    console.log(`Found ${jobs.length} active jobs to initialize`);
    jobs.forEach(job => {
      try {
        scheduleJob(job);
      } catch (error) {
        console.error(`Error initializing job ${job._id}:`, error);
      }
    });
  } catch (error) {
    console.error('Error initializing jobs:', error);
  }
}; 