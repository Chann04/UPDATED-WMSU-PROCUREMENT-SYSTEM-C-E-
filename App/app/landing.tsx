import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useColorScheme,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, clamp } from 'react-native-reanimated';
import { WMSU } from '@/constants/theme';

/** Background is larger than the viewport so users can pan to see more of the photo. */
const HERO_IMAGE_SCALE = 1.45;

export default function LandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isLight = colorScheme === 'light';
  const insets = useSafeAreaInsets();

  const layoutW = useSharedValue(0);
  const layoutH = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const onHeroLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    layoutW.value = width;
    layoutH.value = height;
    const iw = width * HERO_IMAGE_SCALE;
    const ih = height * HERO_IMAGE_SCALE;
    tx.value = (width - iw) / 2;
    ty.value = (height - ih) / 2;
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((ev) => {
      const w = layoutW.value;
      const h = layoutH.value;
      if (w < 1 || h < 1) return;
      const iw = w * HERO_IMAGE_SCALE;
      const ih = h * HERO_IMAGE_SCALE;
      const minX = w - iw;
      const minY = h - ih;
      tx.value = clamp(startTx.value + ev.translationX, minX, 0);
      ty.value = clamp(startTy.value + ev.translationY, minY, 0);
    });

  const imagePanStyle = useAnimatedStyle(() => {
    const w = layoutW.value;
    const h = layoutH.value;
    if (w < 1 || h < 1) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }], width: 0, height: 0 };
    }
    return {
      position: 'absolute' as const,
      width: w * HERO_IMAGE_SCALE,
      height: h * HERO_IMAGE_SCALE,
      transform: [{ translateX: tx.value }, { translateY: ty.value }],
    };
  });

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: isLight ? '#F9FAFB' : '#1A1A1A' }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.headerLogo} />
            <Text style={styles.headerTitle}>WMSU-Procurement</Text>
          </View>
          <Pressable onPress={() => router.push('/login')} style={[styles.navBtn, styles.navBtnPrimary]}>
            <Text style={styles.navBtnTextPrimary}>Log in</Text>
          </Pressable>
        </View>

        <View style={styles.main}>
          <View style={styles.heroShell} onLayout={onHeroLayout}>
            <GestureDetector gesture={pan}>
              <Animated.View style={imagePanStyle}>
                <Image
                  source={require('@/assets/images/wmsuimage.jpg')}
                  style={styles.heroImageFill}
                  resizeMode="cover"
                  accessibilityLabel="Campus photo — drag to pan"
                />
              </Animated.View>
            </GestureDetector>
            <View style={styles.heroOverlay} pointerEvents="none" />
            <View style={styles.heroContent} pointerEvents="none">
              <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.heroEmblem} />
              <Text style={styles.heroTitle}>Western Mindanao State University</Text>
              <Text style={styles.heroSubtitle}>Procurement Office</Text>
              <Text style={styles.heroTagline}>WMSU-Procurement · A Smart Research University by 2040</Text>
              <Text style={styles.panHint}>Drag anywhere to move the photo</Text>
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.footerText}>
              Western Mindanao State University · Procurement Office · WMSU-Procurement ©{' '}
              {new Date().getFullYear()}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: WMSU.red,
    borderBottomWidth: 1,
    borderBottomColor: WMSU.redDark || '#6B0000',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  navBtnPrimary: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingHorizontal: 16 },
  navBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  main: { flex: 1, minHeight: 0 },
  heroShell: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#5c0000',
    overflow: 'hidden',
  },
  heroImageFill: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139,0,0,0.78)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroEmblem: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
  },
  heroTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 16,
    textAlign: 'center',
  },
  panHint: {
    marginTop: 20,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  footer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: WMSU.red,
    alignItems: 'center',
  },
  footerText: { fontSize: 13, color: '#FFFFFF', textAlign: 'center' },
});
