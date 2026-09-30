import { View } from 'react-native';

/**
 * Miniature d'une photo — variante mobile. Les photos ne s'importent pour l'instant
 * que depuis la version web (dossier du PC) : sur téléphone, un emplacement neutre.
 */
export function PhotoThumb({ width, height }: { path: string; width: number; height: number; fast?: boolean }) {
  return <View style={{ width, height, backgroundColor: '#c9bfae' }} />;
}
