const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/internship";
  try {
    await mongoose.connect(primaryUri);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Primary Connection Failed:", error.message);
    const localUri = "mongodb://127.0.0.1:27017/internship";
    if (primaryUri !== localUri) {
      console.log("Attempting fallback to local MongoDB...");
      try {
        await mongoose.connect(localUri);
        console.log("MongoDB Connected Successfully (Local Fallback)");
        return;
      } catch (localErr) {
        console.error("Local MongoDB Connection Failed:", localErr.message);
      }
    }
    process.exit(1);
  }
};

module.exports = connectDB;