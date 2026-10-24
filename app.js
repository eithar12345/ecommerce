const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db/mongoose'); // شغل الاتصال بالداتابيز

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

// ربط الروتس بالمسارات (تم تعديل userRouter ليكون /)
app.use('/', userRouter); 
app.use('/', productRouter); 
app.use('/carts', cartRouter);
app.use('/orders', orderRouter);
app.use('/wishlists', wishlistRouter);
app.use('/admin', adminRouter);

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server up on port ${port}`);
});

// تصدير الـ app لـ Vercel
module.exports = app;