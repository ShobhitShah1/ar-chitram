import { Redirect } from "expo-router";
import { Text } from "react-native";

interface TextWithDefaultProps extends Text {
  defaultProps?: { allowFontScaling?: boolean };
}

(Text as unknown as TextWithDefaultProps).defaultProps = {
  ...((Text as unknown as TextWithDefaultProps).defaultProps || {}),
  allowFontScaling: false,
};

export default function Index() {
  return <Redirect href="/splash" />;
}
