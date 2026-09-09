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
// 🔧 Shared helper — db.json stores ids as STRINGS
// ("1", "20", "10"...). Comparing with parseInt() broke
// every by-id lookup and every ?userId=/?pickerId= filter.
// Always compare ids as strings.
// =====================================================
function findById(collection, id) {
  return collection.find(item => String(item.id) === String(id));
}
function removeById(collection, id) {
  return collection.remove(item => String(item.id) === String(id));
}

// =====================================================
// 🔵 USERS CRUD ENDPOINTS
// =====================================================

server.get('/users', (req, res) => {
  const db = router.db;
  const users = db.get('users').value();
  res.jsonp(users);
});

server.get('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;
  const user = findById(db.get('users'), userId).value();

  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }
  res.jsonp(user);
});

server.post('/users', (req, res) => {
  const db = router.db;
  const users = db.get('users').value();

  const newUser = {
    id: String(Math.max(...users.map(u => Number(u.id)), 0) + 1),
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone || '',
    profilePicUrl: req.body.profilePicUrl || 'https://i.pravatar.cc/150?img=1',
    address: req.body.address || '',
    totalPoints: req.body.totalPoints || 0,
    bins: req.body.bins || [],
    pickups: req.body.pickups || [],
    locations: req.body.locations || [],
    impact: req.body.impact || {
      pickupsCount: 0, totalPoints: 0, co2SavedKg: 0
    },
    badges: req.body.badges || [],
    notificationsEnabled: req.body.notificationsEnabled !== undefined ? req.body.notificationsEnabled : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('users').push(newUser).write();
  res.status(201).jsonp(newUser);
});

server.put('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;

  const user = findById(db.get('users'), userId).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  const updatedUser = findById(db.get('users'), userId)
    .assign({
      ...req.body,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedUser);
});

server.delete('/users/:userId', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;

  const user = findById(db.get('users'), userId).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  removeById(db.get('users'), userId).write();
  res.jsonp({ message: `User ${userId} deleted successfully` });
});

// ===== User sub-resources referenced by ApiService.java =====

server.get('/users/:userId/pickups', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;
  const pickups = db.get('pickups').value().filter(p => String(p.userId) === String(userId));
  res.jsonp(pickups);
});

server.get('/users/:userId/bins', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;
  const bins = db.get('bins').value().filter(b => String(b.userId) === String(userId));
  res.jsonp(bins);
});

server.get('/users/:userId/pointsHistory', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;
  const history = db.get('pointsHistory').value().filter(h => String(h.userId) === String(userId));
  res.jsonp(history);
});

server.put('/users/:userId/notification-preferences', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;

  const user = findById(db.get('users'), userId).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  const updatedUser = findById(db.get('users'), userId)
    .assign({
      notificationsEnabled: req.body.notificationsEnabled,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedUser);
});

server.get('/users/:userId/balance', (req, res) => {
  const db = router.db;
  const userId = req.params.userId;
  const balance = db.get('userBalance').find(b => String(b.userId) === String(userId)).value();

  if (!balance) {
    return res.status(404).jsonp({ error: 'Balance not found' });
  }
  res.jsonp(balance);
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
  const pickerId = req.params.pickerId;
  const picker = findById(db.get('pickers'), pickerId).value();

  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }
  res.jsonp(picker);
});

server.post('/pickers', (req, res) => {
  const db = router.db;
  const pickers = db.get('pickers').value();

  const newPicker = {
    id: String(Math.max(...pickers.map(p => Number(p.id)), 0) + 1),
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone || '',
    vehicleType: req.body.vehicleType || 'VAN',
    vehiclePlate: req.body.vehiclePlate || '',
    status: req.body.status || 'AVAILABLE',
    totalPickups: req.body.totalPickups || 0,
    rating: req.body.rating || 0,
    profilePicUrl: req.body.profilePicUrl || 'https://i.pravatar.cc/150?img=1',
    pickerLocation: req.body.pickerLocation || { lat: 0, lng: 0, label: 'Unknown' },
    activePickups: req.body.activePickups || [],
    createdAt: new Date().toISOString()
  };

  db.get('pickers').push(newPicker).write();
  res.status(201).jsonp(newPicker);
});

