import { Image, ImageProps } from "expo-image";
import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "./skeleton";

interface GracefulImageProps extends ImageProps {
  borderRadius?: number;
}

/**
 * A highly optimized Image component that handles its own skeleton loading state internally.
 * Prevents layout shifts and provides a smooth cross-fade transition.
 */
export const GracefulImage: React.FC<GracefulImageProps> = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  const { style, borderRadius = 10, ...rest } = props;

  const sourceKey = typeof rest.source === 'object' && rest.source && 'uri' in rest.source 
    ? rest.source.uri 
    : typeof rest.source === 'string' 
      ? rest.source 
      : undefined;

  useEffect(() => {
    setIsLoading(true);
  }, [sourceKey]);

  return (
    <View style={[style, styles.container, { borderRadius }]}>
      {isLoading && (
        <Skeleton
          width="100%"
          height="100%"
          borderRadius={borderRadius}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <Image
        {...rest}
        style={StyleSheet.absoluteFill}
        onLoad={() => setIsLoading(false)}
        transition={props.transition !== undefined ? props.transition : 0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
});
