const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 10000;

server.use(middlewares);
server.use(jsonServer.bodyParser);

// In-memory storage for route steps (since meta doesn't exist in db.json)
const routeSteps = {};

/* =====================================================
   🔵 PICKER LIVE LOCATION ENDPOINT (uses PickerLocationModel)
   ===================================================== */
server.get('/pickers/:pickerId/location', (req, res) => {
  const db = router.db;
  const pickerId = req.params.pickerId;

  const route = db.get('pickerRoutes').get(pickerId).value();
  if (!route) {
    return res.status(404).jsonp({ error: "Route not found for this picker" });
  }

  // Get current step from memory (default to 0)
  let step = routeSteps[pickerId] || 0;

  // Get the current point on the route
  const point = route[step];

  console.log(`🚗 Picker ${pickerId} - Step ${step}/${route.length - 1} - Position: ${point.lat}, ${point.lng}`);

  // Update step (loop back to start when route ends)
  const nextStep = (step + 1) % route.length;
  routeSteps[pickerId] = nextStep;

  // Update pickerLocation inside picker
  db.get('pickers')
    .find({ id: parseInt(pickerId) })
    .assign({
      pickerLocation: {
        lat: point.lat,
        lng: point.lng,
        label: `Moving to user - Step ${step + 1}/${route.length}`,
        lastUpdated: new Date().toISOString()
      }
    })
    .write();

  // Response for Android
  res.jsonp({
    pickerId: pickerId,
    lat: point.lat,
    lng: point.lng,
    updatedAt: new Date().toISOString()
  });
});

/* =====================================================
   🔵 RESET PICKER ROUTE (for testing)
   ===================================================== */
server.post('/pickers/:pickerId/resetRoute', (req, res) => {
  const pickerId = req.params.pickerId;
  routeSteps[pickerId] = 0;
  console.log(`🔄 Reset route for picker ${pickerId}`);
  res.jsonp({ message: `Route reset for picker ${pickerId}` });
});

/* =====================================================
   🔵 GET FULL LOCATION HISTORY (PickerLocationModel[])
   ===================================================== */
server.get('/pickers/:pickerId/locations', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);

  const picker = db.get('pickers').find({ id: pickerId }).value();
  if (!picker) return res.status(404).jsonp({ message: "Picker not found" });

  res.jsonp(picker.locations || []);
});

/* =====================================================
   🔵 GET LATEST PICKER LOCATION (PickerLocationModel)
   ===================================================== */
server.get('/pickers/:pickerId/location/latest', (req, res) => {
  const db = router.db;
  const pickerId = parseInt(req.params.pickerId);

  const picker = db.get('pickers').find({ id: pickerId }).value();
  if (!picker) return res.status(404).jsonp({ message: "Picker not found" });

  const locations = picker.locations || [];
  if (locations.length === 0) {
    return res.status(404).jsonp({ message: "No location data found" });
  }

  res.jsonp(locations[locations.length - 1]);
});

/* =====================================================
   ⭐ USER ROUTES
   ===================================================== */

// Get pickups for a user
server.get('/users/:userId/pickups', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const pickups = db.get('pickups').filter({ userId }).value();
  res.jsonp(pickups);
});

// Get bins for a user (Fix: bins store IDs inside user, not userId inside bin)
server.get('/users/:userId/bins', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);

  const user = db.get('users').find({ id: userId }).value();
  if (!user || !user.bins) return res.jsonp([]);

  const bins = db.get('bins')
    .filter(bin => user.bins.includes(bin.id))
    .value();

  res.jsonp(bins);
});

// Get user points history
server.get('/users/:userId/pointsHistory', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const points = db.get('pointsHistory').filter({ userId }).value();
  res.jsonp(points);
});

/* =====================================================
   ⭐ BINS FILTER
   ===================================================== */
server.get('/bins', (req, res) => {
  const db = router.db;
  const { type } = req.query;

  let bins = db.get('bins').value();
  if (type) bins = bins.filter(b => b.type.toLowerCase() === type.toLowerCase());

  res.jsonp(bins);
});

/* =====================================================
   ⭐ PICKUP CONFIRMATION + POINT AWARD
   ===================================================== */
server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);

  const pickup = db.get('pickups').find({ id: pickupId }).value();
  if (!pickup) return res.status(404).jsonp({ message: 'Pickup not found' });

  // Update pickup
  db.get('pickups')
    .find({ id: pickupId })
    .assign({
      status: 'done',
      picker_weight_kg: req.body.weightKg || 0,
      user_weight_kg: req.body.weightKg || 0,
      weight_verified: true
    })
    .write();

  // Award points to user
  const userId = pickup.userId;
  const user = db.get('users').find({ id: userId }).value();

  if (user) {
    const points = req.body.points || 10;
    const updated = (user.totalPoints || 0) + points;

    db.get('users').find({ id: userId }).assign({ totalPoints: updated }).write();

    db.get('pointsHistory')
      .push({
        id: Date.now(),
        userId,
        source: 'pickup_completed',
        points,
        date: new Date().toISOString()
      })
      .write();
  }

  res.jsonp({ message: 'Pickup confirmed and points updated' });
});

/* =====================================================
   ⭐ DEFAULT ROUTES
   ===================================================== */
server.use(router);

server.listen(port, () => {
  console.log(`🚀 JSON Server mock API running on port ${port}`);
  console.log(`📍 Route tracking initialized for pickers`);
});