server.put('/pickers/:pickerId', (req, res) => {
  const db = router.db;
  const pickerId = req.params.pickerId;

  const picker = findById(db.get('pickers'), pickerId).value();
  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }

  const updatedPicker = findById(db.get('pickers'), pickerId)
    .assign(req.body)
    .write();

  res.jsonp(updatedPicker);
});

server.delete('/pickers/:pickerId', (req, res) => {
  const db = router.db;
  const pickerId = req.params.pickerId;

  const picker = findById(db.get('pickers'), pickerId).value();
  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }

  removeById(db.get('pickers'), pickerId).write();
  res.jsonp({ message: `Picker ${pickerId} deleted successfully` });
});

server.get('/pickers/:pickerId/location', (req, res) => {
  const db = router.db;
  const pickerId = req.params.pickerId;
  const picker = findById(db.get('pickers'), pickerId).value();

  if (!picker) {
    return res.status(404).jsonp({ error: 'Picker not found' });
  }
  res.jsonp(picker.pickerLocation || null);
});

// =====================================================
// 🗑️ BINS CRUD ENDPOINTS
// =====================================================

server.get('/bins', (req, res) => {
  const db = router.db;
  let bins = db.get('bins').value();

  const { userId, type, status } = req.query;
  if (userId) bins = bins.filter(b => String(b.userId) === String(userId));
  if (type)   bins = bins.filter(b => b.type.toLowerCase() === type.toLowerCase());
  if (status) bins = bins.filter(b => b.status === status);

  res.jsonp(bins);
});

server.get('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = req.params.binId;
  const bin = findById(db.get('bins'), binId).value();

  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }
  res.jsonp(bin);
});

server.post('/bins', (req, res) => {
  const db = router.db;
  const bins = db.get('bins').value();

  const newBin = {
    id: String(Math.max(...bins.map(b => Number(b.id)), 0) + 1),
    userId: req.body.userId,
    type: req.body.type || 'PLASTIC',
    capacityKg: req.body.capacityKg || 50,
    currentWeightKg: req.body.currentWeightKg || 0,
    fillPercent: req.body.fillPercent || 0,
    status: req.body.status || 'ACTIVE',
    lat: req.body.lat || 0,
    lng: req.body.lng || 0,
    address: req.body.address || '',
    qrCode: `BIN-${(req.body.type || 'PLASTIC').toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    numberOfItems: req.body.numberOfItems || 0,
    lastEmptied: req.body.lastEmptied || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('bins').push(newBin).write();
  res.status(201).jsonp(newBin);
});

server.put('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = req.params.binId;

  const bin = findById(db.get('bins'), binId).value();
  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }

  const updatedBin = findById(db.get('bins'), binId)
    .assign({
      ...req.body,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedBin);
});

server.delete('/bins/:binId', (req, res) => {
  const db = router.db;
  const binId = req.params.binId;

  const bin = findById(db.get('bins'), binId).value();
  if (!bin) {
    return res.status(404).jsonp({ error: 'Bin not found' });
  }

  removeById(db.get('bins'), binId).write();
  res.jsonp({ message: `Bin ${binId} deleted successfully` });
});

// =====================================================
// 📦 PICKUPS CRUD ENDPOINTS
// =====================================================

server.get('/pickups', (req, res) => {
  const db = router.db;
  let pickups = db.get('pickups').value();

  const { userId, pickerId, status } = req.query;
  if (userId)   pickups = pickups.filter(p => String(p.userId) === String(userId));
  if (pickerId) pickups = pickups.filter(p => String(p.pickerId) === String(pickerId));
  if (status)   pickups = pickups.filter(p => p.status === status);

  res.jsonp(pickups);
});

server.get('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = req.params.pickupId;
  const pickup = findById(db.get('pickups'), pickupId).value();

  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }
  res.jsonp(pickup);
});

server.post('/pickups', (req, res) => {
  const db = router.db;
  const pickups = db.get('pickups').value();

  const newPickup = {
    id: String(Math.max(...pickups.map(p => Number(p.id)), 0) + 1),
    userId: req.body.userId,
    binId: req.body.binId,
    pickerId: req.body.pickerId || null,
    status: req.body.status || 'upcoming',
    scheduledDate: req.body.scheduledDate || new Date().toISOString(),
    binType: req.body.binType || 'PLASTIC',
    estimatedWeight: req.body.estimatedWeight || 0,
    actualWeightKg: null,
    weightVerified: false,
    qrCode: `PU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    pickupAddress: req.body.pickupAddress || '',
    latitude: req.body.latitude || null,
    longitude: req.body.longitude || null,
    notes: req.body.notes || null,
    rating: null,
    review: null,
    pointsAwarded: null,
    cancellationReason: null,
    binCount: req.body.binCount || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('pickups').push(newPickup).write();
  res.status(201).jsonp(newPickup);
});

server.put('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = req.params.pickupId;

  const pickup = findById(db.get('pickups'), pickupId).value();
  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }

  const updatedPickup = findById(db.get('pickups'), pickupId)
    .assign({
      ...req.body,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedPickup);
});

