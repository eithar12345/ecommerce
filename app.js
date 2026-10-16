const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db/mongoose');

const userRouter = require('./routers/user');
const productRouter = require('./routers/product');
const cartRouter = require('./routers/cart');
const orderRouter = require('./routers/order');
const wishlistRouter = require('./routers/wishlist');
const adminRouter = require('./routers/admin');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(userRouter);
app.use(productRouter);
app.use(cartRouter);
app.use(orderRouter);
app.use(wishlistRouter);
app.use(adminRouter);

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});