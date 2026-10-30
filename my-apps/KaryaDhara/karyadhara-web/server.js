require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { initSchema } = require('./db');
const authRoutes    = require('./routes/auth-routes');
const dataRoutes    = require('./routes/data-routes');
const passkeyRoutes = require('./routes/passkey-routes');
const otpRoutes     = require('./routes/otp-routes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', passkeyRoutes);
app.use('/api', otpRoutes);

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;
initSchema()
  .then(() => app.listen(PORT, () => console.log(`Karyadhara listening on port ${PORT}`)))
  .catch((e) => { console.error('Failed to initialize database schema:', e); process.exit(1); });
