import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllErrors, deleteError } from './storage';
import { SubjectInfo } from '../types';
import { SUBJECT_COLORS, SUBJECT_ICONS } from './subjects';

const SUBJECTS_KEY = '@cuotiben_subjects';

const DEFAULT_SUBJECTS: SubjectInfo[] = [
  { id: 'subj_math', label: '数学', color: '#4A90D9', icon: '🔢' },
  { id: 'subj_computer', label: '计算机', color: '#27AE60', icon: '💻' },
  { id: 'subj_english', label: '英语', color: '#E67E22', icon: '📖' },
  { id: 'subj_politics', label: '政治', color: '#E74C3C', icon: '📜' },
];

function generateId(): string {
  return 'subj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Initialize default subjects on first launch.
 */
async function ensureDefaults(): Promise<void> {
  const existing = await AsyncStorage.getItem(SUBJECTS_KEY);
  if (!existing) {
    await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
  }
}

/**
 * Get all subjects (default + custom).
 */
export async function getAllSubjects(): Promise<SubjectInfo[]> {
  await ensureDefaults();
  const json = await AsyncStorage.getItem(SUBJECTS_KEY);
  if (!json) return [...DEFAULT_SUBJECTS];
  try {
    return JSON.parse(json) as SubjectInfo[];
  } catch {
    return [...DEFAULT_SUBJECTS];
  }
}

/**
 * Get a single subject by ID.
 */
export async function getSubjectById(id: string): Promise<SubjectInfo | undefined> {
  const subjects = await getAllSubjects();
  return subjects.find((s) => s.id === id);
}

/**
 * Create a new custom subject.
 */
export async function createSubject(label: string): Promise<SubjectInfo> {
  const subjects = await getAllSubjects();
  const idx = subjects.length;
  const newSubject: SubjectInfo = {
    id: generateId(),
    label,
    color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
    icon: SUBJECT_ICONS[idx % SUBJECT_ICONS.length],
  };
  subjects.push(newSubject);
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  return newSubject;
}

/**
 * Rename any subject.
 */
export async function renameSubject(id: string, newLabel: string): Promise<void> {
  const subjects = await getAllSubjects();
  const idx = subjects.findIndex((s) => s.id === id);
  if (idx === -1) return;
  subjects[idx].label = newLabel;
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
}

/**
 * Delete a subject and all its error records.
 * Returns the number of error records deleted.
 */
export async function deleteSubjectAndRecords(id: string): Promise<number> {
  // Delete all error records belonging to this subject
  const allErrors = await getAllErrors();
  const errorsToDelete = allErrors.filter((e) => e.subject === id);
  for (const err of errorsToDelete) {
    await deleteError(err.id);
  }

  // Remove subject from list
  const subjects = await getAllSubjects();
  const filtered = subjects.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(filtered));

  return errorsToDelete.length;
}
