export const apiQueryKeys = {
  auth: {
    user: ["auth", "user"] as const,
    accounts: (mobile: string) => ["auth", "accounts", mobile] as const,
  },
  assets: {
    home: ["assets", "home"] as const,
    colors: ["assets", "colors"] as const,
    drawings: ["assets", "drawings"] as const,
    sketches: ["assets", "sketches"] as const,
  },
  contest: {
    winners: ["contest", "winners"] as const,
    winning: ["contest", "winning"] as const,
  },
  legal: {
    privacy: ["legal", "privacy"] as const,
    terms: ["legal", "terms"] as const,
    license: ["legal", "license"] as const,
  },
  profile: {
    me: ["profile", "me"] as const,
  },
} as const;
