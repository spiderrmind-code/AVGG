import assert from "node:assert/strict";
import test from "node:test";

import { resolveMongoConfig } from "../lib/mongo";
import { resolveStudioMongoConfig } from "../lib/studio-mongo";

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

test("Studio Mongo requires its own URI and rejects the AVG database", () => {
  assert.throws(
    () => resolveStudioMongoConfig({ MONGODB_URI: "mongodb://localhost/shop", MONGODB_DB: "shop" }),
    /STUDIO_MONGODB_URI/
  );
  assert.throws(
    () => resolveStudioMongoConfig({ STUDIO_MONGODB_URI: "mongodb://localhost", STUDIO_MONGODB_DB: "AVGCONNECTS" }),
    /base exclusiva/
  );
  assert.deepEqual(
    resolveStudioMongoConfig({ STUDIO_MONGODB_URI: "mongodb://localhost", STUDIO_MONGODB_DB: "13_studio_tattoo" }),
    { uri: "mongodb://localhost", dbName: "13_studio_tattoo" }
  );
  assert.deepEqual(
    resolveStudioMongoConfig({ STUDIO_MONGODB_URI: "mongodb://localhost\\n", STUDIO_MONGODB_DB: "13_studio_tattoo\\n" }),
    { uri: "mongodb://localhost", dbName: "13_studio_tattoo" }
  );
});