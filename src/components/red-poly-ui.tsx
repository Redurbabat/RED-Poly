/**
 * RED POLY UI primitives. Designed to be shared by all feature agents.
 * No storage, routing side effects or dependency on third-party content.
 * Optical Glass is an optional visual treatment, never a contrast requirement.
 */
import React, { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { haptics } from "@/lib/haptics";
import { radius, useResolvedScheme, useThemeColors } from "@/lib/theme";

type SurfaceProps = { children: ReactNode; style?: StyleProp<ViewStyle> };
type ButtonTone = "primary" | "secondary" | "danger";

export function PolyCard({ children, style }: SurfaceProps) {
  const c = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.neutral200 }, style]}>
      {children}
    </View>
  );
}

/** Translucent on supported compositors; an opaque, legible fallback elsewhere. */
export function PolyGlassSurface({ children, style }: SurfaceProps) {
  const c = useThemeColors();
  const scheme = useResolvedScheme();
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => { if (active) setReduceTransparency(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);
  const translucent = !reduceTransparency && Platform.OS !== "web";
  return (
    <View style={[styles.card, {
      backgroundColor: translucent
        ? scheme === "dark" ? "rgba(27,39,46,0.94)" : "rgba(255,255,255,0.94)"
        : c.surface,
      borderColor: c.neutral200,
    }, style]}>
      {children}
    </View>
  );
}

export function PolyButton({
  label, onPress, tone = "primary", disabled = false, loading = false, style,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const bg = tone === "danger" ? c.roseDark : tone === "secondary" ? c.surface : c.indigo;
  const fg = tone === "secondary" ? c.text : c.white;
  const inactive = disabled || loading;
  return (
    <Pressable
      role="button"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: tone === "secondary" ? c.neutral300 : bg,
          opacity: inactive ? 0.45 : pressed ? 0.78 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} accessibilityLabel="Laden" /> : (
        <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function PolyTextField({
  label, error, ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        aria-invalid={!!error}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { backgroundColor: c.surface, borderColor: error ? c.rose : c.neutral300, color: c.text }, inputProps.style]}
      />
      {!!error && <Text accessibilityRole="alert" style={{ color: c.roseDark }}>{error}</Text>}
    </View>
  );
}

export function PolyNavItem({
  label, selected, onPress,
}: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => [styles.nav, {
        backgroundColor: selected ? c.selectedBg : c.surface,
        borderColor: selected ? c.skyDark : c.neutral200,
        opacity: pressed ? 0.8 : 1,
      }]}
    >
      <Text style={{ color: selected ? c.selectedText : c.text, fontWeight: selected ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

export function PolyDialog({
  visible, title, message, confirmLabel = "OK", cancelLabel = "Abbrechen", onConfirm, onCancel,
}: {
  visible: boolean; title: string; message: string;
  confirmLabel?: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const c = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.dialog, { backgroundColor: c.surface }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={{ color: c.text, lineHeight: 22 }}>{message}</Text>
          <PolyButton tone="primary" label={confirmLabel} onPress={onConfirm} />
          <PolyButton tone="secondary" label={cancelLabel} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

export function PolyLoading({ label = "Wird geladen" }: { label?: string }) {
  const c = useThemeColors();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.inline}>
      <ActivityIndicator color={c.indigo} />
      <Text style={{ color: c.textMuted }}>{label}</Text>
    </View>
  );
}

export function PolyError({
  message, retryLabel = "Erneut versuchen", onRetry,
}: { message: string; retryLabel?: string; onRetry?: () => void }) {
  const c = useThemeColors();
  return (
    <View accessibilityRole="alert" style={[styles.error, { backgroundColor: c.wrongBg }]}>
      <Text style={{ color: c.wrongText, flexShrink: 1 }}>{message}</Text>
      {onRetry && <PolyButton tone="secondary" label={retryLabel} onPress={onRetry} />}
    </View>
  );
}

export function PolyProgress({
  progress, label,
}: { progress: number; label: string }) {
  const c = useThemeColors();
  const ratio = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={styles.progressWrap}
    >
      <Text style={{ color: c.text }}>{label}</Text>
      <View style={[styles.track, { backgroundColor: c.neutral200 }]}>
        <View style={[styles.fill, { backgroundColor: c.greenDark, width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

/** Use this for optional animated interactions; reduced-motion users get zero duration. */
export function usePolyMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (active) setReduced(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return { reducedMotion: reduced, feedbackDuration: reduced ? 0 : 180, transitionDuration: reduced ? 0 : 280 };
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: 16 },
  button: { minHeight: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 10 },
  buttonLabel: { fontWeight: "700", fontSize: 16, textAlign: "center" },
  field: { gap: 6 },
  label: { fontWeight: "600", fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 },
  nav: { minHeight: 44, minWidth: 44, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 11, justifyContent: "center", alignItems: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  dialog: { borderRadius: radius.xl, padding: 20, gap: 16, maxWidth: 440, width: "100%", alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  inline: { flexDirection: "row", gap: 12, alignItems: "center" },
  error: { padding: 16, gap: 12, borderRadius: radius.lg },
  progressWrap: { gap: 8 },
  track: { height: 10, borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
});
