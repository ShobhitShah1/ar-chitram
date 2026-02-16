import {
  ic_color_pallete_dark,
  ic_color_pallete_light,
  ic_drawing_dark,
  ic_drawing_light,
  ic_gallery_dark,
  ic_gallery_light,
  ic_home_light,
  ic_sketch_dark,
  ic_sketch_light,
  ic_plus,
} from "@/assets/icons";
import TabItem from "@/components/tab-item";
import { ProfileProvider } from "@/context/profile-context";
import { useTheme } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs, usePathname } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme, isDark } = useTheme();

  const handleTabPress = useCallback(
    (routeName: string) => {
      if (routeName === "home" && state.index === 2) {
        router.push("/virtual-creativity");
        return;
      }

      const event = navigation.emit({
        type: "tabPress",
        target: routeName,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        requestAnimationFrame(() => {
          navigation.navigate(routeName);
        });
      }
    },
    [state.index, navigation],
  );

  return (
    <>
      <View style={styles.tabContainer}>
        {/* Gradient Border - 360deg (bottom to top) */}
        <LinearGradient
          colors={theme.tabBarBorderGradient as [string, string, ...string[]]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.gradientBorder}
        >
          {/* Inner Tab Bar - 180deg (top to bottom) */}
          <LinearGradient
            colors={theme.tabBarGradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.floatingBar}
          >
            <TabItem
              label="Colors"
              imageSource={
                state.index === 0
                  ? ic_color_pallete_dark
                  : ic_color_pallete_light
              }
              isFocused={state.index === 0}
              onPress={() => handleTabPress("colors")}
            />

            <TabItem
              label="Sketch"
              imageSource={state.index === 1 ? ic_sketch_dark : ic_sketch_light}
              isFocused={state.index === 1}
              onPress={() => handleTabPress("sketch")}
            />

            <TabItem
              label="Create"
              imageSource={ic_home_light}
              isFocused={state.index === 2}
              onPress={() => handleTabPress("home")}
              isCenter={true}
            />

            <TabItem
              label="Drawing"
              imageSource={
                state.index === 3 ? ic_drawing_dark : ic_drawing_light
              }
              isFocused={state.index === 3}
              onPress={() => handleTabPress("drawing")}
            />

            <TabItem
              label="Gallery"
              imageSource={
                state.index === 4 ? ic_gallery_dark : ic_gallery_light
              }
              isFocused={state.index === 4}
              onPress={() => handleTabPress("gallery")}
            />
          </LinearGradient>
        </LinearGradient>
      </View>
    </>
  );
};

export default function TabLayout() {
  const pathname = usePathname();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      "worklet";
      if (pathname !== "/gallery") {
        translateY.value = withTiming(100, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
      } else {
        translateY.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
      }
    };

    scheduleOnUI(animate);
  }, [pathname]);

  useEffect(() => {
    const onBackPress = () => {
      if (Platform.OS === "android" && pathname === "/home") {
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [pathname]);

  return (
    <ProfileProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          animation: "none",
        }}
        initialRouteName="home"
        backBehavior="initialRoute"
      >
        <Tabs.Screen name="colors" />
        <Tabs.Screen name="sketch" />
        <Tabs.Screen name="home" options={{ lazy: false }} />
        <Tabs.Screen name="drawing" />
        <Tabs.Screen name="gallery" />
      </Tabs>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 99,
    alignItems: "center",
  },
  gradientBorder: {
    width: "100%",
    borderRadius: 30,
    padding: 1.5,
    boxShadow: "0px 0px 25px 0px rgba(0, 0, 0, 0.15)",
  },
  floatingBar: {
    flexDirection: "row",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: "100%",
    height: 55,
  },
  centerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  centerLottie: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
  },
  iconImage: { width: 22, height: 22 },
});

// import {
//   ic_color_pallete_dark,
//   ic_color_pallete_light,
//   ic_drawing_dark,
//   ic_drawing_light,
//   ic_gallery_dark,
//   ic_gallery_light,
//   ic_home_dark,
//   ic_home_light,
//   ic_sketch_dark,
//   ic_sketch_light,
// } from "@/assets/icons";
// import TabItem from "@/components/tab-item";
// import { ProfileProvider } from "@/context/profile-context";
// import { useTheme } from "@/context/theme-context";
// import { LinearGradient } from "expo-linear-gradient";
// import { Tabs, usePathname } from "expo-router";
// import React, { useCallback, useEffect } from "react";
// import { BackHandler, Platform, StyleSheet, View } from "react-native";
// import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
// import { scheduleOnUI } from "react-native-worklets";

// interface CustomTabBarProps {
//   state: any;
//   descriptors: any;
//   navigation: any;
// }

// const CustomTabBar: React.FC<CustomTabBarProps> = ({
//   state,
//   descriptors,
//   navigation,
// }) => {
//   const { theme, isDark } = useTheme();

//   const handleTabPress = useCallback(
//     (routeName: string) => {
//       if (routeName === "home" && state.index === 2) {
//         return;
//       }

//       const event = navigation.emit({
//         type: "tabPress",
//         target: routeName,
//         canPreventDefault: true,
//       });

