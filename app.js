const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/mongoose'); // بنستدعي دالة الاتصال

const app = express();

app.use(cors());
app.use(express.json());

// دالة بتشغل الروتس بعد ما نتأكد إن الداتابيز اتصلت
const startServer = async () => {
  await connectDB(); // بنستنى الاتصال يخلص

  // بنشغل الروتس بعد ما الاتصال يخلص
  const userRouter = require('./routers/user');
  const productRouter = require('./routers/product');
  const cartRouter = require('./routers/cart');
  const orderRouter = require('./routers/order');
  const wishlistRouter = require('./routers/wishlist');
  const adminRouter = require('./routers/admin');

  app.use(userRouter);
  app.use(productRouter);
  app.use(cartRouter);
  app.use(orderRouter);
  app.use(wishlistRouter);
  app.use(adminRouter);

  // لو إحنا شغالين على جهازك (مش Vercel)، بنفتح البورت
  if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server is up on port ${port}`);
    });
  }
};

startServer();

// تصدير الـ app لـ Vercel
module.exports = app;