const BASE_URL = 'https://outfit-design-server-1.onrender.com/api';

/**
 * Uploads an image and generates stylized variations
 * @param {string} imageData
 * @returns {Promise<Object>} - Object containing original image and stylized predictions
 */
export async function uploadAndStylizeImage(imageData) {
  try {
    const formData = new FormData();
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      const response = await fetch(imageData);
      const blob = await response.blob();
      formData.append('image', blob, 'outfit.jpg');
    } else {
      throw new Error('Invalid image data format');
    }
    
    const response = await fetch(`${BASE_URL}/stylize`, {
      method: 'POST',
      body: formData,
    });
   
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to stylize image');
    }
    
    // Response now contains original image info and predictions array
    return await response.json();
  } catch (error) {
    console.error('Error in uploadAndStylizeImage:', error);
    throw error;
  }
}

/**
 * Check the status of a running prediction and get updated results
 * @param {string} predictionId - The ID of the prediction to check
 * @returns {Promise<Object>} - Status of the prediction
 */
export async function checkPredictionStatus(predictionId) {
  try {
    const response = await fetch(`${BASE_URL}/prediction-status/${predictionId}`);
   
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check prediction status');
    }
   
    return await response.json();
  } catch (error) {
    console.error('Error in checkPredictionStatus:', error);
    throw error;
  }
}

/**
 * Convert a Data URL to a File object
 * @param {string} dataUrl - The data URL string
 * @param {string} filename - The filename to use
 * @returns {File} - A File object
 */
export function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
 
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
 
  return new File([u8arr], filename, { type: mime });
}

/**
 * Download an image from a URL
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - The filename to save as
 */
export function downloadImage(imageUrl, filename) {
  fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error downloading image:', error);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

/**
 * Get a specific stylized prediction by occasion
 * @param {Object} response - The response from uploadAndStylizeImage
 * @param {string} occasion - The occasion to find (e.g., "Office", "Party", "Vacation")
 * @returns {Object|null} - The prediction object or null if not found
 */
export function getPredictionByOccasion(response, occasion) {
  if (!response || !response.predictions || !Array.isArray(response.predictions)) {
    return null;
  }
  
  return response.predictions.find(prediction => 
    prediction.occasion === occasion && prediction.status === "succeeded"
  ) || null;
}

/**
 * Check if all predictions have succeeded
 * @param {Object} response - The response from uploadAndStylizeImage or checkPredictionStatus
 * @returns {boolean} - True if all predictions have succeeded
 */
export function allPredictionsComplete(response) {
  if (!response || !response.predictions || !Array.isArray(response.predictions)) {
    return false;
  }
  
  return response.predictions.every(prediction => prediction.status === "succeeded");
}