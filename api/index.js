const novax = require('novaxjs2');
const { AccessToken } = require('livekit-server-sdk');
const crypto = require('crypto');
require('dotenv').config();
const path = require('path');
const app = new novax();

// Serve your HTML, CSS, and JS files from the root directory
app.serveStatic();
app.cors({ origins: ['*'] });

async function createToken({ identity, name, room }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity, name });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true, // Everyone can speak in this setup
    canSubscribe: true
  });
  return await at.toJwt();
}

app.get('/', (req, res) => app.sendFile(path.join(__dirname, '../public/create.html'), res));

// 1. Create Room API Endpoint
app.post('/api/create-room', (req, res) => {
  const roomId = crypto.randomUUID().substring(0, 8); // Short clean ID
  res.json({ success: true, roomId });
});

// 2. Generate LiveKit Token Endpoint
app.post('/api/join-room', async (req, res) => {
  try {
    const { roomId, name } = req.body;
    if (!roomId || !name) {
      return res.status(400).json({ success: false, error: 'Missing roomId or name' });
    }

    const identity = `user-${crypto.randomBytes(3).toString('hex')}`;
    const token = await createToken({ identity, name, room: roomId });

    res.json({
      success: true,
      token,
      wsUrl: process.env.LIVEKIT_URL
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.at(3000, () => console.log('SpaceT Server UI running on http://localhost:3000'));
module.exports = (req, res) => {
  app.server.emit('request', req);
}