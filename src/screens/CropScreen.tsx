import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { RootStackParamList, CropRect } from '../types';
import { saveError } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Crop'>;
type CropRouteProp = RouteProp<RootStackParamList, 'Crop'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PADDING = 16;
const IMAGE_WIDTH = SCREEN_WIDTH - PADDING * 2;
const MIN_CROP_SIZE = 60;
const HANDLE_SIZE = 28;

export default function CropScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CropRouteProp>();
  const { imageUri, subject } = route.params;

  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const cropRectRef = useRef(cropRect);
  const initialRectRef = useRef<CropRect | null>(null);
  const imageDispSize = useRef({ width: IMAGE_WIDTH, height: IMAGE_WIDTH });

  useEffect(() => {
    cropRectRef.current = cropRect;
  }, [cropRect]);

  // Get original image dimensions and compute display size
  useEffect(() => {
    Image.getSize(
      imageUri,
      (origW, origH) => {
        const aspectRatio = origH / origW;
        const dispW = IMAGE_WIDTH;
        const dispH = dispW * aspectRatio;
        imageDispSize.current = { width: dispW, height: dispH };
        setImageSize({ width: origW, height: origH });

        // Initial crop rectangle: 90% centered
        const margin = dispW * 0.05;
        setCropRect({
          x: margin,
          y: margin,
          width: dispW - margin * 2,
          height: dispH - margin * 2,
        });
      },
      () => {
        Alert.alert('加载失败', '无法加载图片');
      }
    );
  }, [imageUri]);

  const clampRect = useCallback((rect: CropRect): CropRect => {
    const { width: maxW, height: maxH } = imageDispSize.current;
    let { x, y, width, height } = rect;

    // Constrain size
    width = Math.max(MIN_CROP_SIZE, width);
    height = Math.max(MIN_CROP_SIZE, height);

    // Constrain position
    if (x + width > maxW) x = maxW - width;
    if (y + height > maxH) y = maxH - height;
    x = Math.max(0, x);
    y = Math.max(0, y);

    return { x, y, width, height };
  }, []);

  // Create PanResponder for a specific corner
  const createCornerPanResponder = useCallback(
    (corner: 'tl' | 'tr' | 'bl' | 'br') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          initialRectRef.current = { ...cropRectRef.current };
        },
        onPanResponderMove: (_, gs) => {
          if (!initialRectRef.current || !imageDispSize.current) return;
          const r = initialRectRef.current;
          let x = r.x,
            y = r.y,
            w = r.width,
            h = r.height;

          switch (corner) {
            case 'tl':
              x = r.x + gs.dx;
              y = r.y + gs.dy;
              w = r.width - gs.dx;
              h = r.height - gs.dy;
              break;
            case 'tr':
              y = r.y + gs.dy;
              w = r.width + gs.dx;
              h = r.height - gs.dy;
              break;
            case 'bl':
              x = r.x + gs.dx;
              w = r.width - gs.dx;
              h = r.height + gs.dy;
              break;
            case 'br':
              w = r.width + gs.dx;
              h = r.height + gs.dy;
              break;
          }

          setCropRect(clampRect({ x, y, width: w, height: h }));
        },
      }),
    [clampRect]
  );

  // Create 4 corner PanResponders once and store in ref
  const cornerPRs = useRef({
    tl: createCornerPanResponder('tl'),
    tr: createCornerPanResponder('tr'),
    bl: createCornerPanResponder('bl'),
    br: createCornerPanResponder('br'),
  }).current;

  // PanResponder for moving the entire rectangle
  const movePR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
      onPanResponderGrant: () => {
        initialRectRef.current = { ...cropRectRef.current };
      },
      onPanResponderMove: (_, gs) => {
        if (!initialRectRef.current || !imageDispSize.current) return;
        const r = initialRectRef.current;
        setCropRect(
          clampRect({
            x: r.x + gs.dx,
            y: r.y + gs.dy,
            width: r.width,
            height: r.height,
          })
        );
      },
    })
  ).current;

  const handleReset = () => {
    const { width: dispW, height: dispH } = imageDispSize.current;
    const margin = dispW * 0.05;
    setCropRect({
      x: margin,
      y: margin,
      width: dispW - margin * 2,
      height: dispH - margin * 2,
    });
  };

  const handleConfirm = async () => {
    if (!imageSize || !imageDispSize.current) return;
    const rect = cropRectRef.current;

    setIsProcessing(true);
    try {
      // Map display coordinates to original image coordinates
      const { width: imgW, height: imgH } = imageSize;
      const { width: dispW, height: dispH } = imageDispSize.current;

      const scaleX = imgW / dispW;
      const scaleY = imgH / dispH;

      const cropOriginX = Math.round(rect.x * scaleX);
      const cropOriginY = Math.round(rect.y * scaleY);
      const cropWidth = Math.round(rect.width * scaleX);
      const cropHeight = Math.round(rect.height * scaleY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: cropOriginX,
              originY: cropOriginY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Save to local storage
      await saveError(subject, result.uri);

      // Go back to subject screen (pop Camera and Crop)
      navigation.navigate('Subject', { subject });
    } catch (err) {
      Alert.alert('保存失败', '裁剪保存时出错，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const dispSize = imageDispSize.current;
  const hasImage = imageSize !== null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBtnText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>裁剪错题</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleReset}>
          <Text style={styles.headerBtnText}>重置</Text>
        </TouchableOpacity>
      </View>

      {/* Crop Area */}
      {hasImage && (
        <View style={styles.cropWrapper}>
          <View
            style={[
              styles.imageContainer,
              { width: IMAGE_WIDTH, height: dispSize.height },
            ]}
          >
            {/* The image */}
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { width: IMAGE_WIDTH, height: dispSize.height }]}
              resizeMode="stretch"
            />

            {/* Semi-transparent overlays (frame with hole) */}
            <View
              style={[
                styles.overlay,
                { top: 0, left: 0, right: 0, height: cropRect.y },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: cropRect.y + cropRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: cropRect.y,
                  left: 0,
                  width: cropRect.x,
                  height: cropRect.height,
                },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: cropRect.y,
                  left: cropRect.x + cropRect.width,
                  right: 0,
                  height: cropRect.height,
                },
              ]}
            />

            {/* Crop rectangle border */}
            <View
              pointerEvents="none"
              style={[
                styles.cropBorder,
                {
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                },
              ]}
            />

            {/* Drag area (entire rectangle) */}
            <View
              style={[
                styles.moveArea,
                {
                  left: cropRect.x + HANDLE_SIZE / 2,
                  top: cropRect.y + HANDLE_SIZE / 2,
                  width: cropRect.width - HANDLE_SIZE,
                  height: cropRect.height - HANDLE_SIZE,
                },
              ]}
              {...movePR.panHandlers}
            />

            {/* Corner handles */}
            <View
              style={[
                styles.handle,
                { left: cropRect.x - HANDLE_SIZE / 2, top: cropRect.y - HANDLE_SIZE / 2 },
              ]}
              {...cornerPRs.tl.panHandlers}
            >
              <View style={styles.handleDot} />
            </View>
            <View
              style={[
                styles.handle,
                {
                  left: cropRect.x + cropRect.width - HANDLE_SIZE / 2,
                  top: cropRect.y - HANDLE_SIZE / 2,
                },
              ]}
              {...cornerPRs.tr.panHandlers}
            >
              <View style={styles.handleDot} />
            </View>
            <View
              style={[
                styles.handle,
                {
                  left: cropRect.x - HANDLE_SIZE / 2,
                  top: cropRect.y + cropRect.height - HANDLE_SIZE / 2,
                },
              ]}
              {...cornerPRs.bl.panHandlers}
            >
              <View style={styles.handleDot} />
            </View>
            <View
              style={[
                styles.handle,
                {
                  left: cropRect.x + cropRect.width - HANDLE_SIZE / 2,
                  top: cropRect.y + cropRect.height - HANDLE_SIZE / 2,
                },
              ]}
              {...cornerPRs.br.panHandlers}
            >
              <View style={styles.handleDot} />
            </View>
          </View>

          {/* Hint text */}
          <Text style={styles.hint}>拖拽角落调整裁剪区域，拖拽中部移动位置</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>确认保存</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading overlay */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A90D9" />
            <Text style={styles.loadingText}>正在保存...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cropWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  moveArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4A90D9',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: '#4A90D9',
    minWidth: 130,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
});
