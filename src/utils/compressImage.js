export const compressImageFile = async (file) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(new Error('Could not load this image.'));
      loadedImage.src = objectUrl;
    });
    const scale = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not process this image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressedImage = canvas.toDataURL('image/jpeg', 0.75);
    if (compressedImage.length > 280_000) {
      throw new Error('This image is too large after compression. Choose another image.');
    }
    return compressedImage;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
