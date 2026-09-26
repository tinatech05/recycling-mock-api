const jsonServer = require('json-server');
const cors = require('cors');
const express = require('express');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 10000;

server.use(cors());
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Strip /api/v1 prefix for Android compatibility
server.use((req, res, next) => {
  if (req.url.startsWith('/api/v1')) {
    req.url = req.url.replace(/^\/api\/v1/, '') || '/';
  }
  next();
});

function getUserIdFromAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    return decoded.split(':')[0];
  } catch (e) {
    return null;
  }
}

function findById(collection, id) {
  return collection.find(item => String(item.id) === String(id));
}

function removeById(collection, id) {
  return collection.remove(item => String(item.id) === String(id));
}

// =====================================================
// /users/me routes (must come before /users/:userId)
// =====================================================

server.get('/users/me', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  res.jsonp(user);
});

server.put('/users/me', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  const updatedUser = findById(db.get('users'), userId)
    .assign({ ...req.body, updatedAt: new Date().toISOString() })
    .write();
  res.jsonp(updatedUser);
});

server.get('/users/me/locations', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  res.jsonp(user.locations || []);
});

server.post('/users/me/locations', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  const newLocation = {
    id: `loc-${Date.now()}`,
    label: req.body.label || 'Location',
    address: req.body.address || '',
    lat: req.body.lat || 0,
    lng: req.body.lng || 0
  };
  findById(db.get('users'), userId).get('locations').push(newLocation).write();
  res.status(201).jsonp(newLocation);
});

server.delete('/users/me/locations/:locationId', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  const locations = (user.locations || []).filter(l => String(l.id) !== String(req.params.locationId));
  findById(db.get('users'), userId).assign({ locations, updatedAt: new Date().toISOString() }).write();
  res.status(204).end();
});

server.get('/users/me/impact', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  res.jsonp(user.impact || { pickupsCount: 0, totalPoints: 0, co2SavedKg: 0 });
});

server.get('/users/me/badges', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  res.jsonp(user.badges || []);
});

server.put('/users/me/preferences', (req, res) => {
  const db = router.db;
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).jsonp({ error: 'Unauthorized' });
  const user = findById(db.get('users'), userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  findById(db.get('users'), userId)
    .assign({
      notificationsEnabled: req.body.notificationsEnabled,
      updatedAt: new Date().toISOString()
    })
    .write();
  res.status(204).end();
});

// =====================================================
// USERS CRUD
// =====================================================

server.get('/users', (req, res) => {
  res.jsonp(router.db.get('users').value());
});

