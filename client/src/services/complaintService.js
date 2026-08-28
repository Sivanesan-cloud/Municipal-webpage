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
      let snapshot;

      // Try ordered query first; if index error occurs, fallback to simple fetch
      try {
        let q = query(complaintsCol, orderBy("reportedDate", "desc"));

        if (filters.status && filters.status !== "All Status") {
          q = query(q, where("status", "==", filters.status));
        }
        if (filters.category && filters.category !== "All Categories") {
          q = query(q, where("category", "==", filters.category));
        }
        if (filters.priority && filters.priority !== "All Priorities") {
          q = query(q, where("priority", "==", filters.priority));
        }
        if (filters.ward && filters.ward !== "All Wards") {
          q = query(q, where("ward", "==", filters.ward));
        }

        snapshot = await getDocs(q);
      } catch (queryErr) {
        console.warn("ComplaintService: ordered query failed (index missing?), fetching all documents directly:", queryErr);
        snapshot = await getDocs(complaintsCol);
      }

      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate = "";
        
        if (data.reportedDate && typeof data.reportedDate.toDate === "function") {
          const dt = data.reportedDate.toDate();
          formattedDate = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } else if (data.date && data.date !== "Oct 24, 2023" && data.date !== "Oct 23, 2023" && data.date !== "Oct 18, 2023" && data.date !== "Oct 17, 2023" && data.date !== "Oct 15, 2023") {
          formattedDate = data.date;
        } else {
          formattedDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }

        return {
          id: doc.id,
          ...data,
          date: formattedDate,
          issue: data.issue || data.title || data.description || "Reported Civic Issue"
        };
      });

      // Apply in-memory filtering if query fallback was used
      if (filters.status && filters.status !== "All Status") {
        results = results.filter(c => c.status === filters.status);
      }
      if (filters.category && filters.category !== "All Categories") {
        results = results.filter(c => c.category === filters.category);
      }
      if (filters.priority && filters.priority !== "All Priorities") {
        results = results.filter(c => c.priority === filters.priority);
      }
      if (filters.ward && filters.ward !== "All Wards") {
        results = results.filter(c => c.ward === filters.ward);
      }

      return results;
    } catch (error) {
      console.error("ComplaintService.getComplaints failed:", error);
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
        status: complaintData.assignedOfficial && complaintData.assignedOfficial !== "Unassigned" ? "Assigned" : "Pending",
        reportedDate: serverTimestamp(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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
      const isAssign = officialName && officialName !== "Unassigned";
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
