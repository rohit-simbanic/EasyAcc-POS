import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Import Database Config
import { connectDB } from './config/db';

// Import Route Handlers
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import reportRoutes from './routes/reports';
import invoiceRoutes from './routes/invoices';

// Import Socket Sync Manager
import { initSocketManager } from './sync/socketManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// REST API Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);

// Socket.io Real-time DB Synchronization
initSocketManager(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TypeScript API Server running on port ${PORT}`);
});