//       if (!event.defaultPrevented) {
//         requestAnimationFrame(() => {
//           navigation.navigate(routeName);
//         });
//       }
//     },
//     [state.index, navigation],
//   );

//   return (
//     <>
//       <View style={styles.tabContainer}>
//         {/* Gradient Border - 360deg (bottom to top) */}
//         <LinearGradient
//           colors={theme.tabBarBorderGradient as [string, string, ...string[]]}
//           start={{ x: 0, y: 1 }}
//           end={{ x: 0, y: 0 }}
//           style={styles.gradientBorder}
//         >
//           {/* Inner Tab Bar - 180deg (top to bottom) */}
//           <LinearGradient
//             colors={theme.tabBarGradient as [string, string, ...string[]]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 0, y: 1 }}
//             style={styles.floatingBar}
//           >
//             <TabItem
//               label="Colors"
//               imageSource={
//                 isDark !== (state.index === 0)
//                   ? ic_color_pallete_dark
//                   : ic_color_pallete_light
//               }
//               isFocused={state.index === 0}
//               onPress={() => handleTabPress("colors")}
//             />

//             <TabItem
//               label="Sketch"
//               imageSource={
//                 isDark !== (state.index === 1)
//                   ? ic_sketch_dark
//                   : ic_sketch_light
//               }
//               isFocused={state.index === 1}
//               onPress={() => handleTabPress("sketch")}
//             />

//             <TabItem
//               label="Home"
//               imageSource={isDark ? ic_home_dark : ic_home_light}
//               isFocused={state.index === 2}
//               onPress={() => handleTabPress("home")}
//               isCenter={true}
//             />

//             <TabItem
//               label="Drawing"
//               imageSource={
//                 isDark !== (state.index === 3)
//                   ? ic_drawing_dark
//                   : ic_drawing_light
//               }
//               isFocused={state.index === 3}
//               onPress={() => handleTabPress("drawing")}
//             />

//             <TabItem
//               label="Gallery"
//               imageSource={
//                 isDark !== (state.index === 4)
//                   ? ic_gallery_dark
//                   : ic_gallery_light
//               }
//               isFocused={state.index === 4}
//               onPress={() => handleTabPress("gallery")}
//             />
//           </LinearGradient>
//         </LinearGradient>
//       </View>
//     </>
//   );
// };

// export default function TabLayout() {
//   const pathname = usePathname();
//   const translateY = useSharedValue(100);
//   const opacity = useSharedValue(0);

//   useEffect(() => {
//     const animate = () => {
//       "worklet";
//       if (pathname !== "/gallery") {
//         translateY.value = withTiming(100, {
//           duration: 300,
//           easing: Easing.inOut(Easing.ease),
//         });
//         opacity.value = withTiming(0, {
//           duration: 300,
//           easing: Easing.inOut(Easing.ease),
//         });
//       } else {
//         translateY.value = withTiming(0, {
//           duration: 400,
//           easing: Easing.out(Easing.cubic),
//         });
//         opacity.value = withTiming(1, {
//           duration: 400,
//           easing: Easing.out(Easing.cubic),
//         });
//       }
//     };

//     scheduleOnUI(animate);
//   }, [pathname]);

//   useEffect(() => {
//     const onBackPress = () => {
//       if (Platform.OS === "android" && pathname === "/home") {
//         BackHandler.exitApp();
//         return true;
//       }
//       return false;
//     };

//     const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
//     return () => sub.remove();
//   }, [pathname]);

//   return (
//     <ProfileProvider>
//       <Tabs
//         tabBar={(props) => <CustomTabBar {...props} />}
//         screenOptions={{
//           headerShown: false,
//           tabBarStyle: { display: "none" },
//           animation: "none",
//         }}
//         initialRouteName="home"
//         backBehavior="initialRoute"
//       >
//         <Tabs.Screen name="colors" />
//         <Tabs.Screen name="sketch" />
//         <Tabs.Screen name="home" options={{ lazy: false }} />
//         <Tabs.Screen name="drawing" />
//         <Tabs.Screen name="gallery" />
//       </Tabs>
//     </ProfileProvider>
//   );
// }

// const styles = StyleSheet.create({
//   tabContainer: {
//     position: "absolute",
//     bottom: 40,
//     left: 20,
//     right: 20,
//     zIndex: 99,
//     alignItems: "center",
//   },
//   gradientBorder: {
//     width: "100%",
//     borderRadius: 30,
//     padding: 1.5,
//     boxShadow: "0px 0px 25px 0px rgba(0, 0, 0, 0.15)",
//   },
//   floatingBar: {
//     flexDirection: "row",
//     borderRadius: 28,
//     alignItems: "center",
//     justifyContent: "space-evenly",
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     width: "100%",
//     height: 55,
//   },
//   centerIconContainer: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   centerLottie: {
//     position: "absolute",
//     left: 0,
//     top: 0,
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     zIndex: 20,
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   modalOverlay: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(0, 0, 0, 0.5)",
//   },
//   modalContainer: {
//     width: "90%",
//     maxWidth: 400,
//   },
//   iconImage: { width: 22, height: 22 },
// });
