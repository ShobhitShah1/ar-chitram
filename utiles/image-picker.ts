import * as ImagePicker from "expo-image-picker";
import { MediaType } from "expo-media-library";

interface PickImageOptions {
  allowMultiple?: boolean;
}

export const pickImageUris = async (
  options: PickImageOptions = {},
): Promise<string[]> => {
  const { allowMultiple = true } = options;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsMultipleSelection: allowMultiple,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets
    .map((asset) => asset.uri)
    .filter((uri): uri is string => !!uri);
};
