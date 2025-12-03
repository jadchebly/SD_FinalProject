import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Test database route using Supabase
app.get('/test-db', async (req, res) => {
  try {
    // Test connection by querying a system table or doing a simple query
    const { data, error } = await supabase.rpc('version').catch(async () => {
      // If RPC doesn't work, try a simple query
      return await supabase.from('users').select('count').limit(0);
    });

    if (error) {
      // If table doesn't exist yet, that's OK - connection still works
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return res.json({
          success: true,
          database: 'connected',
          message: 'Supabase connected! (Tables may not be created yet)',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      database: 'connected',
      message: 'Supabase connection successful!',
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/test-db`);
});
