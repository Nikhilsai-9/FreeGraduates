import admin from "firebase-admin";

let isFirebaseAdminInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // If provided as JSON string in env
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseAdminInitialized = true;
    console.log("🔥 Firebase Admin SDK initialized with Service Account Key.");
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // If initialized with Project ID
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    isFirebaseAdminInitialized = true;
    console.log("🔥 Firebase Admin SDK initialized with Project ID:", process.env.FIREBASE_PROJECT_ID);
  } else {
    console.log("⚠️ Firebase Admin credentials not yet provided in backend/.env. Running in development auth mode.");
  }
} catch (error) {
  console.warn("⚠️ Firebase Admin initialization warning:", error.message);
}

export { admin, isFirebaseAdminInitialized };
