import { useState, useEffect } from "react";
import * as Contacts from "expo-contacts";

export function useContacts() {
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== "granted") {
          setError("Permission to access contacts was denied.");
          setLoading(false);
          return;
        }

        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.Image],
        });

        if (data.length > 0) {
          // Sort contacts alphabetically
          const sortedData = data.sort((a, b) => {
            const nameA = a.name || "";
            const nameB = b.name || "";
            return nameA.localeCompare(nameB);
          });
          setContacts(sortedData);
        }
      } catch (e) {
        setError("An error occurred while fetching contacts.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  return { contacts, loading, error };
}
