import { admin, isFirebaseAdminInitialized } from "../config/firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing. Please sign in."
      });
    }

    const token = authHeader.split("Bearer ")[1].trim();

    if (isFirebaseAdminInitialized) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        name: decodedToken.name || ""
      };
      return next();
    } else {
      // Development mode fallback when Firebase keys are being configured
      req.user = {
        uid: req.headers["x-user-uid"] || "dev-user-" + (token.slice(-8) || "default"),
        email: req.headers["x-user-email"] || "student@freegraduates.com",
        name: "FreeGraduates Student"
      };
      return next();
    }
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please sign in again."
    });
  }
}
