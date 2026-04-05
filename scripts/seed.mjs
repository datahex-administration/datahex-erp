/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed script for Datahex ERP
 * Run: node scripts/seed.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://username:password@cluster.mongodb.net/datahex-erp?retryWrites=true&w=majority";

// ---- Schemas (inline for standalone script) ----

const CompanySchema = new mongoose.Schema({
  name: String,
  code: { type: String, unique: true, uppercase: true },
  address: String,
  logo: String,
  currency: { type: String, default: "INR" },
  settings: {
    leavePolicy: {
      sick: { type: Number, default: 12 },
      casual: { type: Number, default: 12 },
      earned: { type: Number, default: 15 },
    },
    financialYearStart: { type: Number, default: 4 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  pin: String,
  role: { type: String, enum: ["super_admin", "manager", "staff"], default: "staff" },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  permissions: [String],
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true });

const EmployeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  employeeId: { type: String, unique: true },
  name: String,
  email: String,
  phone: String,
  designation: String,
  type: { type: String, enum: ["director", "staff", "intern"], default: "staff" },
  department: String,
  joiningDate: Date,
  endDate: Date,
  salary: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  bankDetails: { bankName: String, accountNumber: String, ifsc: String, accountHolder: String },
  documents: [{ name: String, url: String, uploadedAt: Date }],
  status: { type: String, enum: ["active", "resigned", "terminated", "intern_completed"], default: "active" },
}, { timestamps: true });

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Employee = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);

async function seed() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  // Clear existing data
  await Company.deleteMany({});
  await User.deleteMany({});
  await Employee.deleteMany({});
  console.log("🗑️  Cleared existing data\n");

  // Create companies
  const datahex = await Company.create({
    name: "Datahex Technologies",
    code: "DTX",
    address: "Kerala, India",
    currency: "INR",
  });

  const bahrain = await Company.create({
    name: "Bahrain Project",
    code: "BHR",
    address: "Bahrain",
    currency: "BHD",
  });

  console.log(`🏢 Created companies: ${datahex.name}, ${bahrain.name}\n`);

  // Create users
  const adminPin = await bcrypt.hash("123456", 12);
  const managerPin = await bcrypt.hash("654321", 12);
  const staffPin = await bcrypt.hash("111111", 12);

  const admin = await User.create({
    name: "Admin",
    email: "admin@datahex.com",
    pin: adminPin,
    role: "super_admin",
    companyId: datahex._id,
    permissions: ["*"],
  });

  const manager = await User.create({
    name: "Manager",
    email: "manager@datahex.com",
    pin: managerPin,
    role: "manager",
    companyId: datahex._id,
    permissions: [
      "employees:read", "employees:create", "employees:update",
      "salary:read", "salary:create", "salary:approve",
      "leaves:read", "leaves:approve",
      "projects:read", "projects:create", "projects:update",
      "clients:read", "clients:create",
      "invoices:read", "invoices:create",
      "expenses:read", "expenses:create", "expenses:approve",
      "subscriptions:read", "subscriptions:create",
      "messages:read", "messages:create",
      "reports:read", "reports:export",
      "users:read", "settings:read",
    ],
  });

  const staff = await User.create({
    name: "Staff User",
    email: "staff@datahex.com",
    pin: staffPin,
    role: "staff",
    companyId: datahex._id,
    permissions: [
      "employees:read", "leaves:read", "leaves:create",
      "projects:read", "messages:read", "messages:create",
    ],
  });

  console.log("👥 Created users:");
  console.log("   Admin:   admin@datahex.com   / PIN: 123456");
  console.log("   Manager: manager@datahex.com / PIN: 654321");
  console.log("   Staff:   staff@datahex.com   / PIN: 111111\n");

  // Create employees
  const employees = await Employee.insertMany([
    {
      userId: admin._id,
      companyId: datahex._id,
      employeeId: "DTX-001",
      name: "Admin",
      email: "admin@datahex.com",
      designation: "Director",
      type: "director",
      department: "Management",
      joiningDate: new Date("2022-01-01"),
      salary: 100000,
      currency: "INR",
    },
    {
      userId: manager._id,
      companyId: datahex._id,
      employeeId: "DTX-002",
      name: "Manager",
      email: "manager@datahex.com",
      designation: "Project Manager",
      type: "staff",
      department: "Operations",
      joiningDate: new Date("2022-06-15"),
      salary: 60000,
      currency: "INR",
    },
    {
      userId: staff._id,
      companyId: datahex._id,
      employeeId: "DTX-003",
      name: "Staff User",
      email: "staff@datahex.com",
      designation: "Software Developer",
      type: "staff",
      department: "Engineering",
      joiningDate: new Date("2023-03-01"),
      salary: 40000,
      currency: "INR",
    },
    {
      companyId: datahex._id,
      employeeId: "DTX-004",
      name: "Intern Developer",
      email: "intern@datahex.com",
      designation: "Intern",
      type: "intern",
      department: "Engineering",
      joiningDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      salary: 10000,
      currency: "INR",
    },
    {
      companyId: bahrain._id,
      employeeId: "BHR-001",
      name: "Bahrain Manager",
      email: "bhr-manager@datahex.com",
      designation: "Project Lead",
      type: "staff",
      department: "Operations",
      joiningDate: new Date("2024-01-01"),
      salary: 800,
      currency: "BHD",
    },
  ]);

  console.log(`👨‍💻 Created ${employees.length} employees\n`);

  console.log("✅ Seed completed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("You can now login with:");
  console.log("  Email: admin@datahex.com");
  console.log("  PIN:   123456");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
