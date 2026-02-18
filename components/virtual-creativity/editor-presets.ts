import {
  animal_1,
  animal_2,
  animal_3,
  animal_4,
  animal_5,
  animal_6,
} from "@/assets/images";
import { FontFamily } from "@/constants/fonts";

export interface PatternPreset {
  id: string;
  colors: [string, string];
  tintColor: string;
  textureSource?: number;
}

export interface SignatureFontPreset {
  id: string;
  label: string;
  fontFamily: string;
}

export interface ArtistSignaturePreset {
  id: string;
  name: string;
  fontFamily: string;
}

export interface SignatureSelection {
  id: string;
  value: string;
  fontFamily: string;
  isArtistPreset: boolean;
}

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "rose-cloud",
    colors: ["#FFD5E8", "#FFB3D9"],
    tintColor: "#D569B8",
    textureSource: animal_1,
  },
  {
    id: "cream-bloom",
    colors: ["#FFEBDC", "#FFD8C5"],
    tintColor: "#D08E67",
    textureSource: animal_2,
  },
  {
    id: "blush-silk",
    colors: ["#F7E1E6", "#ECC9D2"],
    tintColor: "#B26A7A",
    textureSource: animal_3,
  },
  {
    id: "pink-haze",
    colors: ["#FFE1F2", "#F9BEDF"],
    tintColor: "#BC4D90",
    textureSource: animal_4,
  },
  {
    id: "soft-aura",
    colors: ["#FDF2D5", "#ECD9FF"],
    tintColor: "#8570CF",
    textureSource: animal_5,
  },
  {
    id: "mint-wave",
    colors: ["#DDF7F4", "#C2EFE8"],
    tintColor: "#3C9C90",
    textureSource: animal_6,
  },
  {
    id: "petal-frost",
    colors: ["#FDE5EE", "#FCD0E0"],
    tintColor: "#CA5A8C",
  },
  {
    id: "dusty-peach",
    colors: ["#FFE7DA", "#F7D1BE"],
    tintColor: "#C06A49",
  },
  {
    id: "linen-rose",
    colors: ["#F5E4E1", "#EACCC7"],
    tintColor: "#A86964",
  },
  {
    id: "pastel-pop",
    colors: ["#FDE1F5", "#EAD9FF"],
    tintColor: "#7E62C0",
  },
  {
    id: "gold-milk",
    colors: ["#FFF4D6", "#FDE8BB"],
    tintColor: "#BE8E25",
  },
  {
    id: "paper-breeze",
    colors: ["#F7F6F0", "#E7E6DF"],
    tintColor: "#77756E",
  },
  {
    id: "berry-light",
    colors: ["#FFD6E3", "#FBB9CE"],
    tintColor: "#B94473",
  },
  {
    id: "sun-kiss",
    colors: ["#FFF0DA", "#FFD9A8"],
    tintColor: "#CD7F28",
  },
  {
    id: "light-clay",
    colors: ["#F4E4DF", "#E8CDC5"],
    tintColor: "#A16E62",
  },
  {
    id: "dawn-pink",
    colors: ["#FFDFF2", "#FFC4E7"],
    tintColor: "#C04C98",
  },
  {
    id: "lavender-ice",
    colors: ["#EEE7FF", "#DDD3FF"],
    tintColor: "#6D5DB3",
  },
  {
    id: "seafoam",
    colors: ["#DDF8EE", "#BEF0DE"],
    tintColor: "#2E8A65",
  },
];

export const SIGNATURE_FONT_PRESETS: SignatureFontPreset[] = [
  {
    id: "font-galada",
    label: "Galada",
    fontFamily: FontFamily.galada,
  },
  {
    id: "font-pattaya",
    label: "Pattaya",
    fontFamily: FontFamily.pattaya,
  },
  {
    id: "font-semi",
    label: "Mona SemiBold",
    fontFamily: FontFamily.semibold,
  },
  {
    id: "font-bold",
    label: "Mona Bold",
    fontFamily: FontFamily.bold,
  },
];

export const ARTIST_SIGNATURE_PRESETS: ArtistSignaturePreset[] = [
  { id: "artist-liam", name: "Liam", fontFamily: FontFamily.galada },
  { id: "artist-julian", name: "Julian", fontFamily: FontFamily.pattaya },
  { id: "artist-noah", name: "Noah", fontFamily: FontFamily.galada },
  { id: "artist-gabriel", name: "Gabriel", fontFamily: FontFamily.pattaya },
  { id: "artist-wyatt", name: "Wyatt", fontFamily: FontFamily.galada },
  { id: "artist-josiah", name: "Josiah", fontFamily: FontFamily.pattaya },
  { id: "artist-ethan", name: "Ethan", fontFamily: FontFamily.galada },
  { id: "artist-elijah", name: "Elijah", fontFamily: FontFamily.pattaya },
];
