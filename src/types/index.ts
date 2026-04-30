export interface SubjectInfo {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface ErrorRecord {
  id: string;
  subject: string; // subject ID
  imagePath: string;
  thumbnailPath: string;
  createdAt: string; // ISO string
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RootStackParamList = {
  Home: undefined;
  Subject: { subject: string };
  Camera: { subject: string };
  Crop: { imageUri: string; subject: string };
  ManageSubjects: undefined;
};
