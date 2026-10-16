const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./modules/product');
const User = require('./modules/user');

dotenv.config();

const API_URLS = [
  'https://dummyjson.com/products/category/womens-jewellery',
  'https://dummyjson.com/products/category/womens-bags',
  'https://dummyjson.com/products/category/womens-watches',
  'https://dummyjson.com/products/category/sunglasses',
  'https://dummyjson.com/products/category/mobile-accessories',
];

const seedProducts = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('MongoDB Connected');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin found');
      process.exit(1);
    }

    await Product.deleteMany({});
    console.log('Old products deleted');

    let totalCount = 0;

    for (const url of API_URLS) {
      console.log(`\nFetching from: ${url}`);
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Got ${data.products.length} products`);

      for (const item of data.products) {
        const product = new Product({
          name: item.title,
          description: item.description,
          price: item.price,
          stock: item.stock || 10,
          category: item.category.toLowerCase(),
          brand: item.brand || 'Luxury',
          images: [
            { public_id: `ext-${item.id}`, url: item.thumbnail },
            ...item.images.map((img, i) => ({
              public_id: `ext-${item.id}-${i}`,
              url: img,
            })),
          ],
          averageRating: item.rating || 0,
          createdBy: admin._id,
          featured: item.rating > 4.5,
        });

        await product.save();
        totalCount++;
        console.log(`[${totalCount}] ${product.name}`);
      }
    }

    console.log(`\nDone! ${totalCount} products imported`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedProducts();