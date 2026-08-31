const jsonServer = require('json-server');
const cors = require('cors');
const express = require('express');
const path = require('path');

const app = express();
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 10000;

// Middlewares
server.use(cors());
server.use(middlewares);
server.use(jsonServer.bodyParser);

// =====================================================
// 🔵 USERS CRUD ENDPOINTS
// =====================================================

/**
 * GET /users - Get all users
 * GET /users?id=1 - Get specific user
 * POST /users - Create new user
 * PUT /users/:userId - Update user
 * DELETE /users/:userId - Delete user
 */

server.get('/users', (req, res) => {
  const db = router.db;
  const users = db.get('users').value();
  res.jsonp(users);
});

server.get('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const user = db.get('users').find({ id: userId }).value();
  
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }
  res.jsonp(user);
});

server.post('/users', (req, res) => {
  const db = router.db;
  const users = db.get('users').value();
  
  const newUser = {
    id: Math.max(...users.map(u => u.id), 0) + 1,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone || '',
    profilePic: req.body.profilePic || 'https://i.pravatar.cc/150?img=1',
    address: req.body.address || '',
    totalPoints: req.body.totalPoints || 0,
    bins: req.body.bins || [],
    pickups: req.body.pickups || [],
    locations: req.body.locations || [],
    impact: req.body.impact || {
      totalItemsRecycled: 0, co2SavedKg: 0, waterSavedLiters: 0,
      energySavedKwh: 0, ranking: 0, treesEquivalent: 0
    },
    badges: req.body.badges || [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  db.get('users').push(newUser).write();
  res.status(201).jsonp(newUser);
});

server.put('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  
  const user = db.get('users').find({ id: userId }).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  const updatedUser = db.get('users')
    .find({ id: userId })
    .assign({
      ...req.body,
      lastActive: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedUser);
});

server.delete('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  
  const user = db.get('users').find({ id: userId }).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  db.get('users').remove({ id: userId }).write();
  res.jsonp({ message: `User ${userId} deleted successfully` });
});

// =====================================================
// 🚗 PICKERS CRUD ENDPOINTS
// =====================================================

server.get('/pickers', (req, res) => {
  const db = router.db;
  const pickers = db.get('pickers').value();
  res.jsonp(pickers);
});

server.get('/pickers/:pickerId', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);
  const picker = db.get('pickers').find({ id: pickerId }).value();
  
  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }
  res.jsonp(picker);
});

server.post('/pickers', (req, res) => {
  const db = router.db;
  const pickers = db.get('pickers').value();
  
  const newPicker = {
    id: Math.max(...pickers.map(p => p.id), 0) + 1,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone || '',
    profilePic: req.body.profilePic || 'https://i.pravatar.cc/150?img=1',
    vehicleType: req.body.vehicleType || 'Van',
    vehiclePlate: req.body.vehiclePlate || '',
    status: req.body.status || 'active',
    rating: req.body.rating || 0,
    totalReviews: req.body.totalReviews || 0,
    activePickups: req.body.activePickups || [],
    completedPickups: req.body.completedPickups || [],
    cancelledPickups: req.body.cancelledPickups || [],
    pickerLocation: req.body.pickerLocation || { lat: 0, lng: 0, label: 'Unknown' },
    workingHours: req.body.workingHours || { start: '08:00', end: '18:00' },
    totalEarnings: req.body.totalEarnings || 0,
    monthlyEarnings: req.body.monthlyEarnings || 0,
    completedPickupsCount: req.body.completedPickupsCount || 0,
    badges: req.body.badges || [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  db.get('pickers').push(newPicker).write();
  res.status(201).jsonp(newPicker);
});

server.put('/pickers/:pickerId', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);
  
  const picker = db.get('pickers').find({ id: pickerId }).value();
  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }

  const updatedPicker = db.get('pickers')
    .find({ id: pickerId })
    .assign({
      ...req.body,
      lastActive: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedPicker);
});

server.delete('/pickers/:pickerId', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);
  
  const picker = db.get('pickers').find({ id: pickerId }).value();
  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }

  db.get('pickers').remove({ id: pickerId }).write();
  res.jsonp({ message: `Picker ${pickerId} deleted successfully` });
});

// =====================================================
// 🗑️ BINS CRUD ENDPOINTS
// =====================================================

server.get('/bins', (req, res) => {
  const db = router.db;
  let bins = db.get('bins').value();
  
  const { userId, type, status } = req.query;
  if (userId) bins = bins.filter(b => b.userId === parseInt(userId));
  if (type) bins = bins.filter(b => b.type.toLowerCase() === type.toLowerCase());
  if (status) bins = bins.filter(b => b.status === status);
  
  res.jsonp(bins);
});

server.get('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = parseInt(req.params.binId);
  const bin = db.get('bins').find({ id: binId }).value();
  
  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }
  res.jsonp(bin);
});