server.get('/users/:userId', (req, res) => {
  const user = findById(router.db.get('users'), req.params.userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
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
    impact: req.body.impact || { pickupsCount: 0, totalPoints: 0, co2SavedKg: 0 },
    badges: req.body.badges || [],
    notificationsEnabled: req.body.notificationsEnabled !== undefined ? req.body.notificationsEnabled : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.get('users').push(newUser).write();
  res.status(201).jsonp(newUser);
});

server.put('/users/:userId', (req, res) => {
  const user = findById(router.db.get('users'), req.params.userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  const updatedUser = findById(router.db.get('users'), req.params.userId)
    .assign({ ...req.body, updatedAt: new Date().toISOString() })
    .write();
  res.jsonp(updatedUser);
});

server.delete('/users/:userId', (req, res) => {
  const user = findById(router.db.get('users'), req.params.userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  removeById(router.db.get('users'), req.params.userId).write();
  res.jsonp({ message: `User ${req.params.userId} deleted successfully` });
});

server.get('/users/:userId/pickups', (req, res) => {
  const pickups = router.db.get('pickups').value()
    .filter(p => String(p.userId) === String(req.params.userId));
  res.jsonp(pickups);
});

server.get('/users/:userId/bins', (req, res) => {
  const bins = router.db.get('bins').value()
    .filter(b => String(b.userId) === String(req.params.userId));
  res.jsonp(bins);
});

server.get('/users/:userId/pointsHistory', (req, res) => {
  const history = router.db.get('pointsHistory').value()
    .filter(h => String(h.userId) === String(req.params.userId));
  res.jsonp(history);
});

server.put('/users/:userId/notification-preferences', (req, res) => {
  const user = findById(router.db.get('users'), req.params.userId).value();
  if (!user) return res.status(404).jsonp({ error: 'User not found' });
  const updatedUser = findById(router.db.get('users'), req.params.userId)
    .assign({ notificationsEnabled: req.body.notificationsEnabled, updatedAt: new Date().toISOString() })
    .write();
  res.jsonp(updatedUser);
});

server.get('/users/:userId/balance', (req, res) => {
  const balance = router.db.get('userBalance')
    .find(b => String(b.userId) === String(req.params.userId)).value();
  if (!balance) return res.status(404).jsonp({ error: 'Balance not found' });
  res.jsonp(balance);
});

// =====================================================
// PICKERS CRUD
// =====================================================

server.get('/pickers', (req, res) => {
  res.jsonp(router.db.get('pickers').value());
});

server.get('/pickers/:pickerId', (req, res) => {
  const picker = findById(router.db.get('pickers'), req.params.pickerId).value();
  if (!picker) return res.status(404).jsonp({ error: 'Picker not found' });
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
  const picker = findById(router.db.get('pickers'), req.params.pickerId).value();
  if (!picker) return res.status(404).jsonp({ error: 'Picker not found' });
  const updatedPicker = findById(router.db.get('pickers'), req.params.pickerId).assign(req.body).write();
  res.jsonp(updatedPicker);
});

server.delete('/pickers/:pickerId', (req, res) => {
  const picker = findById(router.db.get('pickers'), req.params.pickerId).value();
  if (!picker) return res.status(404).jsonp({ error: 'Picker not found' });
  removeById(router.db.get('pickers'), req.params.pickerId).write();
  res.jsonp({ message: `Picker ${req.params.pickerId} deleted successfully` });
});

server.get('/pickers/:pickerId/location', (req, res) => {
  const picker = findById(router.db.get('pickers'), req.params.pickerId).value();
  if (!picker) return res.status(404).jsonp({ error: 'Picker not found' });
  res.jsonp(picker.pickerLocation || null);
});

// =====================================================
// BINS CRUD
// =====================================================

server.get('/bins/summary', (req, res) => {
  let bins = router.db.get('bins').value();
  const { userId } = req.query;
  if (userId) bins = bins.filter(b => String(b.userId) === String(userId));

  const totalBins = bins.length;
  const activeBins = bins.filter(b => b.status === 'ACTIVE').length;
  const fullBins = bins.filter(b => b.status === 'FULL').length;
  const nearFullBins = bins.filter(b => (b.fillPercent || 0) >= 80).length;
  const totalCapacityKg = bins.reduce((sum, b) => sum + (b.capacityKg || 0), 0);
  const totalCurrentWeightKg = bins.reduce((sum, b) => sum + (b.currentWeightKg || 0), 0);
  const averageFillPercent = totalBins > 0
    ? bins.reduce((sum, b) => sum + (b.fillPercent || 0), 0) / totalBins
    : 0;

  res.jsonp([{
    totalBins,
    activeBins,
    fullBins,
    nearFullBins,
    totalCapacityKg,
    totalCurrentWeightKg,
    averageFillPercent
  }]);
});

server.get('/bins', (req, res) => {
  let bins = router.db.get('bins').value();
  const { userId, type, status } = req.query;
  if (userId) bins = bins.filter(b => String(b.userId) === String(userId));
  if (type) bins = bins.filter(b => b.type.toLowerCase() === type.toLowerCase());
  if (status) bins = bins.filter(b => b.status === status);
  res.jsonp(bins);
});

server.get('/bins/:binId', (req, res) => {
  const bin = findById(router.db.get('bins'), req.params.binId).value();
  if (!bin) return res.status(404).jsonp({ error: 'Bin not found' });
  res.jsonp(bin);
});

server.post('/bins', (req, res) => {
  const db = router.db;
  const bins = db.get('bins').value();
  const userId = req.body.userId || getUserIdFromAuth(req);

  const newBin = {
    id: String(Math.max(...bins.map(b => Number(b.id)), 0) + 1),
    userId,
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
  const bin = findById(router.db.get('bins'), req.params.binId).value();
  if (!bin) return res.status(404).jsonp({ error: 'Bin not found' });
  const updatedBin = findById(router.db.get('bins'), req.params.binId)
    .assign({ ...req.body, updatedAt: new Date().toISOString() })
    .write();
  res.jsonp(updatedBin);
});

server.delete('/bins/:binId', (req, res) => {
  const bin = findById(router.db.get('bins'), req.params.binId).value();
  if (!bin) return res.status(404).jsonp({ error: 'Bin not found' });
  removeById(router.db.get('bins'), req.params.binId).write();
  res.jsonp({ message: `Bin ${req.params.binId} deleted successfully` });
});

// =====================================================
// PICKUPS CRUD
// =====================================================

server.get('/pickups', (req, res) => {
  let pickups = router.db.get('pickups').value();
  const { userId, pickerId, status } = req.query;
  if (userId) pickups = pickups.filter(p => String(p.userId) === String(userId));
  if (pickerId) pickups = pickups.filter(p => String(p.pickerId) === String(pickerId));
  if (status) pickups = pickups.filter(p => p.status === status);
  res.jsonp(pickups);
});

server.get('/pickups/:pickupId', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
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
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  const updatedPickup = findById(router.db.get('pickups'), req.params.pickupId)
    .assign({ ...req.body, updatedAt: new Date().toISOString() })
    .write();
  res.jsonp(updatedPickup);
});

server.delete('/pickups/:pickupId', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  removeById(router.db.get('pickups'), req.params.pickupId).write();
  res.jsonp({ message: `Pickup ${req.params.pickupId} deleted successfully` });
});

server.put('/pickups/:pickupId/cancel', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  const updatedPickup = findById(router.db.get('pickups'), req.params.pickupId)
    .assign({
      status: 'cancelled',
      cancellationReason: req.body.cancellationReason || req.body.reason || 'Cancelled by user',
      updatedAt: new Date().toISOString()
    })
    .write();
  res.jsonp(updatedPickup);
});

server.put('/pickups/:pickupId/reschedule', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  const updatedPickup = findById(router.db.get('pickups'), req.params.pickupId)
    .assign({
      scheduledDate: req.body.scheduledDate || req.body.newDate,
      updatedAt: new Date().toISOString()
    })
    .write();
  res.jsonp(updatedPickup);
});

