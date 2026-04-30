import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { ErrorRecord } from '../types';

const STORAGE_KEY = '@cuotiben_error_records';
const ERRORS_DIR = `${FileSystem.documentDirectory}errors/`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getSubjectDir(subject: string): string {
  return `${ERRORS_DIR}${subject}/`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateKey(isoString: string): string {
  return formatDate(isoString);
}

async function ensureDirectories(subject: string): Promise<void> {
  const dir = getSubjectDir(subject);
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Save an error record (image + metadata).
 */
export async function saveError(
  subject: string,
  imageSourceUri: string
): Promise<ErrorRecord> {
  await ensureDirectories(subject);

  const id = generateId();
  const now = new Date().toISOString();
  const filename = `${id}.jpg`;
  const destPath = getSubjectDir(subject) + filename;

  await FileSystem.copyAsync({
    from: imageSourceUri,
    to: destPath,
  });

  const record: ErrorRecord = {
    id,
    subject,
    imagePath: destPath,
    thumbnailPath: destPath,
    createdAt: now,
  };

  const records = await getAllErrors();
  records.push(record);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  return record;
}

/**
 * Get all error records.
 */
export async function getAllErrors(): Promise<ErrorRecord[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json) as ErrorRecord[];
  } catch {
    return [];
  }
}

/**
 * Get errors for a specific subject, sorted by date descending.
 */
export async function getErrorsBySubject(
  subject: string
): Promise<ErrorRecord[]> {
  const all = await getAllErrors();
  return all
    .filter((r) => r.subject === subject)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get errors grouped by date for a subject.
 */
export async function getErrorsGroupedByDate(
  subject: string
): Promise<{ date: string; records: ErrorRecord[] }[]> {
  const records = await getErrorsBySubject(subject);
  const groups: { [key: string]: ErrorRecord[] } = {};

  for (const record of records) {
    const key = getDateKey(record.createdAt);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(record);
  }

  return Object.entries(groups)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, recs]) => ({
      date,
      records: recs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
}

/**
 * Delete an error record.
 */
export async function deleteError(id: string): Promise<void> {
  const records = await getAllErrors();
  const record = records.find((r) => r.id === id);
  if (!record) return;

  const updated = records.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  try {
    const info = await FileSystem.getInfoAsync(record.imagePath);
    if (info.exists) {
      await FileSystem.deleteAsync(record.imagePath, { idempotent: true });
    }
  } catch {
    // File might already be deleted
  }
}

/**
 * Get total error count for a subject.
 */
export async function getErrorCount(subject: string): Promise<number> {
  const records = await getErrorsBySubject(subject);
  return records.length;
}

/**
 * Format a date string to Chinese format.
 * e.g. "2024-01-15" -> "2024年1月15日"
 */
export function formatDateChinese(isoStringOrDate: string): string {
  const date = new Date(isoStringOrDate);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}
