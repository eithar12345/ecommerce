const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String,
  image: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    coupon: {
      code: String,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
      discountValue: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== Virtuals ====================

// Subtotal: sum of (price × quantity)
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

// Discount Amount
cartSchema.virtual('discountAmount').get(function () {
  if (!this.coupon || !this.coupon.code) return 0;
  const subtotal = this.subtotal;
  if (this.coupon.discountType === 'percentage') {
    return (subtotal * this.coupon.discountValue) / 100;
  }
  return this.coupon.discountValue;
});

// Total
cartSchema.virtual('total').get(function () {
  return this.subtotal - this.discountAmount;
});

// Item Count
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;