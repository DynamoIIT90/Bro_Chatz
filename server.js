// server.js
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Default route → serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Bro Chatz notice site running on port ${PORT}`);
});
