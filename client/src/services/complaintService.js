import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "reports";

export const complaintService = {
  /**
   * Fetches all complaints with optional filtering
   */
  getComplaints: async (filters = {}) => {
    try {
      const complaintsCol = collection(db, COLLECTION_NAME);
      let q = query(complaintsCol, orderBy("reportedDate", "desc"));

      // Status Filter
      if (filters.status && filters.status !== "All Status") {
        q = query(q, where("status", "==", filters.status));
      }

      // Category Filter
      if (filters.category && filters.category !== "All Categories") {
        q = query(q, where("category", "==", filters.category));
      }

      // Priority Filter
      if (filters.priority && filters.priority !== "All Priorities") {
        q = query(q, where("priority", "==", filters.priority));
      }

      // Ward Filter
      if (filters.ward && filters.ward !== "All Wards") {
        q = query(q, where("ward", "==", filters.ward));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("ComplaintService.getComplaints failed:", error);
      // Fallback placeholder during setup
      return [];
    }
  },

  /**
   * Registers a new complaint manually
   */
  createComplaint: async (complaintData) => {
    try {
      const complaintsCol = collection(db, COLLECTION_NAME);
      const newDoc = {
        ...complaintData,
        status: complaintData.assignedOfficial !== "Unassigned" ? "Assigned" : "Pending",
        reportedDate: serverTimestamp(),
        timeline: [
          {
            status: "Pending",
            date: new Date().toLocaleString(),
            remark: "Complaint created by administrator."
          }
        ]
      };
      
      const docRef = await addDoc(complaintsCol, newDoc);
      return { id: docRef.id, ...newDoc };
    } catch (error) {
      console.error("ComplaintService.createComplaint failed:", error);
      throw error;
    }
  },

  /**
   * Updates status of an existing complaint
   */
  updateComplaintStatus: async (id, status, remark = "") => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        status,
        timeline: arrayUnion({
          status,
          date: new Date().toLocaleString(),
          remark: remark || `Status changed to ${status} by administrator.`
        })
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("ComplaintService.updateComplaintStatus failed:", error);
      throw error;
    }
  },

  /**
   * Updates priority of an existing complaint
   */
  updateComplaintPriority: async (id, priority) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { priority });
    } catch (error) {
      console.error("ComplaintService.updateComplaintPriority failed:", error);
      throw error;
    }
  },

  /**
   * Assigns a field official to a complaint
   */
  assignOfficial: async (id, officialName) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const isAssign = officialName !== "Unassigned";
      const status = isAssign ? "Assigned" : "Pending";
      const updateData = {
        assignedOfficial: officialName,
        status,
        timeline: arrayUnion({
          status,
          date: new Date().toLocaleString(),
          remark: isAssign ? `Assigned to field official ${officialName}.` : "Removed assigned official."
        })
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("ComplaintService.assignOfficial failed:", error);
      throw error;
    }
  }
};

export default complaintService;
