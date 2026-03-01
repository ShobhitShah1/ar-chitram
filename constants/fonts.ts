export const FONT_ASSETS = {
  "Galada-Regular": require("../assets/fonts/Galada-Regular.ttf"),
  "Mona-Sans-Regular": require("../assets/fonts/Mona-Sans-Regular.ttf"),
  "Mona-Sans-Medium": require("../assets/fonts/Mona-Sans-Medium.ttf"),
  "Mona-Sans-SemiBold": require("../assets/fonts/Mona-Sans-SemiBold.ttf"),
  "Mona-Sans-Bold": require("../assets/fonts/Mona-Sans-Bold.ttf"),
  "Pattaya-Regular": require("../assets/fonts/Pattaya-Regular.ttf"),
  "Molle-Italic": require("../assets/fonts/signature/Molle-Italic.ttf"),
  "MonsieurLaDoulaise-Regular": require("../assets/fonts/signature/MonsieurLaDoulaise-Regular.ttf"),
  "MonteCarlo-Regular": require("../assets/fonts/signature/MonteCarlo-Regular.ttf"),
  "Montez-Regular": require("../assets/fonts/signature/Montez-Regular.ttf"),
} as const;

export const FontFamily = {
  regular: "Mona-Sans-Regular",
  medium: "Mona-Sans-Medium",
  semibold: "Mona-Sans-SemiBold",
  bold: "Mona-Sans-Bold",
  galada: "Galada-Regular",
  pattaya: "Pattaya-Regular",
  signatureMolle: "Molle-Italic",
  signatureMonsieurLaDoulaise: "MonsieurLaDoulaise-Regular",
  signatureMonteCarlo: "MonteCarlo-Regular",
  signatureMontez: "Montez-Regular",
} as const;

// Typography helper functions
export const typography = {
  h1: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 26 },
  h4: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 24 },
  h5: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 22 },
  h6: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },

  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18 },

  button: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 20 },
  buttonSmall: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 18 },

  label: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },

  galada: { fontFamily: FontFamily.galada, fontSize: 16, lineHeight: 24 },
} as const;
