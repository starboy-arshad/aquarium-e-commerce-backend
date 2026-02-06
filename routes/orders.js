const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    }

    // Calculate subtotal from order items if not provided
    let calculatedItemsPrice = itemsPrice;
    if (!itemsPrice || itemsPrice === 0) {
      calculatedItemsPrice = orderItems.reduce((total, item) => {
        const itemTotal = (item.price || 0) * (item.qty || 0);
        console.log('Calculating item:', item.name, 'Price:', item.price, 'Qty:', item.qty, 'Total:', itemTotal);
        return total + itemTotal;
      }, 0);
      console.log('Calculated subtotal:', calculatedItemsPrice);
    }

    // Calculate total if not provided
    let calculatedTotalPrice = totalPrice;
    if (!totalPrice || totalPrice === 0) {
      calculatedTotalPrice = calculatedItemsPrice + (shippingPrice || 0);
    }

    const order = new Order({
      orderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice: calculatedItemsPrice,
      taxPrice: taxPrice || 0,
      shippingPrice: shippingPrice || 0,
      totalPrice: calculatedTotalPrice,
    });

    const createdOrder = await order.save();

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    console.log('Fetching order with ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (order) {
      console.log('Order found:', order._id);
      console.log('Order user:', order.user);
      console.log('Is admin:', req.user.isAdmin);
      
      // Check if the order belongs to the current user (unless admin)
      // Handle case where populate might fail and user is null
      if (!order.user) {
        console.log('Warning: Order user is null after populate');
        return res.status(500).json({ 
          message: 'Server error while fetching order',
          error: 'Order user data is missing'
        });
      }
      
      if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error while fetching order',
      error: error.message 
    });
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.payer.email_address,
      };

      const updatedOrder = await order.save();

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
router.put('/:id/deliver', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = 'delivered';

      const updatedOrder = await order.save();

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      
      // Update isDelivered based on status
      if (status === 'delivered') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      } else if (status === 'pending' || status === 'confirmed') {
        order.isDelivered = false;
        order.deliveredAt = undefined;
      }

      const updatedOrder = await order.save();

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