server.post('/pickups/:pickupId/rate', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  const updatedPickup = findById(router.db.get('pickups'), req.params.pickupId)
    .assign({
      rating: req.body.rating,
      review: req.body.review || req.body.comment,
      updatedAt: new Date().toISOString()
    })
    .write();
  res.jsonp(updatedPickup);
});

server.get('/pickups/:pickupId/track', (req, res) => {
  const pickup = findById(router.db.get('pickups'), req.params.pickupId).value();
  if (!pickup) return res.status(404).jsonp({ error: 'Pickup not found' });
  res.jsonp(pickup);
});

server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = req.params.pickupId;
  const pickup = findById(db.get('pickups'), pickupId).value();
  if (!pickup) return res.status(404).jsonp({ message: 'Pickup not found' });

  const weightKg = req.body.weightKg != null ? req.body.weightKg : pickup.actualWeightKg;
  const points = req.body.points != null ? req.body.points : 25;

  const updatedPickup = findById(db.get('pickups'), pickupId)
    .assign({
      status: 'completed',
      actualWeightKg: weightKg,
      weightVerified: true,
      pointsAwarded: points,
      updatedAt: new Date().toISOString()
    })
    .write();

  const userId = pickup.userId;
  const user = findById(db.get('users'), userId).value();
  if (user) {
    const updatedPoints = (user.impact && user.impact.totalPoints ? user.impact.totalPoints : 0) + points;
    const pickupsCount = (user.impact && user.impact.pickupsCount ? user.impact.pickupsCount : 0) + 1;
    findById(db.get('users'), userId)
      .assign({
        impact: {
          ...(user.impact || {}),
          totalPoints: updatedPoints,
          pickupsCount
        },
        updatedAt: new Date().toISOString()
      })
      .write();
    db.get('pointsHistory').push({
      id: Date.now(),
      userId,
      type: 'pickup_completed',
      value: points,
      source: `Pickup #${pickupId}`,
      date: new Date().toISOString()
    }).write();

    const balance = db.get('userBalance').find(b => String(b.userId) === String(userId)).value();
    if (balance) {
      db.get('userBalance')
        .find(b => String(b.userId) === String(userId))
        .assign({
          totalPoints: (balance.totalPoints || 0) + points,
          availablePoints: (balance.availablePoints || 0) + points
        })
        .write();
    }
  }
  res.jsonp(updatedPickup);
});

// =====================================================
// POINTS HISTORY
// =====================================================

