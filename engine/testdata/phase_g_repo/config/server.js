// Intentionally insecure CORS for Phase G static detector tests (synthetic)
const corsOrigin = "*";
module.exports = { corsOrigin, DEBUG: true, NODE_ENV: "production" };
