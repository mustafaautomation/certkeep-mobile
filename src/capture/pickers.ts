import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { CapturedFile, DocumentType } from '@/domain/types';

export async function pickFromCamera(): Promise<CapturedFile | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera permission is needed to photograph a certificate.');
    }
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    fileName: asset.fileName ?? 'certificate-photo.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
    uri: asset.uri,
  };
}

export async function pickFromLibrary(): Promise<CapturedFile | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is needed to attach a certificate.');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    fileName: asset.fileName ?? 'certificate-image.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
    uri: asset.uri,
  };
}

export async function pickDocument(): Promise<CapturedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    fileName: asset.name,
    mimeType: asset.mimeType ?? 'application/pdf',
    uri: asset.uri,
  };
}

export function sampleCapture(documentType: DocumentType): CapturedFile {
  return {
    fileName: `${documentType.replace(/_/g, '-')}-sample.pdf`,
    mimeType: 'application/pdf',
    uri: 'sample://certificate.pdf',
  };
}
