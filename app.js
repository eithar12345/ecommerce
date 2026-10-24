const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db/mongoose'); // هنا بنشغل الاتصال (لأنه بينفذ connectDB جواه)

const app = express();

app.use(cors());
app.use(express.json());

// استدعاء الروتس
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

// تشغيل السيرفر محلياً
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server up on port ${port}`));
}

module.exports = app;