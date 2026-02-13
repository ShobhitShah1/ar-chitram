import { Story, StoryRowProps } from "@/constants/interface";
import { likeAndDislike } from "@/services/api-service";
import React, { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { StoryIcon } from "./story-icon";
import { StoryViewerModal } from "./story-viewer-modal";

export const StoryRow: React.FC<StoryRowProps> = ({
  stories,
  contestStoryData,
}) => {
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const onLikePress = (id: string) => {
    try {
      likeAndDislike(id);
    } catch (error) {}
  };

  const renderStory = ({ item, index }: { item: Story; index: number }) => (
    <StoryIcon
      image={item.image || ""}
      title={item.username || ""}
      onPress={() => {
        setSelectedStoryIndex(index);
        setShowStoryModal(true);
      }}
    />
  );

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={stories}
          renderItem={renderStory}
          keyExtractor={(item, index) => `story-${item._id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      <StoryViewerModal
        visible={showStoryModal}
        stories={contestStoryData}
        initialIndex={selectedStoryIndex}
        onClose={() => setShowStoryModal(false)}
        isLikeEnabled={false}
        onLikePress={onLikePress}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  separator: {
    width: 4,
  },
});
