import assert from "node:assert/strict";
import test from "node:test";

import { resolveMongoConfig } from "../lib/mongo";

test("resolveMongoConfig prefers valid env values and ignores stale shell values", () => {
  const resolved = resolveMongoConfig(
    {
      MONGODB_URI: "M",
      MONGODB_DB: "M",
      MONGO_URI: "M",
      NODE_ENV: "test",
    },
    {
      MONGODB_URI:
        "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
      MONGODB_DB: "AVGCONNECTS",
    }
  );

  assert.equal(
    resolved.uri,
    "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
  );

  assert.equal(resolved.dbName, "AVGCONNECTS");
});

test("resolveMongoConfig keeps valid process env values when present", () => {
  const resolved = resolveMongoConfig(
    {
      MONGODB_URI: "mongodb://localhost:27017/app",
      MONGODB_DB: "shop",
      NODE_ENV: "test",
    },
    {
      MONGODB_URI:
        "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
      MONGODB_DB: "AVGCONNECTS",
    }
  );

  assert.equal(resolved.uri, "mongodb://localhost:27017/app");
  assert.equal(resolved.dbName, "shop");
});