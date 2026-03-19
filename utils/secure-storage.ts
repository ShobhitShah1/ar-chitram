import { MMKVLoader } from "react-native-mmkv-storage";

const storage = new MMKVLoader().initialize();

export const saveToSecureStore = async (key: string, value: string) => {
  try {
    storage.setString(key, value);
  } catch (error) {
    console.error("Error saving to secure store", error);
  }
};

export const getFromSecureStore = async (key: string) => {
  try {
    return storage.getString(key) || null;
  } catch (error) {
    console.error("Error getting from secure store", error);
    return null;
  }
};

export const deleteFromSecureStore = async (key: string) => {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error("Error deleting from secure store", error);
  }
};
