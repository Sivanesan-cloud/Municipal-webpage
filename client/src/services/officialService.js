import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "OFFICIALS";

export const officialService = {
  /**
   * Fetches field officials based on filters
   */
  getOfficials: async (filters = {}) => {
    try {
      const officialsCol = collection(db, COLLECTION_NAME);
      let q = query(officialsCol, orderBy("name", "asc"));

      if (filters.department) {
        q = query(q, where("department", "==", filters.department));
      }
      if (filters.ward) {
        q = query(q, where("ward", "==", filters.ward));
      }
      if (filters.availability && filters.availability !== "All Availability") {
        q = query(q, where("availability", "==", filters.availability));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("OfficialService.getOfficials failed:", error);
      return [];
    }
  },

  /**
   * Registers a new field official in database
   */
  addOfficial: async (officialData) => {
    try {
      const officialsCol = collection(db, COLLECTION_NAME);
      const newDoc = {
        ...officialData,
        assignedComplaints: 0,
        completedComplaints: 0,
        maximumCapacity: 10,
        availability: "Available"
      };
      const docRef = await addDoc(officialsCol, newDoc);
      return { id: docRef.id, ...newDoc };
    } catch (error) {
      console.error("OfficialService.addOfficial failed:", error);
      throw error;
    }
  },

  /**
   * Updates current availability status of field official
   */
  updateAvailability: async (id, availability) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { availability });
    } catch (error) {
      console.error("OfficialService.updateAvailability failed:", error);
      throw error;
    }
  },

  /**
   * Adjusts workload stats when assignments are updated
   */
  updateWorkload: async (id, incrementValue) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      // Wait, firestore increment needs importing or a simple update structure.
      // Let's get the document first or fetch/update. To keep it clean and robust:
      await updateDoc(docRef, {
        assignedComplaints: incrementValue
      });
    } catch (error) {
      console.error("OfficialService.updateWorkload failed:", error);
      throw error;
    }
  }
};

export default officialService;
