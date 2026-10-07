import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './src/config/db.js'
import { seedAdmin } from './src/utils/seedAdmin.js'
import productRoutes from './src/routes/products.js'
import categoryRoutes from './src/routes/categories.js'
import authRoutes from './src/routes/auth.js'
import uploadRoutes from './src/routes/upload.js'
import orderRoutes from './src/routes/orders.js'
import emailTestRoutes from './src/routes/emailTest.js'
import deviceRoutes from './src/routes/devices.js'
import boxRoutes from './src/routes/boxes.js'


dotenv.config()

const app = express()

// ─── Strip any CORS headers added by anything upstream
app.use((req, res, next) => {
  res.removeHeader('Access-Control-Allow-Origin')
  res.removeHeader('Access-Control-Allow-Credentials')
  res.removeHeader('Access-Control-Allow-Methods')
  res.removeHeader('Access-Control-Allow-Headers')
  next()
})

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (/^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true)
      }
      if (origin === process.env.CLIENT_URL) return callback(null, true)
      callback(new Error(`Origin ${origin} not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.options('*', cors())

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Static files (uploads)
app.use('/uploads', express.static('uploads'))

// ─── Health
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Shezz Traders API', version: '1.0.0' })
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// ─── Routes
app.use('/api/admin', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/test-email', emailTestRoutes)
app.use('/api/devices', deviceRoutes)    
app.use('/api/boxes', boxRoutes)            // with the other routes


// ─── 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found' })
})

// ─── Errors
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message)
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Internal server error',
  })
})

const PORT = process.env.PORT || 5000

const start = async () => {
  try {
    await connectDB()
    await seedAdmin()
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`)
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`   Accepting localhost:* origins\n`)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err.message)
    process.exit(1)
  }
}

start()