server.post('/bins', (req, res) => {
  const db = router.db;
  const bins = db.get('bins').value();
  
  const newBin = {
    id: Math.max(...bins.map(b => b.id), 0) + 1,
    userId: req.body.userId,
    type: req.body.type || 'plastic',
    capacityKg: req.body.capacityKg || 50,
    currentWeightKg: req.body.currentWeightKg || 0,
    fillPercent: req.body.fillPercent || 0,
    status: req.body.status || 'not_ready',
    location: req.body.location || { lat: 0, lng: 0, address: '' },
    qrCode: `BIN-${req.body.type?.toUpperCase() || 'PLASTIC'}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    lastEmptied: req.body.lastEmptied || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    installDate: new Date().toISOString()
  };

  db.get('bins').push(newBin).write();
  res.status(201).jsonp(newBin);
});

server.put('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = parseInt(req.params.binId);
  
  const bin = db.get('bins').find({ id: binId }).value();
  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }

  const updatedBin = db.get('bins')
    .find({ id: binId })
    .assign({
      ...req.body,
      lastUpdated: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedBin);
});

server.delete('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = parseInt(req.params.binId);
  
  const bin = db.get('bins').find({ id: binId }).value();
  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }

  db.get('bins').remove({ id: binId }).write();
  res.jsonp({ message: `Bin ${binId} deleted successfully` });
});

// =====================================================
// 📦 PICKUPS CRUD ENDPOINTS
// =====================================================

server.get('/pickups', (req, res) => {
  const db = router.db;
  let pickups = db.get('pickups').value();
  
  const { userId, pickerId, status } = req.query;
  if (userId) pickups = pickups.filter(p => p.userId === parseInt(userId));
  if (pickerId) pickups = pickups.filter(p => p.pickerId === parseInt(pickerId));
  if (status) pickups = pickups.filter(p => p.status === status);
  
  res.jsonp(pickups);
});

server.get('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);
  const pickup = db.get('pickups').find({ id: pickupId }).value();
  
  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }
  res.jsonp(pickup);
});

server.post('/pickups', (req, res) => {
  const db = router.db;
  const pickups = db.get('pickups').value();
  
  const newPickup = {
    id: Math.max(...pickups.map(p => p.id), 0) + 1,
    userId: req.body.userId,
    binId: req.body.binId,
    pickerId: req.body.pickerId || 0,
    status: req.body.status || 'pending',
    requestDate: new Date().toISOString(),
    scheduledDate: req.body.scheduledDate || new Date().toISOString().split('T')[0],
    scheduledTime: req.body.scheduledTime || '10:00:00',
    pickupDate: null,
    completionDate: null,
    binType: req.body.binType || 'plastic',
    estimatedWeight: req.body.estimatedWeight || 0,
    actualWeight: null,
    weightVerified: false,
    qrCode: `PICKUP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    location: req.body.location || '',
    pickupLocation: req.body.pickupLocation || { lat: 0, lng: 0 },
    notes: req.body.notes || null,
    rating: null,
    review: null,
    pointsAwarded: null,
    cancellationReason: null
  };

  db.get('pickups').push(newPickup).write();
  res.status(201).jsonp(newPickup);
});

server.put('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);
  
  const pickup = db.get('pickups').find({ id: pickupId }).value();
  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }

  const updatedPickup = db.get('pickups')
    .find({ id: pickupId })
    .assign(req.body)
    .write();

  res.jsonp(updatedPickup);
});

server.delete('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);
  
  const pickup = db.get('pickups').find({ id: pickupId }).value();
  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }

  db.get('pickups').remove({ id: pickupId }).write();
  res.jsonp({ message: `Pickup ${pickupId} deleted successfully` });
});

// Confirm pickup and award points
server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);

  const pickup = db.get('pickups').find({ id: pickupId }).value();
  if (!pickup) return res.status(404).jsonp({ message: 'Pickup not found' });

  // Update pickup
  db.get('pickups')
    .find({ id: pickupId })
    .assign({
      status: 'completed',
      actualWeight: req.body.weightKg || 0,
      weightVerified: true,
      completionDate: new Date().toISOString()
    })
    .write();

  // Award points to user
  const userId = pickup.userId;
  const user = db.get('users').find({ id: userId }).value();

  if (user) {
    const points = req.body.points || 25;
    const updatedPoints = (user.totalPoints || 0) + points;

    db.get('users').find({ id: userId }).assign({ totalPoints: updatedPoints }).write();

    db.get('pointsHistory')
      .push({
        id: Date.now(),
        userId,
        type: 'pickup_completed',
        points,
        source: `Pickup #${pickupId}`,
        description: `Recycled ${req.body.weightKg || 0}kg`,
        date: new Date().toISOString()
      })
      .write();
  }

  res.jsonp({ message: 'Pickup confirmed and points updated' });
});

// =====================================================
// 💰 POINTS HISTORY CRUD ENDPOINTS
// =====================================================

server.get('/points-history', (req, res) => {
  const db = router.db;
  let history = db.get('pointsHistory').value();
  
  const { userId } = req.query;
  if (userId) history = history.filter(h => h.userId === parseInt(userId));
  
  res.jsonp(history);
});

