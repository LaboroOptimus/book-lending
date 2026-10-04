import { BasePropertyProps, Box, Label, Text } from 'adminjs';
import React, { useState } from 'react';

export const CoverUpload = ({ property, record, onChange }: BasePropertyProps) => {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const token = await fetch('/csrf-token', { credentials: 'same-origin' }).then((response) => response.json());
      const body = new FormData(); body.append('file', file);
      const response = await fetch('/uploads/covers', { method: 'POST', credentials: 'same-origin', headers: { 'x-csrf-token': token.csrfToken }, body });
      if (!response.ok) throw new Error('Cover upload failed.');
      const cover = await response.json();
      onChange(property.name, cover.secureUrl);
      onChange('coverImageKey', cover.publicId);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Cover upload failed.'); }
    finally { setUploading(false); }
  };
  return <Box mb="xl"><Label>{property.label}</Label><input aria-label="Cover image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} /><Text>{uploading ? 'Uploading…' : record.params.coverImageUrl ? 'Cover uploaded.' : 'JPEG, PNG or WebP, up to 5 MB.'}</Text>{error && <Text color="error">{error}</Text>}</Box>;
};
export default CoverUpload;
