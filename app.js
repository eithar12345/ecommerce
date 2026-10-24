const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بالداتابيز
connectDB();

// الروتس
const userRouter = require('./routers/user');
const productRouter = require('./routers/product');
const cartRouter = require('./routers/cart');
const orderRouter = require('./routers/order');
const wishlistRouter = require('./routers/wishlist');
const adminRouter = require('./routers/admin');

app.use('/', userRouter); 
app.use('/', productRouter); 
app.use('/carts', cartRouter);
app.use('/orders', orderRouter);
app.use('/wishlists', wishlistRouter);
app.use('/admin', adminRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server up on port ${port}`));

module.exports = app;