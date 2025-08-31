const mongoose = require("mongoose");

const logSchema = new mongoose.schema({
  date: {
    type: String,
  },
  ip: {
    type: String,
  },
  userinfo: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const Log = mongoose.model("log", logSchema);

module.exports = Log;
