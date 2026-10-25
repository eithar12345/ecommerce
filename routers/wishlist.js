const express = require('express');
const Wishlist = require('../modules/wishlist');
const Product = require('../modules/product');
const auth = require('../middleware/auth');
const router = new express.Router();

// Helper: get or create wishlist
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [] });
    await wishlist.save();
  }
  return wishlist;
};

// ==================== Get My Wishlist ====================
router.get('/wishlists/my', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    if (!wishlist) {
      return res.send({ products: [] });
    }
    res.send(wishlist);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Add Product ====================
router.post('/wishlists/add/:productId', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    const wishlist = await getOrCreateWishlist(req.user._id);

    if (wishlist.products.includes(req.params.productId)) {
      return res.status(400).send({ error: 'Already in wishlist' });
    }

    wishlist.products.push(req.params.productId);
    await wishlist.save();

    const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    res.status(201).send(updatedWishlist);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Remove Product ====================
router.delete('/wishlists/remove/:productId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).send({ error: 'Wishlist not found' });
    }

    const productId = req.params.productId;
    
    // بنفلتر المنتجات وبنشيل اللي إحنا عايزين نمسحه
    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== productId
    );
    await wishlist.save();

    // بنرجع البيانات المحدثة عشان الفرونت إند يحدث
    const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    res.send(updatedWishlist);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Clear All ====================
router.delete('/wishlists/clear', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).send({ error: 'Wishlist not found' });
    }

    wishlist.products = [];
    await wishlist.save();

    res.send(wishlist);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;