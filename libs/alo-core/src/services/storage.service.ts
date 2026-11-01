import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private cloudName = 'dmlespzah';
  private uploadPreset = 'fresas_alo'; // crea este preset en Cloudinary → Settings → Upload → Upload presets → Unsigned

  async uploadImage(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      throw new Error('Error al subir imagen a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url as string;
  }

  async deleteImage(_url: string): Promise<void> {
    // Las imágenes se eliminan desde Cloudinary Dashboard
  }
}
