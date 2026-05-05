import { Platform } from "react-native";
import firestore from "@react-native-firebase/firestore";

let firestoreConfigured = false;

export const db = firestore();

export function configureFirestore() {
  if (firestoreConfigured) return;
  firestoreConfigured = true;

  if (Platform.OS === "web") {
    return;
  }

  db.settings({
    ignoreUndefinedProperties: true,
  });
}
