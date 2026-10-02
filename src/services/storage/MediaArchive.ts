import * as FileSystem from 'expo-file-system';

export interface ArchivedMedia {
  uri: string;
  md5?: string;
}

const asFileUri = (value: string) => value.startsWith('/') ? `file://${value}` : value;

export async function archiveMedia(source: string, sessionId: string, name: string): Promise<ArchivedMedia> {
  const uri = asFileUri(source);
  const root = FileSystem.documentDirectory;
  if (!root || !uri.startsWith('file://')) return { uri };

  const directory = `${root}sentinel-sessions/`;
  const extension = uri.split('?')[0].match(/\.(mp4|mov|m4a|aac|wav)$/i)?.[0]?.toLowerCase() ?? '.mp4';
  const destination = `${directory}${sessionId}-${name}${extension}`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    if (uri !== destination) await FileSystem.copyAsync({ from: uri, to: destination });
    const info = await FileSystem.getInfoAsync(destination, { md5: true });
    return { uri: info.exists ? destination : '', md5: info.exists ? info.md5 : undefined };
  } catch {
    const info = await FileSystem.getInfoAsync(uri, { md5: true }).catch(() => null);
    return { uri: info?.exists ? uri : '', md5: info?.exists ? info.md5 : undefined };
  }
}
