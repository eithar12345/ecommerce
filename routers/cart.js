const express = require('express');
const Cart = require('../modules/cart');
const Product = require('../modules/product');
const auth = require('../middleware/auth');
const router = new express.Router();

// ==================== الكوبونات المتاحة ====================
const COUPONS = {
  SAVE10: { discountType: 'percentage', discountValue: 10 },
  SAVE20: { discountType: 'percentage', discountValue: 20 },
  SAVE50: { discountType: 'percentage', discountValue: 50 },
  OFF50: { discountType: 'fixed', discountValue: 50 },
};

// ==================== Helper: get or create cart ====================
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
    await cart.save();
  }
  return cart;
};

// ==================== Get My Cart ====================
router.get('/carts', auth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Add Item to Cart ====================
router.post('/carts/items', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).send({ error: 'Not enough stock' });
    }

    const cart = await getOrCreateCart(req.user._id);

    // لو المنتج موجود في السلة → زوّد الكمية
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      if (product.stock < existingItem.quantity + quantity) {
        return res.status(400).send({ error: 'Not enough stock' });
      }
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || '',
        price: product.price,
        quantity,
      });
    }

    // خصم من المخزون
    product.stock -= quantity;
    await product.save();
    await cart.save();

    res.status(201).send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Update Item Quantity ====================
router.patch('/carts/items', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).send({ error: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );
    if (!item) {
      return res.status(404).send({ error: 'Item not in cart' });
    }

    const product = await Product.findById(productId);
    const difference = quantity - item.quantity;

    // لو بنزوّد → تأكد من المخزون
    if (difference > 0 && product.stock < difference) {
      return res.status(400).send({ error: 'Not enough stock' });
    }

    // عدّل المخزون
    product.stock -= difference;
    await product.save();

    // عدّل الكمية
    item.quantity = quantity;
    await cart.save();

    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Remove Item ====================
router.delete('/carts/items/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === req.params.productId
    );
    if (!item) {
      return res.status(404).send({ error: 'Item not in cart' });
    }

    // رجّع المخزون
    const product = await Product.findById(req.params.productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }

    // شيل من السلة
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.params.productId
    );
    await cart.save();

    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Apply Coupon ====================
router.post('/carts/coupon', auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !COUPONS[code.toUpperCase()]) {
      return res.status(400).send({ error: 'Invalid coupon code' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    cart.coupon = {
      code: code.toUpperCase(),
      ...COUPONS[code.toUpperCase()],
    };

    await cart.save();
    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Remove Coupon ====================
router.delete('/carts/coupon', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    cart.coupon = undefined;
    await cart.save();
    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Clear Cart ====================
router.delete('/carts/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    // رجّع المخزون
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    cart.items = [];
    cart.coupon = undefined;
    await cart.save();

    res.send(cart);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;