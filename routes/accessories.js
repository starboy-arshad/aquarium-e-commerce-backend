const express = require('express');
const router = express.Router();
const Accessory = require('../models/Accessory');
const Category = require('../models/Category');
const upload = require('../middleware/upload');

// @desc    Fetch all accessories
// @route   GET /api/accessories
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

    if (req.query.category) {
      const categories = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
      const categoryDocs = await Category.find({ name: { $in: categories } }).select('_id');
      const categoryIds = categoryDocs.map(cat => cat._id);
      if (categoryIds.length > 0) {
        keyword.category = { $in: categoryIds };
      }
    }

    let sortOption = {};
    const sortBy = req.query.sortBy || 'popularity';

    switch (sortBy) {
      case 'date':
        sortOption = { createdAt: -1 };
        break;
      case 'popularity':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const count = await Accessory.countDocuments({ ...keyword });
    const accessories = await Accessory.find({ ...keyword })
      .populate('category', 'name')
      .sort(sortOption)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ accessories, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch all categories for accessories
// @route   GET /api/accessories/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Accessory.aggregate([
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
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          count: 1,
        },
      },
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch single accessory
// @route   GET /api/accessories/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const accessory = await Accessory.findById(req.params.id);

    if (accessory) {
      res.json(accessory);
    } else {
      res.status(404).json({ message: 'Accessory not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete an accessory
// @route   DELETE /api/accessories/:id
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
  try {
    const accessory = await Accessory.findByIdAndDelete(req.params.id);

    if (accessory) {
      res.json({ message: 'Accessory removed' });
    } else {
      res.status(404).json({ message: 'Accessory not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create an accessory
// @route   POST /api/accessories
// @access  Private/Admin
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, description, stock } = req.body;

    // Use default "Accessories" category
    let categoryDoc = await Category.findOne({ name: 'Accessories' });
    if (!categoryDoc) {
      categoryDoc = new Category({
        name: 'Accessories',
        description: 'Aquarium accessories and supplies'
      });
      await categoryDoc.save();
    }

    // Handle image uploads
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const accessory = new Accessory({
      name,
      price,
      description,
      images,
      category: categoryDoc._id,
      stock,
    });

    const createdAccessory = await accessory.save();
    res.status(201).json(createdAccessory);
  } catch (error) {
    console.error('Error creating accessory:', error);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update an accessory
// @route   PUT /api/accessories/:id
// @access  Private/Admin
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      category,
      stock,
    } = req.body;

    const accessory = await Accessory.findById(req.params.id);

    if (accessory) {
      accessory.name = name;
      accessory.price = price;
      accessory.description = description;
      accessory.category = category;
      accessory.stock = stock;

      // Handle image uploads if provided
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `/uploads/${file.filename}`);
        accessory.images = newImages;
      }

      const updatedAccessory = await accessory.save();
      res.json(updatedAccessory);
    } else {
      res.status(404).json({ message: 'Accessory not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
