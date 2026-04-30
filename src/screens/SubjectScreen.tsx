import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Dimensions,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ErrorRecord, SubjectInfo } from '../types';
import { getSubjectById } from '../utils/subjectManager';
import { getErrorsGroupedByDate, deleteError, formatDateChinese } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Subject'>;
type SubjectRouteProp = RouteProp<RootStackParamList, 'Subject'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_GAP = 8;
const IMAGE_SIZE = (SCREEN_WIDTH - 16 * 2 - IMAGE_GAP) / 2;

export default function SubjectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubjectRouteProp>();
  const { subject: subjectId } = route.params;

  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);
  const [groups, setGroups] = useState<
    { date: string; records: ErrorRecord[] }[]
  >([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [subjectId])
  );

  async function loadData() {
    const info = await getSubjectById(subjectId);
    setSubjectInfo(info || null);
    const data = await getErrorsGroupedByDate(subjectId);
    setGroups(data);
  }

  const handleAddPress = () => {
    navigation.navigate('Camera', { subject: subjectId });
  };

  const handleImagePress = (uri: string) => {
    setPreviewUri(uri);
  };

  const handleDelete = (record: ErrorRecord) => {
    Alert.alert('删除错题', '确定要删除这条错题记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteError(record.id);
          loadData();
        },
      },
    ]);
  };

  const renderErrorItem = ({ item }: { item: ErrorRecord }) => (
    <TouchableOpacity
      style={styles.errorCard}
      activeOpacity={0.85}
      onPress={() => handleImagePress(item.imagePath)}
      onLongPress={() => handleDelete(item)}
    >
      <Image
        source={{ uri: item.imagePath }}
        style={styles.errorImage}
        resizeMode="cover"
      />
      <View style={styles.errorTimeBadge}>
        <Text style={styles.errorTimeText}>
          {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderGroup = ({
    item,
  }: {
    item: { date: string; records: ErrorRecord[] };
  }) => (
    <View style={styles.groupContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionDate}>{formatDateChinese(item.date)}</Text>
      </View>
      <View style={styles.imageGrid}>
        {item.records.map((record) => (
          <View key={record.id} style={styles.imageWrapper}>
            {renderErrorItem({ item: record })}
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={styles.emptyTitle}>暂无错题</Text>
      <Text style={styles.emptyDesc}>点击下方按钮添加错题</Text>
    </View>
  );

  const headerColor = subjectInfo?.color || '#2C3E50';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerIcon}>{subjectInfo?.icon || '📁'}</Text>
          <Text style={styles.headerTitle}>{subjectInfo?.label || '科目'}</Text>
          <Text style={styles.headerCount}>
            {groups.reduce((sum, g) => sum + g.records.length, 0)} 题
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: headerColor }]}
        activeOpacity={0.8}
        onPress={handleAddPress}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Full image preview modal */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPreviewUri(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    paddingTop: (RNStatusBar.currentHeight || 44) + 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  headerCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  groupContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
    backgroundColor: '#EBEDF0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_GAP,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
  },
  errorCard: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.2,
  },
  errorTimeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  errorTimeText: {
    color: '#FFF',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '300',
    lineHeight: 34,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.4,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
