/**
 * Simple script to run the web application example
 */

const express = require('express');
const path = require('path');

// Import the web app (we'll need to build it first)
const app = require('./web-app.ts');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Web application running on http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser to test the lyrics search`);
  console.log(`🔍 API endpoints available:`);
  console.log(`   - GET /api/search?q=song+artist`);
  console.log(`   - GET /api/lyrics/:id?synced=true&format=json`);
  console.log(`   - GET /api/health`);
});