server.post('/points-history', (req, res) => {
  const db = router.db;
  const history = db.get('pointsHistory').value();
  
  const newEntry = {
    id: Math.max(...history.map(h => h.id), 0) + 1,
    userId: req.body.userId,
    type: req.body.type || 'pickup_completed',
    points: req.body.points || 0,
    source: req.body.source || '',
    description: req.body.description || '',
    date: new Date().toISOString()
  };

  db.get('pointsHistory').push(newEntry).write();
  res.status(201).jsonp(newEntry);
});

server.delete('/points-history/:historyId', (req, res) => {
  const db = router.db;
  const historyId = parseInt(req.params.historyId);
  
  const entry = db.get('pointsHistory').find({ id: historyId }).value();
  if (!entry) {
    return res.status(404).jsonp({ error: 'History entry not found' });
  }

  db.get('pointsHistory').remove({ id: historyId }).write();
  res.jsonp({ message: `History entry ${historyId} deleted successfully` });
});

// =====================================================
// 🎁 COUPONS CRUD ENDPOINTS
// =====================================================

server.get('/coupons', (req, res) => {
  const db = router.db;
  let coupons = db.get('coupons').value();
  
  const { active } = req.query;
  if (active !== undefined) coupons = coupons.filter(c => c.active === (active === 'true'));
  
  res.jsonp(coupons);
});

server.get('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = parseInt(req.params.couponId);
  const coupon = db.get('coupons').find({ id: couponId }).value();
  
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }
  res.jsonp(coupon);
});

server.post('/coupons', (req, res) => {
  const db = router.db;
  const coupons = db.get('coupons').value();
  
  const newCoupon = {
    id: Math.max(...coupons.map(c => c.id), 0) + 1,
    code: req.body.code,
    title: req.body.title,
    description: req.body.description || '',
    pointsRequired: req.body.pointsRequired || 100,
    discountType: req.body.discountType || 'percentage',
    discountValue: req.body.discountValue || 0,
    couponType: req.body.couponType || 'eco_reward',
    commercialMark: req.body.commercialMark || '',
    category: req.body.category || 'general',
    validFrom: req.body.validFrom || new Date().toISOString(),
    validUntil: req.body.validUntil || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    usageLimit: req.body.usageLimit || 1,
    usedCount: req.body.usedCount || 0,
    active: req.body.active !== undefined ? req.body.active : true
  };

  db.get('coupons').push(newCoupon).write();
  res.status(201).jsonp(newCoupon);
});

server.put('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = parseInt(req.params.couponId);
  
  const coupon = db.get('coupons').find({ id: couponId }).value();
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }

  const updatedCoupon = db.get('coupons')
    .find({ id: couponId })
    .assign(req.body)
    .write();

  res.jsonp(updatedCoupon);
});

server.delete('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = parseInt(req.params.couponId);
  
  const coupon = db.get('coupons').find({ id: couponId }).value();
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }

  db.get('coupons').remove({ id: couponId }).write();
  res.jsonp({ message: `Coupon ${couponId} deleted successfully` });
});

// =====================================================
// ⭐ REVIEWS CRUD ENDPOINTS
// =====================================================

server.get('/reviews', (req, res) => {
  const db = router.db;
  let reviews = db.get('reviews').value();
  
  const { pickupId, pickerId } = req.query;
  if (pickupId) reviews = reviews.filter(r => r.pickupId === parseInt(pickupId));
  if (pickerId) reviews = reviews.filter(r => r.pickerId === parseInt(pickerId));
  
  res.jsonp(reviews);
});

server.post('/reviews', (req, res) => {
  const db = router.db;
  const reviews = db.get('reviews').value();
  
  const newReview = {
    id: Math.max(...reviews.map(r => r.id), 0) + 1,
    pickupId: req.body.pickupId,
    userId: req.body.userId,
    pickerId: req.body.pickerId,
    rating: req.body.rating || 5,
    comment: req.body.comment || '',
    date: new Date().toISOString()
  };

  db.get('reviews').push(newReview).write();
  res.status(201).jsonp(newReview);
});

server.delete('/reviews/:reviewId', (req, res) => {
  const db = router.db;
  const reviewId = parseInt(req.params.reviewId);
  
  const review = db.get('reviews').find({ id: reviewId }).value();
  if (!review) {
    return res.status(404).jsonp({ error: 'Review not found' });
  }

  db.get('reviews').remove({ id: reviewId }).write();
  res.jsonp({ message: `Review ${reviewId} deleted successfully` });
});

// =====================================================
// 📢 NOTIFICATIONS CRUD ENDPOINTS
// =====================================================

server.get('/notifications', (req, res) => {
  const db = router.db;
  let notifications = db.get('notifications').value();
  
  const { userId, unread } = req.query;
  if (userId) notifications = notifications.filter(n => n.userId === parseInt(userId));
  if (unread !== undefined) notifications = notifications.filter(n => n.read === (unread === 'false'));
  
  res.jsonp(notifications);
});

server.post('/notifications', (req, res) => {
  const db = router.db;
  const notifications = db.get('notifications').value();
  
  const newNotification = {
    id: Math.max(...notifications.map(n => n.id), 0) + 1,
    userId: req.body.userId,
    type: req.body.type,
    title: req.body.title,
    message: req.body.message,
    read: req.body.read || false,
    createdAt: new Date().toISOString()
  };

  db.get('notifications').push(newNotification).write();
  res.status(201).jsonp(newNotification);
});

