const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  name: { type: String }, // User's name
  telname: { type: String },
  year: { type: Number },
  vposter: { type: String },
  hposter: { type: String },
  imdb: { type: String },
});

const movie = mongoose.model("movie", movieSchema);

module.exports = movie;
