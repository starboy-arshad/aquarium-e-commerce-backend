const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const upload = require('../middleware/upload');
const { protect, admin } = require('../middleware/auth');

// @desc    Fetch all categories with product count
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $project: {
          products: 0
        }
      }
    ]);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch single category
// @route   GET /api/categories/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (category) {
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), upload.uploadErrorHandler, async (req, res) => {
  try {
    console.log('POST /api/categories - req.body:', req.body);
    console.log('POST /api/categories - req.file:', req.file);
    console.log("Category post api")
    const { name, description } = req.body;
    const image = req.file ? req.file.filename : null;

    console.log('Creating category with:', { name, description, image });

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        message: `Missing required fields: ${!name ? 'name ' : ''}${!description ? 'description' : ''}`.trim()
      });
    }

    const category = new Category({
      name: name.trim(),
      description: description.trim(),
      image,
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.single('image'), upload.uploadErrorHandler, async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const category = await Category.findById(req.params.id);

    if (category) {
      category.name = name;
      category.description = description;
      if (image !== undefined) {
        category.image = image;
      }

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
