import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const WARDS_COL   = "WARDS";
const OFFICIALS_COL = "OFFICIALS";

export const wardService = {
  /**
   * Fetches all ward documents from the WARDS collection.
   * Returns [{id: "WARD01", wardNumber: 1, officials: {...}}, ...]
   */
  getWards: async () => {
    try {
      const snap = await getDocs(collection(db, WARDS_COL));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    } catch (err) {
      console.error("wardService.getWards failed:", err);
      return [];
    }
  },

  /**
   * Fetches a single ward document and resolves its official references.
   * Firestore references inside `officials` map are resolved to full documents.
   * Returns { id, wardNumber, officials: { assistantEngineer: {...}, juniorEngineer: {...}, ... } }
   */
  getWardWithOfficials: async (wardId) => {
    try {
      const wardSnap = await getDoc(doc(db, WARDS_COL, wardId));
      if (!wardSnap.exists()) return null;

      const wardData = { id: wardSnap.id, ...wardSnap.data() };

      // `officials` is a map of role -> DocumentReference
      const officialsMap = wardData.officials || {};
      const resolved = {};

      await Promise.all(
        Object.entries(officialsMap).map(async ([role, ref]) => {
          try {
            // ref could be a Firestore DocumentReference or a path string
            let officialSnap;
            if (ref && typeof ref.get === "function") {
              // It's a real DocumentReference
              officialSnap = await getDoc(ref);
            } else if (ref && ref.path) {
              // Reference object with .path
              officialSnap = await getDoc(doc(db, ref.path));
            } else if (typeof ref === "string") {
              // Plain string path like "OFFICIALS/AE01"
              officialSnap = await getDoc(doc(db, ref));
            }

            if (officialSnap && officialSnap.exists()) {
              resolved[role] = { id: officialSnap.id, ...officialSnap.data() };
            }
          } catch (e) {
            console.warn(`Could not resolve official ref for role ${role}:`, e);
          }
        })
      );

      return { ...wardData, officials: resolved };
    } catch (err) {
      console.error("wardService.getWardWithOfficials failed:", err);
      return null;
    }
  }
};

export default wardService;
