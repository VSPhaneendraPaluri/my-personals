require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { initSchema } = require('./db');
const authRoutes = require('./routes/auth-routes');
const dataRoutes = require('./routes/data-routes');

const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct secure-cookie / rate-limit behavior
app.use(helmet({ contentSecurityPolicy: false })); // CSP is set manually to keep the single-file frontend simple
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api', dataRoutes);

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Keep errors from ever leaking internals (stack traces, SQL, etc.) to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;
initSchema()
  .then(() => app.listen(PORT, () => console.log(`Karyadhara listening on port ${PORT}`)))
  .catch((e) => { console.error('Failed to initialize database schema:', e); process.exit(1); });
