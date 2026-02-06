const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    let matchConditions = {};

    if (req.query.keyword) {
      // Use aggregation for keyword search to include category names
      const aggregationPipeline = [
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: '$categoryInfo'
        },
        {
          $match: {
            $or: [
              { name: { $regex: req.query.keyword, $options: 'i' } },
              { 'categoryInfo.name': { $regex: req.query.keyword, $options: 'i' } }
            ]
          }
        }
      ];

      if (req.query.category) {
        const categories = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
        const categoryDocs = await Category.find({ name: { $in: categories } }).select('_id');
        const categoryIds = categoryDocs.map(cat => cat._id);
        if (categoryIds.length > 0) {
          aggregationPipeline.push({
            $match: { category: { $in: categoryIds } }
          });
        }
      }

      if (req.query.minPrice || req.query.maxPrice) {
        let priceMatch = {};
        if (req.query.minPrice) {
          priceMatch.$gte = Number(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          priceMatch.$lte = Number(req.query.maxPrice);
        }
        aggregationPipeline.push({
          $match: { price: priceMatch }
        });
      }

      let sortOption = {};
      const sortBy = req.query.sortBy || 'popularity';

      switch (sortBy) {
        case 'rating':
          sortOption = { rating: -1 };
          break;
        case 'date':
          sortOption = { createdAt: -1 };
          break;
        case 'popularity':
        default:
          sortOption = { numReviews: -1 };
          break;
      }

      aggregationPipeline.push(
        { $sort: sortOption },
        { $skip: pageSize * (page - 1) },
        { $limit: pageSize },
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            description: 1,
            image: 1,
            category: '$categoryInfo',
            stock: 1,
            numReviews: 1,
            rating: 1,
            createdAt: 1
          }
        }
      );

      const countPipeline = [
        ...aggregationPipeline.slice(0, -3), // Remove sort, skip, limit, project
        { $count: "total" }
      ];

      const [productsResult, countResult] = await Promise.all([
        Product.aggregate(aggregationPipeline),
        Product.aggregate(countPipeline)
      ]);

      const totalCount = countResult[0]?.total || 0;
      const products = productsResult;

      res.json({ products, page, pages: Math.ceil(totalCount / pageSize) });
    } else {
      // No keyword, use regular query
      if (req.query.category) {
        const categories = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
        const categoryDocs = await Category.find({ name: { $in: categories } }).select('_id');
        const categoryIds = categoryDocs.map(cat => cat._id);
        if (categoryIds.length > 0) {
          matchConditions.category = { $in: categoryIds };
        }
      }

      if (req.query.minPrice || req.query.maxPrice) {
        matchConditions.price = {};
        if (req.query.minPrice) {
          matchConditions.price.$gte = Number(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          matchConditions.price.$lte = Number(req.query.maxPrice);
        }
      }

      let sortOption = {};
      const sortBy = req.query.sortBy || 'popularity';

      switch (sortBy) {
        case 'rating':
          sortOption = { rating: -1 };
          break;
        case 'date':
          sortOption = { createdAt: -1 };
          break;
        case 'popularity':
        default:
          sortOption = { numReviews: -1 };
          break;
      }

      const count = await Product.countDocuments(matchConditions);
      const products = await Product.find(matchConditions)
        .populate('category', 'name')
        .sort(sortOption)
        .limit(pageSize)
        .skip(pageSize * (page - 1));

      res.json({ products, page, pages: Math.ceil(count / pageSize) });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch all categories
// @route   GET /api/products/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $group: {
          _id: '$category',
          name: { $first: '$categoryInfo.name' },
          image: { $first: '$categoryInfo.image' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          count: 1,
        },
      },
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (product) {
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, description, category, stock, additionalInfo } = req.body;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    // Get file paths for uploaded images
    const imagePaths = req.files.map(file => `/uploads/${file.filename}`);

    // Check if category is ObjectId or name
    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await Category.findById(category);
    } else {
      categoryDoc = await Category.findOne({ name: category });
      if (!categoryDoc) {
        categoryDoc = new Category({
          name: category,
          description: `Category for ${category}`,
        });
        await categoryDoc.save();
      }
    }

    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const product = new Product({
      name,
      price,
      description,
      images: imagePaths,
      category: categoryDoc._id,
      stock,
      additionalInfo: additionalInfo || '',
      numReviews: 0,
      rating: 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      category,
      stock,
      additionalInfo,
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name;
      product.price = price;
      product.description = description;
      product.category = category;
      product.stock = stock;
      product.additionalInfo = additionalInfo || '';

      // If new images were uploaded, update the images array
      if (req.files && req.files.length > 0) {
        const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
        product.images = imagePaths;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        res.status(400).json({ message: 'Product already reviewed' });
        return;
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);

      product.numReviews = product.reviews.length;

      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
router.get('/top', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ rating: -1 }).limit(3);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