server.put('/notifications/:notificationId/read', (req, res) => {
  const db = router.db;
  const notificationId = parseInt(req.params.notificationId);
  
  const notification = db.get('notifications').find({ id: notificationId }).value();
  if (!notification) {
    return res.status(404).jsonp({ error: 'Notification not found' });
  }

  const updated = db.get('notifications')
    .find({ id: notificationId })
    .assign({ read: true })
    .write();

  res.jsonp(updated);
});

// =====================================================
// 🏆 PICKER PERFORMANCE ENDPOINTS
// =====================================================

server.get('/picker-performance', (req, res) => {
  const db = router.db;
  let performance = db.get('pickerPerformance').value();
  
  const { pickerId, month } = req.query;
  if (pickerId) performance = performance.filter(p => p.pickerId === parseInt(pickerId));
  if (month) performance = performance.filter(p => p.month === month);
  
  res.jsonp(performance);
});

server.get('/picker-performance/:pickerId/:month', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);
  const month = req.params.month;
  
  const perf = db.get('pickerPerformance')
    .find({ pickerId, month })
    .value();
  
  if (!perf) {
    return res.status(404).jsonp({ error: 'Performance data not found' });
  }
  
  res.jsonp(perf);
});

// =====================================================
// 🎯 PICKER GOALS ENDPOINTS
// =====================================================

server.get('/picker-goals', (req, res) => {
  const db = router.db;
  let goals = db.get('pickerGoals').value();
  
  const { pickerId, month, status } = req.query;
  if (pickerId) goals = goals.filter(g => g.pickerId === parseInt(pickerId));
  if (month) goals = goals.filter(g => g.month === month);
  if (status) goals = goals.filter(g => g.status === status);
  
  res.jsonp(goals);
});

server.get('/picker-goals/:goalId', (req, res) => {
  const db = router.db;
  const goalId = parseInt(req.params.goalId);
  const goal = db.get('pickerGoals').find({ id: goalId }).value();
  
  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }
  res.jsonp(goal);
});

server.post('/picker-goals', (req, res) => {
  const db = router.db;
  const goals = db.get('pickerGoals').value();
  
  const newGoal = {
    id: Math.max(...goals.map(g => g.id), 0) + 1,
    pickerId: req.body.pickerId,
    month: req.body.month,
    binType: req.body.binType || 'all',
    targetWeight: req.body.targetWeight || 0,
    currentWeight: req.body.currentWeight || 0,
    targetPickups: req.body.targetPickups || 0,
    currentPickups: req.body.currentPickups || 0,
    targetEarnings: req.body.targetEarnings || 0,
    currentEarnings: req.body.currentEarnings || 0,
    status: req.body.status || 'active',
    reward: req.body.reward || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('pickerGoals').push(newGoal).write();
  res.status(201).jsonp(newGoal);
});

server.put('/picker-goals/:goalId', (req, res) => {
  const db = router.db;
  const goalId = parseInt(req.params.goalId);
  
  const goal = db.get('pickerGoals').find({ id: goalId }).value();
  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }

  const updatedGoal = db.get('pickerGoals')
    .find({ id: goalId })
    .assign({
      ...req.body,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedGoal);
});

server.delete('/picker-goals/:goalId', (req, res) => {
  const db = router.db;
  const goalId = parseInt(req.params.goalId);
  
  const goal = db.get('pickerGoals').find({ id: goalId }).value();
  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }

  db.get('pickerGoals').remove({ id: goalId }).write();
  res.jsonp({ message: `Goal ${goalId} deleted successfully` });
});

// =====================================================
// 📊 LEADERBOARD ENDPOINTS
// =====================================================

server.get('/leaderboard', (req, res) => {
  const db = router.db;
  const leaderboard = db.get('leaderboard').value();
  res.jsonp(leaderboard);
});

// =====================================================
// 🔐 AUTH ENDPOINTS
// =====================================================

server.post('/auth/login', (req, res) => {
  const db = router.db;
  const { email, password, role } = req.body;

  let user;
  if (role === 'picker') {
    user = db.get('pickers').find({ email, password }).value();
  } else {
    user = db.get('users').find({ email, password }).value();
  }

  if (!user) {
    return res.status(401).jsonp({ error: 'Invalid credentials' });
  }

  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  
  res.jsonp({
    accessToken: token,
    refreshToken: token,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: role || 'user',
    expiresIn: 3600
  });
});

