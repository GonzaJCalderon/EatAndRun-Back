export const subirACloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'eatandrun_upload'); // Creá este preset en Cloudinary

  const res = await fetch('https://api.cloudinary.com/v1_1/dwiga4jg8/image/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
};
