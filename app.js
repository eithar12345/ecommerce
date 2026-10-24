const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/mongoose');

const app = express();

app.use(cors());
app.use(express.json());

const startServer = async () => {
  await connectDB();

  // استدعاء الراوترز
  const userRouter = require('./routers/user');
  const productRouter = require('./routers/product');
  const cartRouter = require('./routers/cart');
  const orderRouter = require('./routers/order');
  const wishlistRouter = require('./routers/wishlist');
  const adminRouter = require('./routers/admin');

  // ربط الراوترز بالمسارات
  app.use('/users', userRouter); 
  app.use('/', productRouter); // <--- التعديل هنا (شيلنا /products)
  app.use('/carts', cartRouter);
  app.use('/orders', orderRouter);
  app.use('/wishlists', wishlistRouter);
  app.use('/admin', adminRouter);

  // تشغيل السيرفر محلياً
  if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server up on port ${port}`));
  }
};

startServer();
module.exports = app;