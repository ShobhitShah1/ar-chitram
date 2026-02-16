import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

interface CategoryChipsProps {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}

export const CategoryChips = ({
  items,
  selected,
  onSelect,
}: CategoryChipsProps) => {
  const { theme, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const index = items.indexOf(selected);
    if (index >= 0 && flatListRef.current) {
      // Small timeout to ensure layout is ready or scrolling works reliably
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [selected]);

  const renderItem = ({ item }: { item: string }) => {
    const isSelected = item === selected;

    if (isSelected) {
      return (
        <LinearGradient
          colors={theme.drawingButton as any}
          style={styles.chipWrapper}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Pressable onPress={() => onSelect(item)} style={styles.pressable}>
            <Text style={[styles.text, { color: "white", fontWeight: "600" }]}>
              {item}
            </Text>
          </Pressable>
        </LinearGradient>
      );
    }

    return (
      <View
        style={[
          styles.chipWrapper,
          { backgroundColor: isDark ? "#D7D7D7" : "#EFEFEF" },
        ]}
      >
        <Pressable onPress={() => onSelect(item)} style={styles.pressable}>
          <Text
            style={[styles.text, { color: isDark ? "#6D6D6D" : "#000000" }]}
          >
            {item}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.5,
            });
          });
        }}
        fadingEdgeLength={50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: 60,
  },
  container: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  chipWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    height: 36,
    justifyContent: "center",
  },
  pressable: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  text: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
});
