```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Joi = require('joi');

const app = express();
app.use(cors());
app.use(express.json());

// API key auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'];
  if (process.env.API_KEY && (!key || key !== process.env.API_KEY)) {
    return res.status(401).json({ success: false, error: 'Invalid or missing API key' });
  }
  next();
});

// Input validation schema
const jobTitleSchema = Joi.string().required().min(3);

// Job data endpoint
app.get('/job-data', async (req, res) => {
  try {
    const { error } = jobTitleSchema.validate(req.query.jobTitle);
    if (error) {
      return res.status(400).json({ success: false, error: 'Invalid job title', message: error.details[0].message });
    }

    const jobTitle = req.query.jobTitle;
    const response = await axios.get(`https://api.openai.com/v1/completions`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      params: {
        prompt: `What is the salary range, required skills, and short job description for a ${jobTitle} job? Provide a JSON response.`,
        max_tokens: 200,
      },
    });

    if (response.status !== 200) {
      return res.status(503).json({ success: false, error: 'Failed to retrieve job data', message: 'Please try again later' });
    }

    const jobData = response.data.choices[0].text;
    try {
      const parsedJobData = JSON.parse(jobData);
      return res.json({ success: true, data: parsedJobData });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to parse job data', message: 'Internal server error' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: 'Please try again later' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  return res.json({ success: true, data: 'API is healthy' });
});

// 404 handler
app.use((req, res) => {
  return res.status(404).json({ success: false, error: 'Not found', message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ success: false, error: 'Internal server error', message: 'Please try again later' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```