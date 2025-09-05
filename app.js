const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { authenticate } = require('./middleware/auth');

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Mount routes
app.use('/parts', require('./routes/parts'));
app.use('/machines', require('./routes/machines'));
app.use('/machine_compatibility', require('./routes/machine_compatibility'));
app.use('/purchase_orders', require('./routes/purchase_orders'));
app.use('/purchase_order_details', require('./routes/purchase_order_details'));
app.use('/shipping_plans', require('./routes/shipping_plans'));
app.use('/shipping_plan_detail', require('./routes/shipping_plan_detail'));
app.use('/production_plan', require('./routes/production_plan'));
app.use('/production_process', require('./routes/production_process'));
app.use('/invoices', require('./routes/invoices'));

// Auth routes
const auth = require('./routes/auth');
app.post('/login', auth.login);
app.get('/getpassword', auth.getNewPassword);
app.post('/users/assign-role', authenticate, auth.assignRole);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));