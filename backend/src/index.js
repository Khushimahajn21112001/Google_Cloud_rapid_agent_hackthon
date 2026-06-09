// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/team-routing-rules', require('./routes/teamRoutingRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/corporate', require('./routes/corporateRoutes'));
app.use('/api/team-lead', require('./routes/teamLeadRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/access-requests', require('./routes/accessRequestRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running' });
});

// Temporary Seed route to bypass local network block
app.get('/api/seed', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = [
      { username: 'admin', password: 'Pass@123', role: 'Admin' },
      { username: 'corporate', password: 'Pass@123', role: 'Corporate User' },
      { username: 'support', password: 'Pass@123', role: 'Support User' },
    ];
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.insertMany(users);
      res.json({ message: 'Seeded users successfully!' });
    } else {
      res.json({ message: 'Users already seeded!' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoints
app.get('/api/debug/test-gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GEMINI_API_KEY is not defined in the backend environment (.env file)'
    });
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the model configured in our codebase
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent('Say "Gemini connection is working!" in one short sentence.');
    const text = result.response.text();
    return res.json({
      success: true,
      message: 'Gemini API is working successfully!',
      geminiResponse: text.trim()
    });
  } catch (error) {
    console.error('Debug Gemini test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      status: error.status,
      statusText: error.statusText,
      errorDetails: error.errorDetails || error.details
    });
  }
});

const PORT = process.env.PORT || 5000;

// Export the app for Vercel serverless environments
module.exports = app;

// Only listen on a port if not running in a Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server due to DB error', err);
  });
} else {
  // For Vercel, just connect to the DB (it will connect on each cold start)
  connectDB().catch(console.error);
}
