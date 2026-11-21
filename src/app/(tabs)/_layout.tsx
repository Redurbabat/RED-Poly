/**
 * Shared tab navigator entry point. Metro resolves the platform implementation:
 * iOS uses real UITabBar tabs, Android/web keep their established navigation.
 * Do not add a second tab bar overlay or glass imitation.
 */
import PolyTabNavigator from "@/components/navigation/poly-tabs";

export default function TabsLayout() {
  return <PolyTabNavigator />;
}
