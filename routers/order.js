const express = require('express');
const mongoose = require('mongoose');
const Order = require('../modules/order');
const Cart = require('../modules/cart');
const Product = require('../modules/product');
const auth = require('../middleware/auth');
const stripe = require('../config/stripe');
const sendEmail = require('../utils/sendEmail');   // ← جديد
const router = new express.Router();

// ==================== Create Order ====================
router.post('/orders', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shippingAddress, paymentMethod = 'cash' } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Not enough stock for ${item.name}`);
      }
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
    }));

    const subtotal = cart.subtotal;
    const discount = cart.discountAmount;
    const shippingFee = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.14;
    const totalPrice = subtotal + shippingFee + tax - discount;

    const [order] = await Order.create(
      [
        {
          user: req.user._id,
          items: orderItems,
          shippingAddress,
          paymentMethod,
          paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
          subtotal,
          shippingFee,
          tax,
          discount,
          totalPrice,
        },
      ],
      { session }
    );

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();

    // Send confirmation email (after successful commit)
    await sendEmail({
      to: req.user.email,
      subject: 'Order Confirmation',
      html: `
        <h2>Thank you for your order!</h2>
        <p>Order ID: ${order._id}</p>
        <p>Total: ${order.totalPrice} EGP</p>
        <p>Status: ${order.status}</p>
        <p>We'll notify you when your order ships.</p>
      `,
    });

    res.status(201).send(order);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).send({ error: e.message });
  } finally {
    session.endSession();
  }
});

// ==================== Get My Orders ====================
router.get('/orders/my', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.send({
      orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Get Order By ID ====================
router.get('/orders/my/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }
    res.send(order);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Cancel Order ====================
router.patch('/orders/my/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).send({ error: 'Cannot cancel this order' });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    res.send(order);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Admin: Get All Orders ====================
router.get('/orders/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Admin only.' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.send({
      orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Admin: Update Order Status ====================
router.patch('/orders/admin/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Admin only.' });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    order.status = status;
    if (status === 'delivered') order.deliveredAt = new Date();
    if (status === 'cancelled') order.cancelledAt = new Date();

    await order.save();

    // Send status update email
    await sendEmail({
      to: req.user.email,
      subject: `Order Status Updated: ${status}`,
      html: `
        <h2>Your order status has been updated</h2>
        <p>Order ID: ${order._id}</p>
        <p>New Status: <strong>${status}</strong></p>
      `,
    });

    res.send(order);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Stripe Payment Intent ====================
router.post('/orders/create-payment-intent', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).send({ error: 'Cart is empty' });
    }

    const total = cart.total;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'egp',
      metadata: { userId: req.user._id.toString() },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      amount: total,
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;