require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');

const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const prospectRoutes = require('./routes/prospects');
const analysisRoutes = require('./routes/analysis');

        const db = require('./database/db.supabase');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting (if behind a proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    `chrome-extension://${process.env.EXTENSION_ID}`,
    'https://www.linkedin.com',
    'http://localhost:3000',
    'http://localhost:3001',
      'https://linkify-frontend-ashen.vercel.app'  ],
  credentials: true
}));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
require('./config/passport');

app.use(passport.initialize());
app.use(passport.session());

// // Initialize database
// db.init().then(() => {
//   console.log('Database initialized successfully');
// }).catch(err => {
//   console.error('Database initialization failed:', err);
//   process.exit(1);
// });

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/analysis', analysisRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({ 
      error: 'Invalid JSON format in request body',
      message: 'Please check your JSON data for syntax errors',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Handle other errors
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});