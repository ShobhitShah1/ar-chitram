import { PATTERN_TEXTURES } from "@/assets/icons";
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
  {
    id: "font-monte-carlo",
    label: "MonteCarlo",
    fontFamily: FontFamily.signatureMonteCarlo,
  },
  {
    id: "font-monsieur-la-doulaise",
    label: "MonsieurLaDoulaise",
    fontFamily: FontFamily.signatureMonsieurLaDoulaise,
  },
  {
    id: "font-molle",
    label: "Molle",
    fontFamily: FontFamily.signatureMolle,
  },
  {
    id: "font-montez",
    label: "Montez",
    fontFamily: FontFamily.signatureMontez,
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