server.get('/pointsHistory', (req, res) => {
  let history = router.db.get('pointsHistory').value();
  const { userId } = req.query;
  if (userId) history = history.filter(h => String(h.userId) === String(userId));
  res.jsonp(history);
});

server.post('/pointsHistory', (req, res) => {
  const newEntry = {
    id: Date.now(),
    userId: req.body.userId,
    type: req.body.type || 'pickup_completed',
    value: req.body.value || 0,
    source: req.body.source || '',
    date: new Date().toISOString()
  };
  router.db.get('pointsHistory').push(newEntry).write();
  res.status(201).jsonp(newEntry);
});

// =====================================================
// COUPONS
// Catalog stays shared; per-user state lives in couponRedemptions.
// =====================================================

function ensureCouponRedemptions(db) {
  if (!db.has('couponRedemptions').value()) {
    db.set('couponRedemptions', []).write();
  }
}

function couponsForUser(db, userId) {
  ensureCouponRedemptions(db);
  const redemptions = db.get('couponRedemptions').value() || [];
  return (db.get('coupons').value() || []).map(c => {
    const red = userId
      ? redemptions.find(r =>
          String(r.userId) === String(userId) && String(r.couponId) === String(c.id))
      : null;
    return {
      ...c,
      isRedeemed: !!red,
      redeemedDate: red ? red.redeemedDate : 0,
      usageCount: red ? (red.usageCount || 1) : 0,
      couponCode: red && red.couponCode ? red.couponCode : c.couponCode
    };
  });
}

server.get('/coupons', (req, res) => {
  const db = router.db;
  const { userId } = req.query;
  res.jsonp(couponsForUser(db, userId));
});

server.get('/coupons/:couponId', (req, res) => {
  const db = router.db;
  const { userId } = req.query;
  const coupon = couponsForUser(db, userId)
    .find(c => String(c.id) === String(req.params.couponId));
  if (!coupon) return res.status(404).jsonp({ error: 'Coupon not found' });
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
  const coupon = findById(router.db.get('coupons'), req.params.couponId).value();
  if (!coupon) return res.status(404).jsonp({ error: 'Coupon not found' });
  const updatedCoupon = findById(router.db.get('coupons'), req.params.couponId).assign(req.body).write();
  res.jsonp(updatedCoupon);
});

server.delete('/coupons/:couponId', (req, res) => {
  const coupon = findById(router.db.get('coupons'), req.params.couponId).value();
  if (!coupon) return res.status(404).jsonp({ error: 'Coupon not found' });
  removeById(router.db.get('coupons'), req.params.couponId).write();
  res.jsonp({ message: `Coupon ${req.params.couponId} deleted successfully` });
});

server.post('/coupons/:couponId/redeem', (req, res) => {
  const db = router.db;
  ensureCouponRedemptions(db);

  const userId = req.body && req.body.userId;
  if (!userId) {
    return res.status(400).jsonp({ error: 'userId is required' });
  }

  const coupon = findById(db.get('coupons'), req.params.couponId).value();
  if (!coupon) return res.status(404).jsonp({ error: 'Coupon not found' });

  if (coupon.expirationDate && Date.now() > Number(coupon.expirationDate)) {
    return res.status(400).jsonp({ error: 'Coupon expired' });
  }

  const already = db.get('couponRedemptions').value().find(r =>
    String(r.userId) === String(userId) && String(r.couponId) === String(coupon.id));
  if (already) {
    return res.status(400).jsonp({ error: 'Coupon already redeemed' });
  }

  const balance = db.get('userBalance').find(b => String(b.userId) === String(userId)).value();
  if (!balance) {
    return res.status(404).jsonp({ error: 'Balance not found' });
  }
  if ((balance.availablePoints || 0) < (coupon.pointsCost || 0)) {
    return res.status(400).jsonp({ error: 'Not enough points' });
  }

  const redeemedDate = Date.now();
  db.get('userBalance')
    .find(b => String(b.userId) === String(userId))
    .assign({ availablePoints: balance.availablePoints - coupon.pointsCost })
    .write();

  const redemption = {
    id: String(Date.now()),
    userId: String(userId),
    couponId: String(coupon.id),
    couponCode: coupon.couponCode,
    redeemedDate,
    usageCount: 1
  };
  db.get('couponRedemptions').push(redemption).write();

  res.jsonp({
    ...coupon,
    isRedeemed: true,
    redeemedDate,
    usageCount: 1,
    couponCode: coupon.couponCode
  });
});

