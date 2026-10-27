const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// الروتس
const userRouter = require('./routers/user');
const productRouter = require('./routers/product');
const cartRouter = require('./routers/cart');
const orderRouter = require('./routers/order');
const wishlistRouter = require('./routers/wishlist');
const adminRouter = require('./routers/admin');

app.use('/', userRouter); 
app.use('/', productRouter); 
app.use('/', cartRouter);
app.use('/', orderRouter);
app.use('/', wishlistRouter);
app.use('/', adminRouter);

// بنشغل الداتابيز قبل أي حاجة
connectDB();

// في Vercel، بنصدر الـ app (عشان يشتغل كـ Serverless)
module.exports = app;

// للتشغيل المحلي بس
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server up on port ${port}`));
}