server.delete('/pickups/:pickupId', (req, res) => {
  const db = router.db;
  const pickupId = req.params.pickupId;

  const pickup = findById(db.get('pickups'), pickupId).value();
  if (!pickup) {
    return res.status(404).jsonp({ error: 'Pickup not found' });
  }

  removeById(db.get('pickups'), pickupId).write();
  res.jsonp({ message: `Pickup ${pickupId} deleted successfully` });
});

// Confirm pickup and award points
server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = req.params.pickupId;

  const pickup = findById(db.get('pickups'), pickupId).value();
  if (!pickup) return res.status(404).jsonp({ message: 'Pickup not found' });

  findById(db.get('pickups'), pickupId)
    .assign({
      status: 'completed',
      actualWeightKg: req.body.weightKg != null ? req.body.weightKg : pickup.actualWeightKg,
      weightVerified: true,
      updatedAt: new Date().toISOString()
    })
    .write();

  const userId = pickup.userId;
  const user = findById(db.get('users'), userId).value();

  if (user) {
    const points = req.body.points || 25;
    const updatedPoints = (user.impact && user.impact.totalPoints ? user.impact.totalPoints : 0) + points;

    findById(db.get('users'), userId)
      .assign({ 'impact.totalPoints': updatedPoints })
      .write();

    db.get('pointsHistory')
      .push({
        id: Date.now(),
        userId,
        type: 'pickup_completed',
        value: points,
        source: `Pickup #${pickupId}`,
        date: new Date().toISOString()
      })
      .write();
  }

  res.jsonp({ message: 'Pickup confirmed and points updated' });
});

// =====================================================
// 💰 POINTS HISTORY CRUD ENDPOINTS
// =====================================================

server.get('/pointsHistory', (req, res) => {
  const db = router.db;
  let history = db.get('pointsHistory').value();

  const { userId } = req.query;
  if (userId) history = history.filter(h => String(h.userId) === String(userId));

  res.jsonp(history);
});

server.post('/pointsHistory', (req, res) => {
  const db = router.db;

  const newEntry = {
    id: Date.now(),
    userId: req.body.userId,
    type: req.body.type || 'pickup_completed',
    value: req.body.value || 0,
    source: req.body.source || '',
    date: new Date().toISOString()
  };

  db.get('pointsHistory').push(newEntry).write();
  res.status(201).jsonp(newEntry);
});

// =====================================================
// 🎁 COUPONS CRUD ENDPOINTS
// =====================================================

