import {
  animal_1,
  animal_2,
  animal_3,
  animal_4,
  animal_5,
  animal_6,
  animal_7,
} from "@/assets/images";
import { CategoryChips } from "@/components/category-chips";
import ImageGrid from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { useTheme } from "@/context/theme-context";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

const CATEGORIES = [
  "All",
  "Animals",
  "Cartoons",
  "Nature",
  "Abstract",
  "Vehicles",
];

const DATA = [
  { id: 1, image: animal_1, category: "Animals" },
  { id: 2, image: animal_2, category: "Animals" },
  { id: 3, image: animal_3, category: "Animals" },
  { id: 4, image: animal_4, category: "Animals" },
  { id: 5, image: animal_5, category: "Animals" },
  { id: 6, image: animal_6, category: "Animals" },
  { id: 7, image: animal_7, category: "Animals" },
];

export default function Sketch() {
  const { theme } = useTheme();
  const commonStyles = useCommonThemedStyles();
  const router = useRouter();
  const [category, setCategory] = useState("All");
  const [items, setItems] = useState(DATA);

  const filteredData =
    category === "All"
      ? items
      : items.filter((item) => item.category === category);

  const handlePress = (item: any) => {
    // Navigate to guide or drawing screen
    router.push("/drawing/guide");
  };

  const handleShuffle = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
  };

  return (
    <View style={commonStyles.container}>
      <TabsHeader isShuffle onShufflePress={handleShuffle} />

      <CategoryChips
        items={CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      <ImageGrid data={filteredData} onPress={handlePress} />
    </View>
  );
}
