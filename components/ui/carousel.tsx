import React from "react";
import { Dimensions, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface RenderItemProps<T> {
  item: T;
  index: number;
  scrollX: SharedValue<number>;
}

interface CarouselProps<T> {
  data: T[];
  renderItem: (props: RenderItemProps<T>) => React.ReactElement;
  width?: number;
  height?: number;
  style?: ViewStyle;
  itemWidth?: number;
  onScroll?: (scrollX: number) => void;
  scrollX?: SharedValue<number>;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function Carousel<T extends any>({
  data,
  renderItem,
  width = SCREEN_WIDTH,
  height,
  style,
  itemWidth = SCREEN_WIDTH,
  scrollX: externalScrollX,
}: CarouselProps<T>) {
  const internalScrollX = useSharedValue(0);
  const scrollX = externalScrollX || internalScrollX;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Animated.FlatList
        data={data}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => {
          return (
            <View style={{ width: itemWidth }}>
              {renderItem({ item, index, scrollX })}
            </View>
          );
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
      />
    </View>
  );
}

interface PaginationProps {
  data: any[];
  scrollX: SharedValue<number>;
  itemWidth?: number;
  dotColor?: string;
  activeDotColor?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  data,
  scrollX,
  itemWidth = SCREEN_WIDTH,
  dotColor = "#D9D9D9",
  activeDotColor = "#333",
}) => {
  return (
    <View style={styles.paginationContainer}>
      {data.map((_, index) => {
        const animatedStyle = useAnimatedStyle(() => {
          const inputRange = [
            (index - 1) * itemWidth,
            index * itemWidth,
            (index + 1) * itemWidth,
          ];

          const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 20, 8],
            Extrapolation.CLAMP,
          );

          const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolation.CLAMP,
          );

          const backgroundColor = interpolateColor(scrollX.value, inputRange, [
            dotColor,
            activeDotColor,
            dotColor,
          ]);

          return {
            width,
            opacity,
            backgroundColor,
          };
        });

        return (
          <Animated.View key={index} style={[styles.dot, animatedStyle]} />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    height: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default Carousel;