server.get('/coupons', (req, res) => {
  const db = router.db;
  const coupons = db.get('coupons').value();
  res.jsonp(coupons);
});

server.get('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = req.params.couponId;
  const coupon = findById(db.get('coupons'), couponId).value();

  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }
  res.jsonp(coupon);
});

server.post('/coupons', (req, res) => {
  const db = router.db;
  const coupons = db.get('coupons').value();

  const newCoupon = {
    id: String(Math.max(...coupons.map(c => Number(c.id)), 0) + 1),
    brandName: req.body.brandName,
    discount: req.body.discount,
    pointsCost: req.body.pointsCost || 100,
    couponCode: req.body.couponCode || `CODE${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    redeemedDate: 0,
    usageCount: 0,
    isRedeemed: false,
    expirationDate: req.body.expirationDate || (Date.now() + 30 * 24 * 60 * 60 * 1000)
  };

  db.get('coupons').push(newCoupon).write();
  res.status(201).jsonp(newCoupon);
});

server.put('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = req.params.couponId;

  const coupon = findById(db.get('coupons'), couponId).value();
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }

  const updatedCoupon = findById(db.get('coupons'), couponId)
    .assign(req.body)
    .write();

  res.jsonp(updatedCoupon);
});

server.delete('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const couponId = req.params.couponId;

  const coupon = findById(db.get('coupons'), couponId).value();
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }

  removeById(db.get('coupons'), couponId).write();
  res.jsonp({ message: `Coupon ${couponId} deleted successfully` });
});

server.post('/coupons/:couponId/redeem', (req, res) => {
  const db = router.db;
  const couponId = req.params.couponId;

  const coupon = findById(db.get('coupons'), couponId).value();
  if (!coupon) {
    return res.status(404).jsonp({ error: 'Coupon not found' });
  }
  if (coupon.isRedeemed) {
    return res.status(400).jsonp({ error: 'Coupon already redeemed' });
  }

  const userId = req.body.userId;
  const balance = db.get('userBalance').find(b => String(b.userId) === String(userId)).value();
  if (balance && balance.availablePoints < coupon.pointsCost) {
    return res.status(400).jsonp({ error: 'Not enough points' });
  }
  if (balance) {
    db.get('userBalance')
      .find(b => String(b.userId) === String(userId))
      .assign({ availablePoints: balance.availablePoints - coupon.pointsCost })
      .write();
  }

  const updatedCoupon = findById(db.get('coupons'), couponId)
    .assign({
      isRedeemed: true,
      redeemedDate: Date.now(),
      usageCount: (coupon.usageCount || 0) + 1
    })
    .write();

  res.jsonp(updatedCoupon);
});

// =====================================================
// ⭐ REVIEWS CRUD ENDPOINTS
// =====================================================

server.get('/reviews', (req, res) => {
  const db = router.db;
  let reviews = db.get('reviews').value();

  const { pickupId, pickerId } = req.query;
  if (pickupId) reviews = reviews.filter(r => String(r.pickupId) === String(pickupId));
  if (pickerId) reviews = reviews.filter(r => String(r.pickerId) === String(pickerId));

  res.jsonp(reviews);
});

server.get('/reviews/:reviewId', (req, res) => {
  const db = router.db;
  const reviewId = req.params.reviewId;
  const review = findById(db.get('reviews'), reviewId).value();

  if (!review) {
    return res.status(404).jsonp({ error: 'Review not found' });
  }
  res.jsonp(review);
});

server.post('/reviews', (req, res) => {
  const db = router.db;
  const reviews = db.get('reviews').value();

  const newReview = {
    id: String(Math.max(...reviews.map(r => Number(r.id)), 0) + 1),
    pickupId: req.body.pickupId,
    userId: req.body.userId,
    pickerId: req.body.pickerId,
    rating: req.body.rating || 5,
    comment: req.body.comment || '',
    createdAt: new Date().toISOString()
  };

  db.get('reviews').push(newReview).write();
  res.status(201).jsonp(newReview);
});

server.put('/reviews/:reviewId', (req, res) => {
  const db = router.db;
  const reviewId = req.params.reviewId;

  const review = findById(db.get('reviews'), reviewId).value();
  if (!review) {
    return res.status(404).jsonp({ error: 'Review not found' });
  }

  const updatedReview = findById(db.get('reviews'), reviewId)
    .assign(req.body)
    .write();

  res.jsonp(updatedReview);
});

server.delete('/reviews/:reviewId', (req, res) => {
  const db = router.db;
  const reviewId = req.params.reviewId;

  const review = findById(db.get('reviews'), reviewId).value();
  if (!review) {
    return res.status(404).jsonp({ error: 'Review not found' });
  }

  removeById(db.get('reviews'), reviewId).write();
  res.jsonp({ message: `Review ${reviewId} deleted successfully` });
});

// =====================================================
// 📢 NOTIFICATIONS CRUD ENDPOINTS
// =====================================================

server.get('/notifications', (req, res) => {
  const db = router.db;
  let notifications = db.get('notifications').value();

  const { userId } = req.query;
  if (userId) notifications = notifications.filter(n => String(n.userId) === String(userId));

  res.jsonp(notifications);
});

server.get('/notifications/:notificationId', (req, res) => {
  const db = router.db;
  const notificationId = req.params.notificationId;
  const notification = findById(db.get('notifications'), notificationId).value();

  if (!notification) {
    return res.status(404).jsonp({ error: 'Notification not found' });
  }
  res.jsonp(notification);
});

server.post('/notifications', (req, res) => {
  const db = router.db;
  const notifications = db.get('notifications').value();

  const newNotification = {
    id: String(Math.max(...notifications.map(n => Number(n.id)), 0) + 1),
    userId: req.body.userId,
    title: req.body.title,
    message: req.body.message,
    type: req.body.type || 'system',
    timestamp: Date.now(),
    isRead: false
  };

  db.get('notifications').push(newNotification).write();
  res.status(201).jsonp(newNotification);
});

server.put('/notifications/:notificationId', (req, res) => {
  const db = router.db;
  const notificationId = req.params.notificationId;

  const notification = findById(db.get('notifications'), notificationId).value();
  if (!notification) {
    return res.status(404).jsonp({ error: 'Notification not found' });
  }

  const updated = findById(db.get('notifications'), notificationId)
    .assign(req.body)
    .write();

  res.jsonp(updated);
});

server.put('/notifications/:notificationId/read', (req, res) => {
  const db = router.db;
  const notificationId = req.params.notificationId;

  const notification = findById(db.get('notifications'), notificationId).value();
  if (!notification) {
    return res.status(404).jsonp({ error: 'Notification not found' });
  }

  const updated = findById(db.get('notifications'), notificationId)
    .assign({ isRead: true })
    .write();

  res.jsonp(updated);
});

server.put('/notifications/read-all', (req, res) => {
  const db = router.db;
  const { userId } = req.query;

  db.get('notifications')
    .filter(n => String(n.userId) === String(userId))
    .each(n => { n.isRead = true; })
    .write();

  res.status(204).end();
});

server.delete('/notifications/:notificationId', (req, res) => {
  const db = router.db;
  const notificationId = req.params.notificationId;

  const notification = findById(db.get('notifications'), notificationId).value();
  if (!notification) {
    return res.status(404).jsonp({ error: 'Notification not found' });
  }

  removeById(db.get('notifications'), notificationId).write();
  res.jsonp({ message: `Notification ${notificationId} deleted successfully` });
});

// =====================================================
// 🏆 PICKER PERFORMANCE ENDPOINTS
// =====================================================

server.get('/picker-performance', (req, res) => {
  const db = router.db;
  let performance = db.get('pickerPerformance').value();

  const { pickerId, month } = req.query;
  if (pickerId) performance = performance.filter(p => String(p.pickerId) === String(pickerId));
  if (month)    performance = performance.filter(p => p.month === month);

  res.jsonp(performance);
});

server.get('/picker-performance/:pickerId/:month', (req, res) => {
  const db = router.db;
  const pickerId = req.params.pickerId;
  const month = req.params.month;

  const perf = db.get('pickerPerformance')
    .find(p => String(p.pickerId) === String(pickerId) && p.month === month)
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
  if (pickerId) goals = goals.filter(g => String(g.pickerId) === String(pickerId));
  if (month)    goals = goals.filter(g => g.month === month);
  if (status)   goals = goals.filter(g => g.status === status);

  res.jsonp(goals);
});

server.get('/picker-goals/:goalId', (req, res) => {
  const db = router.db;
  const goalId = req.params.goalId;
  const goal = findById(db.get('pickerGoals'), goalId).value();

  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }
  res.jsonp(goal);
});

server.post('/picker-goals', (req, res) => {
  const db = router.db;
  const goals = db.get('pickerGoals').value();

  const newGoal = {
    id: Math.max(...goals.map(g => Number(g.id)), 0) + 1,
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
  const goalId = req.params.goalId;

  const goal = findById(db.get('pickerGoals'), goalId).value();
  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }

  const updatedGoal = findById(db.get('pickerGoals'), goalId)
    .assign({
      ...req.body,
      updatedAt: new Date().toISOString()
    })
    .write();

  res.jsonp(updatedGoal);
});

server.delete('/picker-goals/:goalId', (req, res) => {
  const db = router.db;
  const goalId = req.params.goalId;

  const goal = findById(db.get('pickerGoals'), goalId).value();
  if (!goal) {
    return res.status(404).jsonp({ error: 'Goal not found' });
  }

  removeById(db.get('pickerGoals'), goalId).write();
  res.jsonp({ message: `Goal ${goalId} deleted successfully` });
});

// =====================================================
// 💵 EARNINGS ENDPOINTS
// =====================================================

server.get('/earnings', (req, res) => {
  const db = router.db;
  let earnings = db.get('earnings').value();

  const { pickerId, month } = req.query;
  if (pickerId) earnings = earnings.filter(e => String(e.pickerId) === String(pickerId));
  if (month)    earnings = earnings.filter(e => (e.date || '').startsWith(month));

  res.jsonp(earnings);
});

server.get('/earnings/:earningId', (req, res) => {
  const db = router.db;
  const earningId = req.params.earningId;
  const earning = findById(db.get('earnings'), earningId).value();

  if (!earning) {
    return res.status(404).jsonp({ error: 'Earning not found' });
  }
  res.jsonp(earning);
});

server.post('/earnings', (req, res) => {
  const db = router.db;
  const earnings = db.get('earnings').value();

  const newEarning = {
    id: Math.max(...earnings.map(e => Number(e.id)), 0) + 1,
    pickerId: req.body.pickerId,
    pickupId: req.body.pickupId || null,
    amount: req.body.amount || 0,
    type: req.body.type || 'pickup',
    status: req.body.status || 'completed',
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    description: req.body.description || '',
    binType: req.body.binType || null
  };

  db.get('earnings').push(newEarning).write();
  res.status(201).jsonp(newEarning);
});

server.put('/earnings/:earningId', (req, res) => {
  const db = router.db;
  const earningId = req.params.earningId;

  const earning = findById(db.get('earnings'), earningId).value();
  if (!earning) {
    return res.status(404).jsonp({ error: 'Earning not found' });
  }

  const updatedEarning = findById(db.get('earnings'), earningId)
    .assign(req.body)
    .write();

  res.jsonp(updatedEarning);
});

// =====================================================
// 💎 REWARDS & BALANCE ENDPOINTS
// =====================================================

server.get('/rewards', (req, res) => {
  const db = router.db;
  let rewards = db.get('rewards').value();

  const { userId } = req.query;
  if (userId) rewards = rewards.filter(r => String(r.userId) === String(userId));

  res.jsonp(rewards);
});

server.post('/rewards', (req, res) => {
  const db = router.db;
  const rewards = db.get('rewards').value();

  const newReward = {
    id: String(Math.max(...rewards.map(r => Number(r.id)), 0) + 1),
    userId: req.body.userId,
    pickupId: req.body.pickupId || null,
    type: req.body.type || 'points',
    amount: req.body.amount || 0,
    source: req.body.source || '',
    createdAt: new Date().toISOString()
  };

  db.get('rewards').push(newReward).write();
  res.status(201).jsonp(newReward);
});

// =====================================================
// 📍 LOCATIONS ENDPOINTS
// (locations live nested inside each user's "locations" array
//  in db.json — these routes flatten/target that array.)
// =====================================================

function allLocationsFlat(db) {
  const users = db.get('users').value();
  let all = [];
  users.forEach(u => {
    (u.locations || []).forEach(loc => all.push({ ...loc, userId: u.id }));
  });
  return all;
}

server.get('/locations', (req, res) => {
  const db = router.db;
  let locations = allLocationsFlat(db);

  const { label } = req.query;
  if (label) locations = locations.filter(l => (l.label || '').toLowerCase() === label.toLowerCase());

  res.jsonp(locations);
});

server.get('/locations/:locationId', (req, res) => {
  const db = router.db;
  const locationId = req.params.locationId;
  const location = allLocationsFlat(db).find(l => String(l.id) === String(locationId));

  if (!location) {
    return res.status(404).jsonp({ error: 'Location not found' });
  }
  res.jsonp(location);
});

server.post('/locations', (req, res) => {
  const db = router.db;
  const userId = req.body.userId;
  const user = findById(db.get('users'), userId).value();
  if (!user) {
    return res.status(404).jsonp({ error: 'User not found' });
  }

  const newLocation = {
    id: `loc-${Date.now()}`,
    label: req.body.label || 'Location',
    address: req.body.address || '',
    lat: req.body.lat || 0,
    lng: req.body.lng || 0
  };

  findById(db.get('users'), userId)
    .get('locations')
    .push(newLocation)
    .write();

  res.status(201).jsonp({ ...newLocation, userId });
});

server.put('/locations/:locationId', (req, res) => {
  const db = router.db;
  const locationId = req.params.locationId;
  const users = db.get('users').value();

  for (const u of users) {
    const loc = (u.locations || []).find(l => String(l.id) === String(locationId));
    if (loc) {
      Object.assign(loc, req.body);
      db.get('users').find(x => String(x.id) === String(u.id)).assign({ locations: u.locations }).write();
      return res.jsonp({ ...loc, userId: u.id });
    }
  }
  res.status(404).jsonp({ error: 'Location not found' });
});

server.delete('/locations/:locationId', (req, res) => {
  const db = router.db;
  const locationId = req.params.locationId;
  const users = db.get('users').value();

  for (const u of users) {
    const idx = (u.locations || []).findIndex(l => String(l.id) === String(locationId));
    if (idx !== -1) {
      u.locations.splice(idx, 1);
      db.get('users').find(x => String(x.id) === String(u.id)).assign({ locations: u.locations }).write();
      return res.jsonp({ message: `Location ${locationId} deleted successfully` });
    }
  }
  res.status(404).jsonp({ error: 'Location not found' });
});

// =====================================================
// 📊 LEADERBOARD ENDPOINTS
// =====================================================

server.get('/leaderboard', (req, res) => {
  const db = router.db;
  let leaderboard = db.get('leaderboard').value();

  const { limit } = req.query;
  if (limit) leaderboard = leaderboard.slice(0, parseInt(limit, 10));

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
    user = db.get('pickers').find(p => p.email === email && p.password === password).value();
  } else {
    user = db.get('users').find(u => u.email === email && u.password === password).value();
  }

  if (!user) {
    return res.status(401).jsonp({ error: 'Invalid credentials' });
  }

  const accessToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  const refreshToken = Buffer.from(`${user.id}:refresh:${Date.now()}`).toString('base64');

  res.jsonp({
    accessToken,
    refreshToken,
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
      id: String(Math.max(...pickers.map(p => Number(p.id)), 0) + 1),
      name, email, password, phone,
      vehicleType: req.body.vehicleType || 'VAN',
      vehiclePlate: req.body.vehiclePlate || '',
      status: 'AVAILABLE',
      totalPickups: 0,
      rating: 0,
      profilePicUrl: 'https://i.pravatar.cc/150?img=1',
      pickerLocation: { lat: 0, lng: 0, label: 'Unknown' },
      activePickups: [],
      createdAt: new Date().toISOString()
    };

    db.get('pickers').push(newPicker).write();

    const accessToken = Buffer.from(`${newPicker.id}:${Date.now()}`).toString('base64');

    return res.status(201).jsonp({
      accessToken,
      refreshToken: accessToken,
      userId: newPicker.id,
      email: newPicker.email,
      name: newPicker.name,
      role: 'picker',
      expiresIn: 3600
    });
  } else {
    const users = db.get('users').value();
    const existing = users.find(u => u.email === email);

    if (existing) {
      return res.status(400).jsonp({ error: 'User already exists' });
    }

    const newUser = {
      id: String(Math.max(...users.map(u => Number(u.id)), 0) + 1),
      name, email, password, phone,
      profilePicUrl: 'https://i.pravatar.cc/150?img=1',
      language: 'EN',
      locations: [],
      bins: [],
      pickups: [],
      badges: [],
      impact: { pickupsCount: 0, totalPoints: 0, co2SavedKg: 0 },
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.get('users').push(newUser).write();

    const accessToken = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

    return res.status(201).jsonp({
      accessToken,
      refreshToken: accessToken,
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: 'user',
      expiresIn: 3600
    });
  }
});

server.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).jsonp({ error: 'refreshToken required' });
  }
  let userId;
  try {
    userId = Buffer.from(refreshToken, 'base64').toString('utf8').split(':')[0];
  } catch (e) {
    return res.status(401).jsonp({ error: 'Invalid refresh token' });
  }

  const accessToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  const newRefreshToken = Buffer.from(`${userId}:refresh:${Date.now()}`).toString('base64');

  res.jsonp({
    accessToken,
    refreshToken: newRefreshToken,
    userId,
    expiresIn: 3600
  });
});

server.post('/auth/logout', (req, res) => {
  // Stateless mock — nothing to invalidate server-side.
  res.status(204).end();
});

// =====================================================
// 📚 DATA MODELS DOCUMENTATION ENDPOINTS
// =====================================================

server.get('/docs/user-models', (req, res) => {
  res.jsonp({
    title: 'RecyCare User App - Data Models Documentation',
    version: '1.0.0',
    description: 'Complete reference for 25+ Kotlin/Java data models in the RecyCare Android app',
    lastUpdated: '2026-09-09',
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

server.get('/docs/models/all', (req, res) => {
  res.jsonp({
    title: 'RecyCare - Complete Data Models Reference',
    description: '25+ Kotlin/Java data models for the user-facing recycling app',
    totalModels: 25,
    keyPoints: {
      pointsFormula: '1kg recycled = 10 points',
      badgeLevels: '1=Bronze, 2=Silver, 3=Gold, 4=Platinum',
      badgeRarity: 'COMMON, UNCOMMON, RARE, EPIC, LEGENDARY',
      pickupStatus: 'upcoming → in_progress → completed (or cancelled)',
      languages: 'EN (English), FR (French), AR (Arabic)',
      materialTypes: 'PLASTIC, GLASS, PAPER, METAL'
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
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// DEFAULT ROUTES (fallback for anything not overridden above)
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
`);
});
