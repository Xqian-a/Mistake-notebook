import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SubjectInfo } from '../types';
import {
  getAllSubjects,
  createSubject,
  renameSubject,
  deleteSubjectAndRecords,
} from '../utils/subjectManager';
import { getErrorCount } from '../utils/storage';

export default function ManageSubjectsScreen() {
  const navigation = useNavigation();
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectInfo | null>(null);
  const [inputText, setInputText] = useState('');

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

  function openAddModal() {
    setEditingSubject(null);
    setInputText('');
    setModalVisible(true);
  }

  function openRenameModal(subject: SubjectInfo) {
    setEditingSubject(subject);
    setInputText(subject.label);
    setModalVisible(true);
  }

  async function handleModalConfirm() {
    const name = inputText.trim();
    if (!name) {
      Alert.alert('请输入科目名称');
      return;
    }

    if (editingSubject) {
      await renameSubject(editingSubject.id, name);
    } else {
      await createSubject(name);
    }

    setModalVisible(false);
    await loadData();
  }

  function handleDelete(subject: SubjectInfo) {
    const count = counts[subject.id] ?? 0;
    const message =
      count > 0
        ? `确定删除「${subject.label}」吗？该科目下的 ${count} 条错题记录也将被删除。`
        : `确定删除「${subject.label}」吗？`;

    Alert.alert('删除科目', message, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteSubjectAndRecords(subject.id);
          await loadData();
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: SubjectInfo }) => {
    const count = counts[item.id] ?? 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowIcon}>{item.icon}</Text>
          <View>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowCount}>{count} 题</Text>
          </View>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openRenameModal(item)}
          >
            <Text style={styles.actionText}>重命名</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>管理科目</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={subjects}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ 添加新科目</Text>
      </TouchableOpacity>

      {/* Rename / Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {editingSubject ? '重命名科目' : '添加新科目'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入科目名称"
              placeholderTextColor="#999"
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleModalConfirm}
              >
                <Text style={styles.modalConfirmText}>
                  {editingSubject ? '确认' : '添加'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backText: {
    fontSize: 16,
    color: '#4A90D9',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    fontSize: 28,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  rowCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EBF0F5',
  },
  actionText: {
    fontSize: 13,
    color: '#4A90D9',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#FFF0F0',
  },
  deleteText: {
    color: '#E74C3C',
  },
  separator: {
    height: 10,
  },
  addBtn: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  addBtnText: {
    fontSize: 16,
    color: '#4A90D9',
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
});
