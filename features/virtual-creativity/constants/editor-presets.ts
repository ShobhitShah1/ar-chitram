import { PATTERN_TEXTURES, ARTIST_SIGN_ICONS } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";

export interface PatternPreset {
  id: string;
  source: number;
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
  icon?: any;
}

export interface SignatureSelection {
  id: string;
  value: string;
  fontFamily: string;
  isArtistPreset: boolean;
  isTextAsLayer?: boolean;
  textLayerUri?: string;
}

export const PATTERN_PRESETS: PatternPreset[] = PATTERN_TEXTURES.map(
  (source, index) => {
    const serial = String(index + 1).padStart(2, "0");
    return {
      id: `pattern-${serial}`,
      source,
    };
  },
);

export const SIGNATURE_FONT_PRESETS: SignatureFontPreset[] = [
  { id: "font-alysa", label: "Alysa", fontFamily: FontFamily.customAlysa },
  {
    id: "font-atziluth",
    label: "Atziluth",
    fontFamily: FontFamily.customAtziluth,
  },
  { id: "font-auttan", label: "Auttan", fontFamily: FontFamily.customAuttan },
  {
    id: "font-bathoock",
    label: "Bathoock",
    fontFamily: FontFamily.customBathoock,
  },
  {
    id: "font-claudia",
    label: "Claudia",
    fontFamily: FontFamily.customClaudia,
  },
  {
    id: "font-dear-script",
    label: "Dear Script",
    fontFamily: FontFamily.customDearScript,
  },
  {
    id: "font-firdaus",
    label: "Firdaus",
    fontFamily: FontFamily.customFirdaus,
  },
  {
    id: "font-gita-script",
    label: "Gita Script",
    fontFamily: FontFamily.customGitaScript,
  },
  {
    id: "font-harlfiney",
    label: "Harlfiney",
    fontFamily: FontFamily.customHarlfiney,
  },
  {
    id: "font-marcelle",
    label: "Marcelle",
    fontFamily: FontFamily.customMarcelle,
  },
  {
    id: "font-messy-script",
    label: "Messy Script",
    fontFamily: FontFamily.customMessyScript,
  },
  {
    id: "font-scripty",
    label: "Scripty",
    fontFamily: FontFamily.customScripty,
  },
  { id: "font-shelly", label: "Shelly", fontFamily: FontFamily.customShelly2 },
  {
    id: "font-wild-script",
    label: "Wild Script",
    fontFamily: FontFamily.customWildScript,
  },
];

export const ARTIST_SIGNATURE_PRESETS: ArtistSignaturePreset[] = [
  {
    id: "artist-alysa",
    name: "Alysa",
    fontFamily: FontFamily.customAlysa,
    icon: ARTIST_SIGN_ICONS[0],
  },
  {
    id: "artist-marcelle",
    name: "Marcelle",
    fontFamily: FontFamily.customMarcelle,
    icon: ARTIST_SIGN_ICONS[1],
  },
  {
    id: "artist-messy",
    name: "Messy Script",
    fontFamily: FontFamily.customMessyScript,
    icon: ARTIST_SIGN_ICONS[2],
  },
  {
    id: "artist-scripty",
    name: "Scripty",
    fontFamily: FontFamily.customScripty,
    icon: ARTIST_SIGN_ICONS[3],
  },
  {
    id: "artist-shelly",
    name: "Shelly",
    fontFamily: FontFamily.customShelly2,
    icon: ARTIST_SIGN_ICONS[4],
  },
  {
    id: "artist-wild",
    name: "Wild Script",
    fontFamily: FontFamily.customWildScript,
    icon: ARTIST_SIGN_ICONS[5],
  },
  {
    id: "artist-atziluth",
    name: "Atziluth",
    fontFamily: FontFamily.customAtziluth,
    icon: ARTIST_SIGN_ICONS[6],
  },
  {
    id: "artist-auttan",
    name: "Auttan",
    fontFamily: FontFamily.customAuttan,
    icon: ARTIST_SIGN_ICONS[7],
  },
  {
    id: "artist-bathoock",
    name: "Bathoock",
    fontFamily: FontFamily.customBathoock,
    icon: ARTIST_SIGN_ICONS[8],
  },
  {
    id: "artist-claudia",
    name: "Claudia",
    fontFamily: FontFamily.customClaudia,
    icon: ARTIST_SIGN_ICONS[9],
  },
  {
    id: "artist-dear",
    name: "Dear Script",
    fontFamily: FontFamily.customDearScript,
    icon: ARTIST_SIGN_ICONS[10],
  },
  {
    id: "artist-firdaus",
    name: "Firdaus",
    fontFamily: FontFamily.customFirdaus,
    icon: ARTIST_SIGN_ICONS[11],
  },
  {
    id: "artist-gita",
    name: "Gita Script",
    fontFamily: FontFamily.customGitaScript,
    icon: ARTIST_SIGN_ICONS[12],
  },
  {
    id: "artist-harlfiney",
    name: "Harlfiney",
    fontFamily: FontFamily.customHarlfiney,
    icon: ARTIST_SIGN_ICONS[13],
  },
];

export const SIGNATURE_OUTLINE_FONT_PRESETS: SignatureFontPreset[] = [
  {
    id: "outline-regular",
    label: "Outline",
    fontFamily: FontFamily.outlineRegular,
  },
  {
    id: "outline-just-sans",
    label: "Just Sans",
    fontFamily: FontFamily.outlineJustSans,
  },
  {
    id: "outline-orange",
    label: "Orange Ave",
    fontFamily: FontFamily.outlineOrangeAvenue,
  },
  {
    id: "outline-mirage",
    label: "Mirage",
    fontFamily: FontFamily.outlineMirage,
  },
  { id: "outline-style", label: "Style", fontFamily: FontFamily.outlineStyle },
  {
    id: "outline-twelve",
    label: "Twelve",
    fontFamily: FontFamily.outlineTwelve,
  },
  {
    id: "outline-rostex",
    label: "Rostex",
    fontFamily: FontFamily.outlineRostex,
  },
  {
    id: "outline-ruritania",
    label: "Ruritania",
    fontFamily: FontFamily.outlineRuritania,
  },
  {
    id: "outline-sf",
    label: "SF Distant",
    fontFamily: FontFamily.outlineSFDistant,
  },
  {
    id: "outline-academy",
    label: "Academy",
    fontFamily: FontFamily.outlineAcademy,
  },
  {
    id: "outline-gunplay",
    label: "Gunplay",
    fontFamily: FontFamily.outlineGunplay,
  },
  {
    id: "outline-klarissa",
    label: "Klarissa",
    fontFamily: FontFamily.outlineKlarissa,
  },
  {
    id: "outline-noctra",
    label: "Noctra",
    fontFamily: FontFamily.outlineNoctra,
  },
  {
    id: "outline-bubble",
    label: "Bubble",
    fontFamily: FontFamily.outlineBubble,
  },
  {
    id: "outline-pro",
    label: "Pro Racing",
    fontFamily: FontFamily.outlineProRacing,
  },
  {
    id: "outline-spooky",
    label: "Spooky",
    fontFamily: FontFamily.outlineSpooky,
  },
  {
    id: "outline-universidad",
    label: "Universidad",
    fontFamily: FontFamily.outlineUniversidad,
  },
];
