const mongoose = require('mongoose');

mongoose
  .connect('mongodb://localhost:27017/ecommerce')
  .then(() => console.log(' MongoDB Connected'))
  .catch((err) => console.error(' MongoDB Error:', err.message));