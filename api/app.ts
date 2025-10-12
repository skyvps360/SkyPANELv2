/**
 * ContainerStacks API Server
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import { config, validateConfig } from './config/index.js'
import authRoutes from './routes/auth.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'
import containersRoutes from './routes/containers.js'
import vpsRoutes from './routes/vps.js'
import supportRoutes from './routes/support.js'
import activityRoutes from './routes/activity.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Validate configuration
validateConfig()

const app: express.Application = express()

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// CORS configuration
// CORS configuration with sensible dev defaults and optional override
const devOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : (process.env.NODE_ENV === 'production' ? ['https://your-domain.com'] : devOrigins)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/containers', containersRoutes)
app.use('/api/vps', vpsRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/activity', activityRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log full error details server-side
  console.error('API error:', error)
  const isDev = process.env.NODE_ENV !== 'production'
  res.status(500).json({
    success: false,
    error: isDev ? (error?.message || 'Server internal error') : 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
