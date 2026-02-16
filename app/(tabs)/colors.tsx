import { CategoryChips } from "@/components/category-chips";
import ImageGrid from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

const CATEGORIES = ["All", "Pastel", "Neon", "Dark", "Light", "Vintage"];

const DATA = [
  { id: 1, color: "#FFB3BA", category: "Pastel" },
  { id: 2, color: "#FFFFBA", category: "Pastel" },
  { id: 3, color: "#BAFFC9", category: "Pastel" },
  { id: 4, color: "#BAE1FF", category: "Pastel" },
  { id: 5, color: "#FF00FF", category: "Neon" },
  { id: 6, color: "#00FF00", category: "Neon" },
  { id: 7, color: "#1a1a1a", category: "Dark" },
  { id: 8, color: "#f5f5f5", category: "Light" },
  { id: 9, color: "#8B4513", category: "Vintage" },
];

export default function Colors() {
  const commonStyles = useCommonThemedStyles();
  const router = useRouter();
  const [category, setCategory] = useState("All");
  const [items, setItems] = useState(DATA);

  const filteredData =
    category === "All"
      ? items
      : items.filter((item) => item.category === category);

  const handlePress = (item: any) => {
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
