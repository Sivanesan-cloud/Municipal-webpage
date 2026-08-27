import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "./firebase";

export const authService = {
  /**
   * Signs in a municipal administrator
   * @param {string} email 
   * @param {string} password 
   */
  signIn: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("AuthService.signIn failed:", error);
      throw error;
    }
  },

  /**
   * Signs out the current user session
   */
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("AuthService.signOut failed:", error);
      throw error;
    }
  },

  /**
   * Sends a password reset instruction email
   * @param {string} email 
   */
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("AuthService.resetPassword failed:", error);
      throw error;
    }
  },

  /**
   * Observer for current login session status changes
   * @param {function} callback 
   */
  subscribeToAuthState: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

export default authService;
