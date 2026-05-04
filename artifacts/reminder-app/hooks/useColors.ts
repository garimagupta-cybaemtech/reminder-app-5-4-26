import colors from "@/constants/colors";

/**
 * Always returns the light palette.
 * The app is intentionally fixed to a clean white theme.
 */
export function useColors() {
  return { ...colors.light, radius: colors.radius };
}
