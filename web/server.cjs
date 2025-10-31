const express = require('express');
const path = require('path');
const app = express();

const DIST = path.join(__dirname, 'dist');

app.get('/health', (_req, res) => res.type('text').send('ok'));

app.use('/peticoes', express.static(DIST, { index: false, maxAge: '1h' }));
app.get(['/peticoes', '/peticoes/*'], (_req, res) =>
  res.sendFile(path.join(DIST, 'index.html'))
);

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`web listening on http://0.0.0.0:${PORT}/peticoes`);
});
