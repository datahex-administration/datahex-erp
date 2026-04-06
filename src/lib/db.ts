import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
const CONNECTION_OPTIONS = {
  autoIndex: false,
  bufferCommands: false,
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 10_000,
} as const;
const CONNECTION_CHECK_TIMEOUT_MS = 2_000;

let connectionPromise: Promise<typeof mongoose> | null = null;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function reuseHealthyConnection() {
  const admin = mongoose.connection.db?.admin();

  if (!admin) {
    console.warn("connectDB:open-connection-missing-admin");
    await mongoose.disconnect().catch(() => undefined);
    return false;
  }

  try {
    await withTimeout(admin.command({ ping: 1 }), CONNECTION_CHECK_TIMEOUT_MS, "mongoose ping");
    console.log("connectDB:connection-healthy");
    return true;
  } catch (error) {
    console.warn("connectDB:stale-open-connection", error);
    await mongoose.disconnect().catch(() => undefined);
    return false;
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    if (await reuseHealthyConnection()) {
      return mongoose;
    }
  }

  if (mongoose.connection.readyState === 2) {
    if (connectionPromise) {
      return connectionPromise;
    }

    console.warn("connectDB:reset-stuck-connecting-state");
    await mongoose.disconnect().catch(() => undefined);
  }

  if (mongoose.connection.readyState === 3) {
    await mongoose.disconnect().catch(() => undefined);
  }

  if (!connectionPromise) {
    connectionPromise = withTimeout(
      mongoose.connect(MONGODB_URI, CONNECTION_OPTIONS),
      CONNECTION_OPTIONS.serverSelectionTimeoutMS,
      "mongoose connect"
    )
      .then((instance) => {
        connectionPromise = null;
        return instance;
      })
      .catch((error) => {
        console.error("connectDB:connect-error", error);
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}
