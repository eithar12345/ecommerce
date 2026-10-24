const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/mongoose');

const app = express();

app.use(cors());
app.use(express.json());

// استدعاء الروتس (على طول من غير ما نحطها جوه دالة)
const userRouter = require('./routers/user');
const productRouter = require('./routers/product');
const cartRouter = require('./routers/cart');
const orderRouter = require('./routers/order');
const wishlistRouter = require('./routers/wishlist');
const adminRouter = require('./routers/admin');

// ربط الروتس
app.use('/users', userRouter); 
app.use('/', productRouter); 
app.use('/carts', cartRouter);
app.use('/orders', orderRouter);
app.use('/wishlists', wishlistRouter);
app.use('/admin', adminRouter);

// تشغيل السيرفر (هيشتغل على جهازك بس)
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server up on port ${port}`));
}

// لـ Vercel:
// بنصدر الـ app، وبنخلي Vercel ينادي connectDB الأول قبل أي طلب
module.exports = async (req, res) => {
  await connectDB(); // بنستنى الاتصال هنا
  return app(req, res); // بعدها بنبعت الطلب للـ app
};