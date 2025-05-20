// express-api/src/app.ts (update)

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import session from 'express-session';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import healthRouter from './endpoints/health';
import uploadRouter from './endpoints/upload';
import authRouter from './endpoints/auth';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    'https://*.myshopify.com'
  ],
  credentials: true
}));
// Configure Helmet for Shopify embedding
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'frame-ancestors': ["'self'", "https://*.myshopify.com", "https://*.shopify.com"]
      }
    },
    // Disable X-Frame-Options to allow Shopify embedding
    frameguard: false
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/upload', uploadRouter);
app.use('/auth', authRouter);

// Root route handler to redirect to the Next.js frontend
app.get('/', (req, res) => {
  // Parse the shop parameter and any other query params
  const queryParams = new URLSearchParams();
  
  // Add all query parameters
  Object.entries(req.query).forEach(([key, value]) => {
    if (typeof value === 'string') {
      queryParams.append(key, value);
    }
  });
  
  // Build the query string
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  // Redirect to Next.js app with all query parameters preserved
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}${queryString}`);
});

// Error handling
app.use(errorHandler);

export default app;