server.post('/auth/register', (req, res) => {
  const db = router.db;
  const { name, email, password, phone, role } = req.body;

  if (role === 'picker') {
    const pickers = db.get('pickers').value();
    const existing = pickers.find(p => p.email === email);
    
    if (existing) {
      return res.status(400).jsonp({ error: 'Picker already exists' });
    }

    const newPicker = {
      id: Math.max(...pickers.map(p => p.id), 0) + 1,
      name, email, password, phone,
      profilePic: 'https://i.pravatar.cc/150?img=1',
      vehicleType: req.body.vehicleType || 'Van',
      vehiclePlate: req.body.vehiclePlate || '',
      status: 'active',
      rating: 0,
      totalReviews: 0,
      activePickups: [],
      completedPickups: [],
      cancelledPickups: [],
      pickerLocation: { lat: 0, lng: 0, label: 'Unknown' },
      workingHours: { start: '08:00', end: '18:00' },
      totalEarnings: 0,
      monthlyEarnings: 0,
      completedPickupsCount: 0,
      badges: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    db.get('pickers').push(newPicker).write();
    
    const token = Buffer.from(`${newPicker.id}:${Date.now()}`).toString('base64');
    
    return res.status(201).jsonp({
      accessToken: token,
      userId: newPicker.id,
      email: newPicker.email,
      name: newPicker.name,
      role: 'picker'
    });
  } else {
    const users = db.get('users').value();
    const existing = users.find(u => u.email === email);
    
    if (existing) {
      return res.status(400).jsonp({ error: 'User already exists' });
    }

    const newUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      name, email, password, phone,
      profilePic: 'https://i.pravatar.cc/150?img=1',
      address: '',
      totalPoints: 0,
      bins: [],
      pickups: [],
      locations: [],
      impact: {
        totalItemsRecycled: 0, co2SavedKg: 0, waterSavedLiters: 0,
        energySavedKwh: 0, ranking: 0, treesEquivalent: 0
      },
      badges: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    db.get('users').push(newUser).write();
    
    const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');
    
    return res.status(201).jsonp({
      accessToken: token,
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: 'user'
    });
  }
});

// =====================================================
// 📚 DATA MODELS DOCUMENTATION ENDPOINTS
// =====================================================

/**
 * Documentation endpoints for both DriverRecycle (backend) and RecyCare (user app) data models
 * Provides complete reference for all models, fields, and usage patterns
 */

// User App (RecyCare) Models Documentation
server.get('/docs/user-models', (req, res) => {
  res.jsonp({
    title: 'RecyCare User App - Data Models Documentation',
    version: '1.0.0',
    description: 'Complete reference for 25+ Kotlin/Java data models in the RecyCare Android app',
    lastUpdated: '2025-12-28',
    sections: {
      authentication: {
        title: 'Authentication & Profiles',
        models: ['UserModel', 'LoginRequest', 'LoginResponse', 'RegisterUserRequest', 'UpdateProfileRequest', 'NotificationPrefsRequest'],
        description: 'User profile management, authentication, and preference settings'
      },
      recyclingOperations: {
        title: 'Recycling Operations',
        models: ['SmartBinModel', 'CreateBinRequest', 'UpdateBinRequest', 'BinScanRequest', 'BinSummaryResponse', 'PickupModel', 'PickerModel', 'PickerLocationModel', 'CancelRequest', 'RescheduleRequest'],
        description: 'Smart bins, pickup scheduling, and driver tracking'
      },
      rewardsSystem: {
        title: 'Rewards & Impact',
        models: ['Reward', 'UserBalance', 'BadgeModel', 'PointHistoryModel', 'Coupon'],
        description: 'Points system, achievements, rewards, and environmental impact tracking'
      },
      userActivities: {
        title: 'User Activities',
        models: ['trashModel', 'recyclingItemDetail', 'ImpactModel', 'NotificationModel', 'LocationModel'],
        description: 'Recycling history, notifications, and environmental metrics'
      },
      scanning: {
        title: 'Scanning & Image Recognition',
        models: ['ScanItemRequest', 'ScanItemResponse'],
        description: 'AI-based item scanning and material detection'
      }
    },
    totalModels: 25,
    documentationUrl: '/docs/models/full',
    exampleUrl: '/docs/models/UserModel'
  });
});

// Get specific model documentation
server.get('/docs/models/:modelName', (req, res) => {
  const modelName = req.params.modelName;
  const models = {
    UserModel: {
      name: 'UserModel',
      purpose: 'Central user profile containing identity, settings, and relationships',
      file: 'UserModel.java',
      serializable: true,
      fields: {
        id: { type: 'String', description: 'Primary user identifier (UUID)', example: 'user-123' },
        userId: { type: 'String', description: 'Alternative ID from login response', example: 'user-123' },
        name: { type: 'String', description: 'User full name', example: 'Yasmine Benali' },
        email: { type: 'String', description: 'Email address', example: 'yasmine@example.com' },
        phone: { type: 'String', description: 'Contact phone number', example: '+213660000001' },
        role: { type: 'String', description: 'User role', example: 'user' },
        profilePicUrl: { type: 'String', description: 'Avatar/profile picture URL', example: 'https://...' },
        language: { type: 'String', description: 'Preferred language (EN, FR, AR)', example: 'EN' },
        locations: { type: 'List<LocationModel>', description: 'Saved addresses', example: '[]' },
        bins: { type: 'List<String>', description: 'IDs of user bins', example: '["bin-1", "bin-2"]' },
        pickups: { type: 'List<String>', description: 'IDs of user pickups', example: '["pickup-1"]' },
        badges: { type: 'List<BadgeModel>', description: 'Earned achievement badges', example: '[]' },
        impact: { type: 'ImpactModel', description: 'Environmental impact summary', example: '{}' },
        notificationsEnabled: { type: 'boolean', description: 'Push notification preference', example: true },
        accessToken: { type: 'String', description: 'JWT auth token', example: 'eyJhbGc...' },
        refreshToken: { type: 'String', description: 'Token refresh credential', example: 'eyJhbGc...' },
        expiresIn: { type: 'long', description: 'Token expiration time (seconds)', example: 3600 },
        createdAt: { type: 'String', description: 'Account creation timestamp (ISO 8601)', example: '2024-06-15T10:00:00Z' },
        updatedAt: { type: 'String', description: 'Last profile update', example: '2025-12-28T03:00:00Z' }
      },
      keyMethods: ['getId()', 'getUserId()', 'getAccessToken()', 'toString()'],
      usageExample: 'UserModel user = new UserModel(); user.setUserId(loginResponse.getUserId());'
    },
    SmartBinModel: {
      name: 'SmartBinModel',
      purpose: 'Represents a user smart recycling bin with fill status and material type',
      file: 'SmartBinModel.java',
      fields: {
        id: { type: 'String', description: 'Unique bin identifier', example: 'bin-plastic-001' },
        type: { type: 'String', description: 'Material type (plastic, glass, paper, metal)', example: 'plastic' },
        capacityKg: { type: 'double', description: 'Maximum capacity', example: 50.0 },
        fillPercent: { type: 'double', description: 'Current fill level (0-100)', example: 84.5 },
        status: { type: 'String', description: 'Readiness status', example: 'ready_for_pickup' },
        lastUpdated: { type: 'String', description: 'Last update timestamp (ISO 8601)', example: '2025-12-28T03:00:00Z' }
      },
      statusValues: ['ready_for_pickup (>80% full)', 'almost_ready (50-80%)', 'not_ready (<50%)'],
      usageExample: 'if (bin.getStatus().equals("ready_for_pickup")) { showPickupButton(); }'
    },
    PickupModel: {
      name: 'PickupModel',
      purpose: 'Represents a scheduled or completed recycling collection job',
      file: 'PickupModel.java',
      statusLifecycle: 'pending → confirmed → completed (or cancelled)',
      keyFields: ['id', 'userId', 'binId', 'pickerId', 'scheduledDate', 'status', 'rating', 'review'],
      statusValues: ['pending', 'confirmed', 'completed', 'cancelled'],
      rewardTypes: ['POINTS', 'MONEY', 'COMBINATION']
    },
    BadgeModel: {
      name: 'BadgeModel',
      purpose: 'Achievement badges earned by users for milestones and activities',
      file: 'BadgeModel.java',
      fields: {
        id: { type: 'String', description: 'Unique badge ID', example: 'badge-eco-warrior' },
        name: { type: 'String', description: 'Badge name', example: 'Eco Warrior' },
        category: { type: 'String', description: 'Badge category', example: 'environmental' },
        level: { type: 'int', description: 'Difficulty level (1-4: Bronze, Silver, Gold, Platinum)', example: 3 },
        progress: { type: 'int', description: 'Completion percentage (0-100)', example: 75 },
        rarity: { type: 'String', description: 'Rarity level', example: 'RARE' },
        isUnlocked: { type: 'boolean', description: 'Whether badge is earned', example: true },
        reward: { type: 'int', description: 'Points awarded', example: 500 }
      },
      categories: ['environmental (🌱)', 'social (👥)', 'milestone (🎯)', 'achievement (⭐)', 'recycler (♻️)', 'picker (🚗)'],
      rarityLevels: ['COMMON (Gray)', 'UNCOMMON (Green)', 'RARE (Blue)', 'EPIC (Purple)', 'LEGENDARY (Gold)'],
      levels: ['1=Bronze', '2=Silver', '3=Gold', '4=Platinum']
    },
    Reward: {
      name: 'Reward',
      purpose: 'Track points or money earned by user',
      file: 'Reward.java',
      fields: {
        id: { type: 'String', description: 'Unique reward ID' },
        type: { type: 'RewardType', description: 'POINTS or MONEY' },
        amount: { type: 'int', description: 'Points or money amount' },
        source: { type: 'String', description: 'Origin of reward (Plastic, Glass, Coupon)' },
        timestamp: { type: 'long', description: 'When earned (milliseconds)' }
      }
    },
    UserBalance: {
      name: 'UserBalance',
      purpose: 'Summary of user accumulated points and money',
      file: 'UserBalance.java',
      fields: {
        totalPoints: { type: 'int', description: 'Total points earned', example: 450 },
        totalMoney: { type: 'int', description: 'Total money earned (in cents)', example: 50000 },
        pointsUsed: { type: 'int', description: 'Points redeemed/spent', example: 100 },
        availablePoints: { type: 'int', description: 'Points not yet spent', example: 350 },
        availableMoney: { type: 'int', description: 'Money balance', example: 50000 }
      },
      methods: ['addPoints(int)', 'addMoney(int)', 'deductPoints(int)', 'updateAvailable()']
    },
    Coupon: {
      name: 'Coupon',
      purpose: 'Discount coupons redeemable with points',
      file: 'Coupon.java',
      fields: {
        id: { type: 'String', description: 'Unique coupon ID', example: 'lalla_khedidja' },
        brandName: { type: 'String', description: 'Brand name', example: 'Lalla Khedidja Pastries' },
        discount: { type: 'String', description: 'Discount amount', example: '20% OFF' },
        pointsCost: { type: 'int', description: 'Points to redeem', example: 100 },
        isRedeemed: { type: 'boolean', description: 'Whether redeemed', example: false },
        expirationDate: { type: 'long', description: 'Expiration timestamp' }
      },
      methods: ['isExpired()', 'incrementUsageCount()']
    },
    trashModel: {
      name: 'trashModel',
      purpose: 'Grouped recycling history by material type',
      file: 'trashModel.java',
      fields: {
        id: { type: 'String', description: 'Trash record ID' },
        userId: { type: 'String', description: 'Owner user ID' },
        type: { type: 'String', description: 'Material type (Plastic, Paper, Glass, Metal)' },
        quantity: { type: 'String', description: 'Total points' },
        items: { type: 'List<recyclingItemDetail>', description: 'Individual recycled items' }
      },
      methods: ['addItem()', 'getTotalWeight()', 'getTotalPoints()', 'getItemCount()', 'getFillPercentage()', 'isNearlyFull()', 'isFull()']
    },
    recyclingItemDetail: {
      name: 'recyclingItemDetail',
      purpose: 'Individual item in recycling history',
      file: 'recyclingItemDetail.java',
      fields: {
        id: { type: 'String', description: 'Item ID' },
        picture: { type: 'String', description: 'Image URL' },
        name: { type: 'String', description: 'Item description', example: 'Plastic Bottle' },
        date: { type: 'String', description: 'Date recycled (YYYY-MM-DD)' },
        weight: { type: 'String', description: 'Weight with unit', example: '0.5kg' },
        points: { type: 'int', description: 'Points earned (auto-calculated: 1kg=10pts)' },
        type: { type: 'String', description: 'Material type' }
      },
      pointsFormula: '1kg = 10 points',
      weightFormat: '0.5kg, 1.2kg, 100g (parsed correctly)'
    },
    ImpactModel: {
      name: 'ImpactModel',
      purpose: 'Environmental impact summary for user',
      file: 'ImpactModel.java',
      fields: {
        pickupsCount: { type: 'int', description: 'Total pickups completed' },
        totalPoints: { type: 'int', description: 'Total points earned' },
        co2SavedKg: { type: 'double', description: 'CO2 equivalent saved (kg)' }
      },
      metrics: {
        co2Saved: 'Total weight recycled × CO2 per kg',
        treesEquivalent: 'CO2 Saved / 20 kg per tree',
        waterSaved: 'CO2 Saved × 12 liters',
        energySaved: 'CO2 Saved / 0.4 kWh'
      }
    }
  };

  const model = models[modelName];
  if (model) {
    res.jsonp(model);
  } else {
    res.status(404).jsonp({
      error: 'Model not found',
      message: `Model "${modelName}" not documented`,
      availableModels: Object.keys(models)
    });
  }
});

// Get all models documentation
server.get('/docs/models/all', (req, res) => {
  const db = router.db;
  res.jsonp({
    title: 'RecyCare - Complete Data Models Reference',
    description: '25+ Kotlin/Java data models for the user-facing recycling app',
    totalModels: 25,
    categories: {
      authentication: 6,
      recyclingOperations: 10,
      rewardsSystem: 5,
      userActivities: 4
    },
    keyPoints: {
      pointsFormula: '1kg recycled = 10 points',
      badgeLevels: '1=Bronze, 2=Silver, 3=Gold, 4=Platinum',
      badgeRarity: 'COMMON, UNCOMMON, RARE, EPIC, LEGENDARY',
      pickupStatus: 'pending → confirmed → completed (or cancelled)',
      languages: 'EN (English), FR (French), AR (Arabic)',
      materialTypes: 'plastic, glass, paper, metal'
    },
    documentation: {
      markdown: 'See NIT_PROJECT_DATA_MODELS.md for complete documentation',
      sections: [
        'Overview & Project Context',
        'Authentication & Profiles',
        'Recycling Operations',
        'Rewards & Impact System',
        'User Activities & Notifications',
        'Scanning & Image Recognition',
        'Data Flow Diagrams',
        'Common Integration Patterns',
        'Developer Checklist'
      ]
    }
  });
});

// Get documentation for data flows and patterns
server.get('/docs/flows', (req, res) => {
  res.jsonp({
    title: 'Data Flow & Integration Patterns',
    flows: {
      authentication: {
        title: 'User Login Flow',
        steps: [
          'LoginRequest (email, password)',
          'API Login Call',
          'LoginResponse (userId, accessToken, refreshToken, expiresIn)',
          'Store in UserModel',
          'App Ready'
        ]
      },
      pickupLifecycle: {
        title: 'Pickup Lifecycle',
        steps: [
          'User selects bin',
          'Create PickupModel (status: pending)',
          'Driver confirms assignment',
          'Driver arrives (PickerLocationModel updated via GPS)',
          'Scan bin/weigh (BinScanRequest)',
          'Mark complete (PickupModel status: done)',
          'Award points (Reward created, UserBalance updated)',
          'User rates (rating + review added)',
          'History logged (PointHistoryModel entry)'
        ]
      },
      rewardRedemption: {
        title: 'Rewards & Redemption',
        steps: [
          'Pickup completed → Reward (+50 points)',
          'PointHistoryModel entry logged',
          'UserBalance updated (+50 available)',
          'Browse coupons (requires 100 points)',
          'Redeem coupon → UserBalance -100 points',
          'Show coupon code for store use'
        ]
      }
    },
    patterns: {
      asyncApiCalls: 'apiService.getUser(userId).enqueue(object : Callback<UserModel> {...})',
      tokenRefresh: 'Check token expiration, call refresh endpoint, save new token',
      serialization: 'All models use @SerializedName for JSON mapping via Gson',
      validation: 'Validate required fields before API calls'
    }
  });
});

// =====================================================
// 📍 HEALTH CHECK
// =====================================================

server.get('/health', (req, res) => {
  res.jsonp({
    status: 'OK',
    message: '🚀 Recycling Mock API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      users: '/users',
      pickers: '/pickers',
      bins: '/bins',
      pickups: '/pickups',
      coupons: '/coupons',
      reviews: '/reviews',
      notifications: '/notifications',
      pickerPerformance: '/picker-performance',
      pickerGoals: '/picker-goals',
      leaderboard: '/leaderboard',
      auth: '/auth/login',
      documentation: {
        userModels: '/docs/user-models',
        allModels: '/docs/models/all',
        specificModel: '/docs/models/:modelName',
        dataFlows: '/docs/flows'
      }
    }
  });
});

