const https = require('https');
const path  = require('path');

// Load .env explicitly before anything else reads process.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = function (app) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY || '';

  if (!apiKey) {
    console.error('[TrueCap proxy] ✗ REACT_APP_ANTHROPIC_API_KEY missing — check .env');
  } else {
    console.log('[TrueCap proxy] ✓ Key loaded:', apiKey.slice(0, 16) + '...');
  }

  // Bypass http-proxy-middleware entirely. Own the full request cycle so the
  // API key header is guaranteed to be present and the body is never lost.
  app.use('/api/anthropic', (req, res) => {
    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk.toString(); });
    req.on('end', () => {
      const options = {
        hostname: 'api.anthropic.com',
        path:     req.path,          // e.g. /v1/messages
        method:   req.method,
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
          'content-length':    Buffer.byteLength(rawBody),
        },
      };

      console.log('[TrueCap proxy] → outgoing request body:', rawBody);
      console.log('[TrueCap proxy] →', req.method, options.path, '| key set:', !!apiKey);

      const proxyReq = https.request(options, (proxyRes) => {
        console.log('[TrueCap proxy] ←', proxyRes.statusCode);

        if (proxyRes.statusCode !== 200) {
          // Capture and log the full error body from Anthropic
          let errBody = '';
          proxyRes.on('data', (c) => { errBody += c; });
          proxyRes.on('end', () => {
            console.error('[TrueCap proxy] Anthropic error body:', errBody);
            res.writeHead(proxyRes.statusCode, { 'content-type': 'application/json' });
            res.end(errBody);
          });
        } else {
          res.writeHead(200, { 'content-type': 'application/json' });
          proxyRes.pipe(res);
        }
      });

      proxyReq.on('error', (err) => {
        console.error('[TrueCap proxy] request error:', err.message);
        res.status(500).json({ error: err.message });
      });

      proxyReq.write(rawBody);
      proxyReq.end();
    });
  });
};
