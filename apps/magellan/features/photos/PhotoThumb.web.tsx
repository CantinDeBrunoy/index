import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { previewUrl, thumbnailUrl } from './web-folder';

/**
 * Miniature d'une photo du dossier connecté (générée une fois, puis gardée dans le
 * navigateur). `fast` : aperçu immédiat par la vignette EXIF intégrée à la photo, pour
 * l'écran de vérification où des centaines de photos s'affichent d'un coup.
 */
export function PhotoThumb({
  path,
  width,
  height,
  fast,
}: {
  path: string;
  width: number;
  height: number;
  fast?: boolean;
}) {
  const [image, setImage] = useState<{ uri: string; rotate: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = fast ? previewUrl(path) : thumbnailUrl(path).then((uri) => (uri ? { uri, rotate: 0 } : null));
    load
      .then((img) => {
        if (alive) setImage(img);
      })
      .catch(() => {
        // Miniature impossible (dossier non autorisé, image illisible) : on garde le fond.
      });
    return () => {
      alive = false;
    };
  }, [path, fast]);

  return image ? (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={{ uri: image.uri }}
        style={{ width, height, transform: image.rotate ? [{ rotate: `${image.rotate}deg` }] : undefined }}
        resizeMode="cover"
      />
    </View>
  ) : (
    <View style={{ width, height, backgroundColor: '#c9bfae' }} />
  );
}
