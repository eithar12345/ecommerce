const express = require('express');
const Order = require('../modules/order');
const Product = require('../modules/product');
const User = require('../modules/user');
const auth = require('../middleware/auth');
const router = new express.Router();

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send({ error: 'Access denied. Admin only.' });
  }
  next();
};

// ==================== Dashboard Stats ====================
router.get('/admin/dashboard', auth, adminOnly, async (req, res) => {
  try {
    // Run queries in parallel
    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      ordersByStatus,
      topProducts,
      dailyRevenue,
      recentOrders,
    ] = await Promise.all([
      // 1. Total revenue
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // 2. Total orders
      Order.countDocuments(),

      // 3. Total customers
      User.countDocuments({ role: 'customer' }),

      // 4. Total products
      Product.countDocuments({ isActive: true }),

      // 5. Orders by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 6. Top 5 products
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            totalSold: { $sum: '$items.quantity' },
            revenue: {
              $sum: { $multiply: ['$items.price', '$items.quantity'] },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),

      // 7. Daily revenue — last 7 days
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 8. Recent 5 orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email'),
    ]);

    res.send({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      totalCustomers,
      totalProducts,
      ordersByStatus,
      topProducts,
      dailyRevenue,
      recentOrders,
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Get All Orders (Admin) ====================
router.get('/admin/orders', auth, adminOnly, async (req, res) => {
  try {
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

// ==================== Get All Users (Admin) ====================
router.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments();

    res.send({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Get All Carts (Admin) ====================
router.get('/admin/carts', auth, adminOnly, async (req, res) => {
  try {
    const Cart = require('../modules/cart');
    const carts = await Cart.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price images');
    res.send(carts);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Get All Wishlists (Admin) ====================
router.get('/admin/wishlists', auth, adminOnly, async (req, res) => {
  try {
    const Wishlist = require('../modules/wishlist');
    const wishlists = await Wishlist.find().populate('user', 'name email');
    res.send(wishlists);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;