import { Stack } from "expo-router";
import React from "react";

const AuthLayout = () => {
  return (
    <Stack
      initialRouteName="login"
      screenOptions={{ headerShown: false, animation: "ios_from_right" }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
};

export default AuthLayout;
