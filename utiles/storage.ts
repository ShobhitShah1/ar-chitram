import { MMKVLoader } from "react-native-mmkv-storage";

export const storage = new MMKVLoader().initialize();

export const mmkvStorage = {
  setItem: (name: string, value: string) => {
    return storage.setString(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.removeItem(name);
  },
};