// =====================================================
// DEFAULT ROUTES (for any other endpoints via json-server)
// =====================================================

server.use(router);

// Start server
server.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Recycling Mock API Server Running                      ║
║  Port: ${port}                                            ║
║  Timestamp: ${new Date().toISOString()}                   ║
╚════════════════════════════════════════════════════════════╝

📚 Available Endpoints:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 USERS (Full CRUD)
  GET    /users                    - Get all users
  GET    /users/:userId            - Get specific user
  POST   /users                    - Create new user
  PUT    /users/:userId            - Update user
  DELETE /users/:userId            - Delete user

🚗 PICKERS (Full CRUD)
  GET    /pickers                  - Get all pickers
  GET    /pickers/:pickerId        - Get specific picker
  POST   /pickers                  - Create new picker
  PUT    /pickers/:pickerId        - Update picker
  DELETE /pickers/:pickerId        - Delete picker

🗑️ BINS (Full CRUD)
  GET    /bins                     - Get all bins (filter by userId, type, status)
  GET    /bins/:binId              - Get specific bin
  POST   /bins                     - Create new bin
  PUT    /bins/:binId              - Update bin
  DELETE /bins/:binId              - Delete bin

📦 PICKUPS (Full CRUD)
  GET    /pickups                  - Get all pickups (filter by userId, pickerId, status)
  GET    /pickups/:pickupId        - Get specific pickup
  POST   /pickups                  - Create new pickup
  PUT    /pickups/:pickupId        - Update pickup
  DELETE /pickups/:pickupId        - Delete pickup
  POST   /pickups/:pickupId/confirm - Confirm pickup & award points

