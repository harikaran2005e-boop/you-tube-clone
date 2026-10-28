const mongoose = require("mongoose");

const moderationRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModerationRecord", moderationRecordSchema);