// =====================================================
// REVIEWS, NOTIFICATIONS, LEADERBOARD, etc.
// =====================================================

server.get('/reviews', (req, res) => {
  let reviews = router.db.get('reviews').value();
  const { pickupId, pickerId } = req.query;
  if (pickupId) reviews = reviews.filter(r => String(r.pickupId) === String(pickupId));
  if (pickerId) reviews = reviews.filter(r => String(r.pickerId) === String(pickerId));
  res.jsonp(reviews);
});

server.get('/notifications', (req, res) => {
  let notifications = router.db.get('notifications').value();
  const { userId } = req.query;
  if (userId) notifications = notifications.filter(n => String(n.userId) === String(userId));
  res.jsonp(notifications);
});

server.get('/leaderboard', (req, res) => {
  let leaderboard = router.db.get('leaderboard').value();
  const { limit } = req.query;
  if (limit) leaderboard = leaderboard.slice(0, parseInt(limit, 10));
  res.jsonp(leaderboard);
});

server.get('/picker-performance', (req, res) => {
  let performance = router.db.get('pickerPerformance').value();
  const { pickerId, month } = req.query;
  if (pickerId) performance = performance.filter(p => String(p.pickerId) === String(pickerId));
  if (month) performance = performance.filter(p => p.month === month);
  res.jsonp(performance);
});

server.get('/picker-goals', (req, res) => {
  let goals = router.db.get('pickerGoals').value();
  const { pickerId, month, status } = req.query;
  if (pickerId) goals = goals.filter(g => String(g.pickerId) === String(pickerId));
  if (month) goals = goals.filter(g => g.month === month);
  if (status) goals = goals.filter(g => g.status === status);
  res.jsonp(goals);
});

server.get('/earnings', (req, res) => {
  let earnings = router.db.get('earnings').value();
  const { pickerId, month } = req.query;
  if (pickerId) earnings = earnings.filter(e => String(e.pickerId) === String(pickerId));
  if (month) earnings = earnings.filter(e => (e.date || '').startsWith(month));
  res.jsonp(earnings);
});

server.get('/rewards', (req, res) => {
  let rewards = router.db.get('rewards').value();
  const { userId } = req.query;
  if (userId) rewards = rewards.filter(r => String(r.userId) === String(userId));
  res.jsonp(rewards);
});

// =====================================================
// AUTH
// =====================================================

function handleAuthRegister(req, res) {
  const db = router.db;
  const { name, email, password, phone, role } = req.body;

  if (role === 'picker') {
    const pickers = db.get('pickers').value();
    if (pickers.find(p => p.email === email)) {
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
  }

  const users = db.get('users').value();
  if (users.find(u => u.email === email)) {
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

server.post('/auth/login', (req, res) => {
  const db = router.db;
  const { email, password, role } = req.body;
  let user;
  if (role === 'picker') {
    user = db.get('pickers').find(p => p.email === email && p.password === password).value();
  } else {
    user = db.get('users').find(u => u.email === email && u.password === password).value();
  }
  if (!user) return res.status(401).jsonp({ error: 'Invalid credentials' });
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

server.post('/auth/register', handleAuthRegister);

server.post('/auth/register/user', (req, res) => {
  req.body.role = 'user';
  handleAuthRegister(req, res);
});

server.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).jsonp({ error: 'refreshToken required' });
  let userId;
  try {
    userId = Buffer.from(refreshToken, 'base64').toString('utf8').split(':')[0];
  } catch (e) {
    return res.status(401).jsonp({ error: 'Invalid refresh token' });
  }
  const accessToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  const newRefreshToken = Buffer.from(`${userId}:refresh:${Date.now()}`).toString('base64');
  res.jsonp({ accessToken, refreshToken: newRefreshToken, userId, expiresIn: 3600 });
});

server.post('/auth/logout', (req, res) => {
  res.status(204).end();
});

server.get('/health', (req, res) => {
  res.jsonp({
    status: 'OK',
    message: 'Recycling Mock API is running',
    timestamp: new Date().toISOString()
  });
});

server.use(router);

server.listen(port, '0.0.0.0', () => {
  console.log(`Recycling Mock API running on http://0.0.0.0:${port}`);
});