💰 POINTS HISTORY
  GET    /points-history           - Get all points history
  POST   /points-history           - Add points entry
  DELETE /points-history/:historyId - Delete entry

🎁 COUPONS (Full CRUD)
  GET    /coupons                  - Get all coupons (filter by active)
  GET    /coupons/:couponId        - Get specific coupon
  POST   /coupons                  - Create new coupon
  PUT    /coupons/:couponId        - Update coupon
  DELETE /coupons/:couponId        - Delete coupon

⭐ REVIEWS
  GET    /reviews                  - Get all reviews (filter by pickupId, pickerId)
  POST   /reviews                  - Create new review
  DELETE /reviews/:reviewId        - Delete review

📢 NOTIFICATIONS
  GET    /notifications            - Get all notifications (filter by userId, unread)
  POST   /notifications            - Create new notification
  PUT    /notifications/:notificationId/read - Mark as read

🏆 PICKER PERFORMANCE
  GET    /picker-performance       - Get all performance (filter by pickerId, month)
  GET    /picker-performance/:pickerId/:month - Get specific performance

🎯 PICKER GOALS (Full CRUD)
  GET    /picker-goals             - Get all goals (filter by pickerId, month, status)
  GET    /picker-goals/:goalId     - Get specific goal
  POST   /picker-goals             - Create new goal
  PUT    /picker-goals/:goalId     - Update goal
  DELETE /picker-goals/:goalId     - Delete goal

📊 LEADERBOARD
  GET    /leaderboard              - Get leaderboard

🔐 AUTHENTICATION
  POST   /auth/login               - Login (users & pickers)
  POST   /auth/register            - Register (users & pickers)

🔍 UTILITY
  GET    /health                   - Health check

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});
