import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SubjectInfo, RootStackParamList } from '../types';
import { getAllSubjects } from '../utils/subjectManager';
import { getErrorCount } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const all = await getAllSubjects();
    setSubjects(all);
    const results: Record<string, number> = {};
    for (const subj of all) {
      results[subj.id] = await getErrorCount(subj.id);
    }
    setCounts(results);
  }

  const handleSubjectPress = (subjectId: string) => {
    navigation.navigate('Subject', { subject: subjectId });
  };

  const handleManagePress = () => {
    navigation.navigate('ManageSubjects');
  };

  const renderCard = ({ item }: { item: SubjectInfo }) => {
    const count = counts[item.id] ?? 0;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: item.color }]}
        onPress={() => handleSubjectPress(item.id)}
      >
        <Text style={styles.cardIcon}>{item.icon}</Text>
        <Text style={styles.cardLabel}>{item.label}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardCount}>{count} 题</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>错题本</Text>
          <Text style={styles.headerSubtitle}>选择科目查看错题</Text>
        </View>
        <TouchableOpacity style={styles.manageBtn} onPress={handleManagePress}>
          <Text style={styles.manageBtnText}>管理</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={subjects}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={subjects.length > 1 ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>暂无科目，点击右上角「管理」添加</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  manageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  manageBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
    paddingBottom: 32,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardFooter: {
    marginTop: 12,
  },
  cardCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
});
