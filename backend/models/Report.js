const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    commentId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: "Flagged for administrator review"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
