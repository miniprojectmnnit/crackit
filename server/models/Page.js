const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema({
  page_url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  raw_article_text: { type: String, default: "" },

  question_ids: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Question" }
  ],

  source_site: { type: String },

  date_extracted: { type: Date, default: Date.now }

});

module.exports = mongoose.model("Page", pageSchema);