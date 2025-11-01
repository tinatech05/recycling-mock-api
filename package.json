const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 10000;

server.use(middlewares);
server.use(jsonServer.bodyParser);

// 🧩 Custom Routes

// Get all pickups for a specific user
server.get('/users/:userId/pickups', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const pickups = db.get('pickups').filter({ userId }).value();
  res.jsonp(pickups);
});

// Get all bins owned by a specific user
server.get('/users/:userId/bins', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const bins = db.get('bins').filter({ userId }).value();
  res.jsonp(bins);
});

// Get all points history for a user
server.get('/users/:userId/pointsHistory', (req, res) => {
  const db = router.db;
  const userId = parseInt(req.params.userId);
  const points = db.get('pointsHistory').filter({ userId }).value();
  res.jsonp(points);
});

// Filter bins by type (e.g., /bins?type=plastic)
server.get('/bins', (req, res) => {
  const db = router.db;
  const { type } = req.query;
  let bins = db.get('bins').value();
  if (type) bins = bins.filter((b) => b.type.toLowerCase() === type.toLowerCase());
  res.jsonp(bins);
});

// Handle point increment after pickup confirmation
server.post('/pickups/:pickupId/confirm', (req, res) => {
  const db = router.db;
  const pickupId = parseInt(req.params.pickupId);
  const pickup = db.get('pickups').find({ id: pickupId }).value();

  if (!pickup) {
    res.status(404).jsonp({ message: 'Pickup not found' });
    return;
  }

  // Update pickup status
  db.get('pickups')
    .find({ id: pickupId })
    .assign({ status: 'done', weightKg: req.body.weightKg || 0 })
    .write();

  // Add points
  const userId = pickup.userId;
  const user = db.get('users').find({ id: userId }).value();
  if (user) {
    const newPoints = user.totalPoints + (req.body.points || 10);
    db.get('users').find({ id: userId }).assign({ totalPoints: newPoints }).write();

    db.get('pointsHistory')
      .push({
        id: Date.now(),
        userId,
        source: 'pickup_completed',
        points: req.body.points || 10,
        date: new Date().toISOString(),
      })
      .write();
  }

  res.jsonp({ message: 'Pickup confirmed and points updated' });
});

// Use default routes (e.g., /users, /bins, /pickups)
server.use(router);

server.listen(port, () => {
  console.log(`🚀 JSON Server running on port ${port}`);
});
