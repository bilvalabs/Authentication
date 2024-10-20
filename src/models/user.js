const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Assuming username is an email
  password: { type: String, required: true }, // Stored in plain text
  sessionID: { type: String, default: null }
});

module.exports = mongoose.model('User', userSchema);
