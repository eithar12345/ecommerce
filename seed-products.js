const mongoose = require('mongoose');
const Product = require('./modules/product');
const User = require('./modules/user');

const API_URLS = [
  'https://dummyjson.com/products/category/womens-jewellery',
  'https://dummyjson.com/products/category/womens-bags',
  'https://dummyjson.com/products/category/womens-watches',
  'https://dummyjson.com/products/category/sunglasses',
  'https://dummyjson.com/products/category/mobile-accessories',
];

const seedProducts = async () => {
  try {
    // 1. الاتصال بالداتابيز
    await mongoose.connect('mongodb://eitharahmedali2005_db_user:eitharahmedali2005@ac-rwqyodd-shard-00-00.dgjlna3.mongodb.net:27017,ac-rwqyodd-shard-00-01.dgjlna3.mongodb.net:27017,ac-rwqyodd-shard-00-02.dgjlna3.mongodb.net:27017/ecommerce?ssl=true&replicaSet=atlas-10ddww-shard-0&authSource=admin&retryWrites=true&w=majority&family=4');
    console.log('✅ MongoDB Connected to Atlas');

    // 2. البحث عن أدمن، ولو مش موجود نعمل واحد أوتوماتيك
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('⚠️ No admin found. Creating a default admin...');
      admin = new User({
        name: 'Admin Store',
        username: 'Admin',             
        email: 'admin@store.com',
        password: 'Admin@12345',       
        role: 'admin',
        isVerified: true,
        city: 'Cairo',                 // <--- ضفنا دي عشان الخطأ اللي ظهر
        addresses: [                   
          {
            city: 'Cairo',
            address: 'Main Street',
            phone: '01000000000',
            postalCode: '12345',
            country: 'Egypt'
          }
        ]
      });
      await admin.save();
      console.log('👑 Admin created: admin@store.com | Admin@12345');
    }

    // 3. مسح المنتجات القديمة
    await Product.deleteMany({});
    console.log('🗑️ Old products deleted');

    let totalCount = 0;

    // 4. جلب المنتجات من الـ APIs وحفظها
    for (const url of API_URLS) {
      console.log(`\nFetching from: ${url}`);
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Got ${data.products.length} products`);

      for (const item of data.products) {
        const product = new Product({
          name: item.title,
          description: item.description,
          shortDescription: item.description ? item.description.substring(0, 50) + '...' : 'No description', 
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
          isActive: true,
        });

        await product.save();
        totalCount++;
        console.log(`[${totalCount}] ${product.name}`);
      }
    }

    console.log(`\n🎉 Done! ${totalCount} products imported successfully`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedProducts();