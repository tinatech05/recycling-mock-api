const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 10000;

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Utility for slight random movement
function randomShift(value) {
  const delta = (Math.random() * 0.0008) - 0.0004; 
  return value + delta;
}

/**
 * 🔵 NEW ENDPOINT: Picker Live Location (mock moving tracker)
 * GET /pickers/:pickerId/location
 * Returns: { id, pickerId, lat, lng, updatedAt }
 */
server.get('/pickers/:pickerId/location', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);

  // Get picker’s last saved location
  const picker = db.get('pickers').find({ id: pickerId }).value();

  if (!picker) {
    return res.status(404).jsonp({ message: "Picker not found" });
  }

  // If db.json doesn't contain coordinates → generate static base
  if (!picker.lat || !picker.lng) {
    picker.lat = 36.7535; 
    picker.lng = 3.0580;
  }

  // Apply small random movement
  picker.lat = randomShift(picker.lat);
  picker.lng = randomShift(picker.lng);

  // Save updated coords to db.json
  db.get('pickers')
    .find({ id: pickerId })
    .assign({ lat: picker.lat, lng: picker.lng })
    .write();

  const response = {
    id: pickerId,
    pickerId: pickerId,
    lat: picker.lat,
    lng: picker.lng,
    updatedAt: new Date().toISOString()
  };

  res.jsonp(response);
});

/* =====================================================
   ⭐ EXISTING ROUTES (unchanged except formatting)
   ===================================================== */

// Get all pickups for a user
server.get('/users/:userId/pickups', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const pickups = db.get('pickups').filter({ userId }).value();
  res.jsonp(pickups);
});

// Get bins for a user
server.get('/users/:userId/bins', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const bins = db.get('bins').filter({ userId }).value();
  res.jsonp(bins);
});

// Points history
server.get('/users/:userId/pointsHistory', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const points = db.get('pointsHistory').filter({ userId }).value();
  res.jsonp(points);
});

// Filter bins by type
server.get('/bins', (req, res) => {
  const db = router.db;
  const { type } = req.query;

  let bins = db.get('bins').value();
  if (type) bins = bins.filter(b => b.type.toLowerCase() === type.toLowerCase());

  res.jsonp(bins);
});

// Confirm pickup + award points
server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);
  const pickup = db.get('pickups').find({ id: pickupId }).value();

  if (!pickup) {
    res.status(404).jsonp({ message: 'Pickup not found' });
    return;
  }

  db.get('pickups')
    .find({ id: pickupId })
    .assign({ status: 'done', weightKg: req.body.weightKg || 0 })
    .write();

  const userId = pickup.userId;
  const user = db.get('users').find({ id: userId }).value();

  if (user) {
    const pointsToAdd = req.body.points || 10;
    const newPoints = (user.totalPoints || 0) + pointsToAdd;

    db.get('users').find({ id: userId }).assign({ totalPoints: newPoints }).write();

    db.get('pointsHistory')
      .push({
        id: Date.now(),
        userId,
        source: 'pickup_completed',
        points: pointsToAdd,
        date: new Date().toISOString(),
      })
      .write();
  }

  res.jsonp({ message: 'Pickup confirmed and points updated' });
});

// Default JSON Server routes
server.use(router);

server.listen(port, () => {
  console.log(`🚀 JSON Server mock API running on port ${port}`);
});
