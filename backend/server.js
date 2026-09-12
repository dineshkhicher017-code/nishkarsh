const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const attemptsRoutes = require('./routes/attempts');
const hintsRoutes = require('./routes/hints');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', attemptsRoutes);
app.use('/api', hintsRoutes);

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.listen(PORT, () => {
  console.log(`Nishkarsh server running on http://localhost:${PORT}`);
});
