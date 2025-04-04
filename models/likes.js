const mongoose = require("mongoose");

const likesSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  commentid: { type: mongoose.Schema.Types.ObjectId, ref: "Commentu" },
});

const Like = mongoose.model("Like", likesSchema);
module.exports = Like;
