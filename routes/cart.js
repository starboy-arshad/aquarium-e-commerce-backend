const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { protect } = require('../middleware/auth');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (cart) {
      res.json(cart);
    } else {
      res.json({ items: [] });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { productId, name, price, image, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: req.user._id,
        items: [{
          product: productId,
          name,
          price,
          image,
          quantity,
        }],
      });
    } else {
      // Check if item already exists in cart
      const existingItem = cart.items.find(item =>
        item.product.toString() === productId
      );

      if (existingItem) {
        // Update quantity
        existingItem.quantity += quantity;
      } else {
        // Add new item
        cart.items.push({
          product: productId,
          name,
          price,
          image,
          quantity,
        });
      }
    }

    const savedCart = await cart.save();
    await savedCart.populate('items.product');
    res.status(201).json(savedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
router.put('/:productId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const itemIndex = cart.items.findIndex(item =>
      item.product.toString() === req.params.productId
    );

    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item not found in cart' });
      return;
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    const savedCart = await cart.save();
    await savedCart.populate('items.product');
    res.json(savedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    cart.items = cart.items.filter(item =>
      item.product.toString() !== req.params.productId
    );

    const savedCart = await cart.save();
    await savedCart.populate('items.product');
    res.json(savedCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
