/**
 * Create a customer_success user in the live database.
 * Run: MONGODB_URI="your-uri" node scripts/create-cs-user.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://hi:owOF2zCPTR6J24b0@cluster0.6thpa.mongodb.net/datahex-erp?retryWrites=true&w=majority&appName=Cluster0";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  pin: String,
  role: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  permissions: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Get the first company
  const company = await mongoose.connection.db.collection("companies").findOne({});
  if (!company) {
    console.error("No company found! Run the seed script first.");
    process.exit(1);
  }
  console.log("Using company:", company.name, company._id.toString());

  // Check if user already exists
  const existing = await User.findOne({ email: "cs@datahex.com" });
  if (existing) {
    console.log("User cs@datahex.com already exists! ID:", existing._id.toString());
    console.log("Role:", existing.role);
    await mongoose.disconnect();
    return;
  }

  // Create the user with PIN 123456
  const hashedPin = await bcrypt.hash("123456", 10);
  const user = await User.create({
    name: "Customer Success",
    email: "cs@datahex.com",
    pin: hashedPin,
    role: "customer_success",
    companyId: company._id,
    permissions: [
      "projects:read",
      "clients:read",
      "bugs:read",
      "bugs:create",
      "bugs:update",
      "messages:read",
      "messages:create",
    ],
    isActive: true,
  });

  console.log("✅ User created successfully!");
  console.log("   Email: cs@datahex.com");
  console.log("   PIN: 123456");
  console.log("   Role: customer_success");
  console.log("   ID:", user._id.toString());

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
