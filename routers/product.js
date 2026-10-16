const express = require('express');
const Product = require('../modules/product');
const auth = require('../middleware/auth');
const router = new express.Router();

// ==================== Public Routes ====================

// Get All Products (with filters)
router.get('/products', async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    else if (sort === 'price_desc') sortOption.price = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    else if (sort === 'rating') sortOption.averageRating = -1;

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.send({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Get Single Product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'createdBy',
      'name'
    );
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }
    res.send(product);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Search Products
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const products = await Product.find({
      $text: { $search: q },
      isActive: true,
    });
    res.send(products);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Admin Routes ====================

// Create Product (Admin only)
router.post('/products', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Admin only.' });
    }

    const product = new Product({
      ...req.body,
      createdBy: req.user._id,
    });

    await product.save();
    res.status(201).send(product);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Update Product (Admin only)
router.patch('/products/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Admin only.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    Object.keys(req.body).forEach((key) => {
      product[key] = req.body[key];
    });

    await product.save();
    res.send(product);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Delete Product (Admin only)
router.delete('/products/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Admin only.' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    res.send({ message: 'Product deleted successfully', product });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ==================== Reviews ====================

// Add Review
router.post('/products/:id/reviews', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).send({ error: 'Product already reviewed' });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(req.body.rating),
      comment: req.body.comment,
    };

    product.reviews.push(review);
    product.calcAverageRating();
    await product.save();

    res.status(201).send(product);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Get Reviews
router.get('/products/:id/reviews', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }
    res.send(product.reviews);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Delete Review
router.delete('/products/:id/reviews/:reviewId', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).send({ error: 'Review not found' });
    }

    // Only owner or admin
    if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).send({ error: 'Not authorized' });
    }

    product.reviews.pull(req.params.reviewId);
    product.calcAverageRating();
    await product.save();

    res.send(product);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;