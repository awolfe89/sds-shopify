// express-api/src/app.ts (update)

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import session from 'express-session';

import { errorHandler } from './middleware/errorHandler';
import healthRouter from './endpoints/health';
import uploadRouter from './endpoints/upload';
import authRouter from './endpoints/auth'; // Add this new import

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
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
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/auth', authRouter); // Add this new route

// Error handling
app.use(errorHandler);

export default app;