const express = require('express');
const router = express.Router();
const FullMarineSetup = require('../models/FullMarineSetup');

// @desc    Fetch all full marine setup products
// @route   GET /api/full-marine-setup
// @access  Public
router.get('/', async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: 'i',
          },
        }
      : {};

    const sortOption = req.query.sortBy === 'rating' ? { rating: -1 } : { createdAt: -1 };

    const count = await FullMarineSetup.countDocuments({ ...keyword });
    const products = await FullMarineSetup.find({ ...keyword })
      .sort(sortOption)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch single full marine setup product
// @route   GET /api/full-marine-setup/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await FullMarineSetup.findById(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching full marine setup product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete a full marine setup product
// @route   DELETE /api/full-marine-setup/:id
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
  try {
    const product = await FullMarineSetup.findByIdAndDelete(req.params.id);

    if (product) {
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a full marine setup product
// @route   POST /api/full-marine-setup
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const { name, price, description, image, stock } = req.body;

    const product = new FullMarineSetup({
      name,
      price,
      description,
      image,
      stock,
      numReviews: 0,
      rating: 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a full marine setup product
// @route   PUT /api/full-marine-setup/:id
// @access  Private/Admin
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      image,
      stock,
    } = req.body;

    const product = await FullMarineSetup.findById(req.params.id);

    if (product) {
      product.name = name;
      product.price = price;
      product.description = description;
      product.image = image;
      product.stock = stock;

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
// @route   POST /api/full-marine-setup/:id/reviews
// @access  Private
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await FullMarineSetup.findById(req.params.id);

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

// @desc    Get top rated full marine setup products
// @route   GET /api/full-marine-setup/top
// @access  Public
router.get('/top', async (req, res) => {
  try {
    const products = await FullMarineSetup.find({}).sort({ rating: -1 }).limit(3);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
