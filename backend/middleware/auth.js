const jwt = require("jsonwebtoken");

function getUserId(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return payload.userId;
  } catch (err) {
    return null;
  }
}

// Sets req.userId if a valid token is sent, but lets everyone through
function optionalAuth(req, res, next) {
  req.userId = getUserId(req);
  next();
}

// Blocks anyone without a valid token
function requireAuth(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Please log in" });
  }
  req.userId = userId;
  next();
}

module.exports = { optionalAuth, requireAuth };