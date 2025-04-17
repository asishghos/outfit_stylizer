import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import LoadingSpinner from './components/LoadingBar';
import StylePreview from './components/StylePreview';
import { uploadAndStylizeImage, downloadImage, downloadTextFile  } from './services/apiServices';
import './App.css';

const App = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('all');
  const [stylizedImages, setStylizedImages] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleUploadedImage = (dataUrl, file) => {
    const newImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      dataUrl,
      name: file.name
    };

    setUploadedImages(prev => [...prev, newImage].slice(0, 5));
    setUploadedImage(dataUrl);
  };
// un use
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      const newImages = files.slice(0, 5 - uploadedImages.length);

      Promise.all(
        newImages.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              file,
              dataUrl: e.target.result,
              name: file.name
            });
            reader.readAsDataURL(file);
          });
        })
      ).then(imageObjects => {
        setUploadedImages(prev => [...prev, ...imageObjects].slice(0, 5));
        setUploadedImage(imageObjects[0]?.dataUrl);
      });
    }
  };

  const processAllImages = async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least one image first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStylizedImages([]);

    try {
      for (const image of uploadedImages) {
        if (results[image.id]?.predictions) continue;

        const result = await uploadAndStylizeImage(image.dataUrl);

        setResults(prev => ({
          ...prev,
          [image.id]: {
            originalImage: image,
            predictions: result.predictions.map(pred => ({
              ...pred,
              imageUrl: null,
              isLoading: true
            }))
          }
        }));

        if (uploadedImage === image.dataUrl) {
          const availableImages = result.predictions
            .filter(p => p.output)
            .map(p => ({
              url: p.output,
              occasion: p.occasion,
              description: p.description
            }));

          if (availableImages.length > 0) {
            setStylizedImages(availableImages);
          }
        }
      }
    } catch (err) {
      setError("Error processing images. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const pendingPredictions = [];

    Object.entries(results).forEach(([imageId, data]) => {
      if (data.predictions) {
        data.predictions.forEach(pred => {
          if (pred.isLoading && pred.predictionId) {
            pendingPredictions.push({
              imageId,
              predictionId: pred.predictionId,
              occasion: pred.occasion,
              originalImageUrl: data.originalImage.dataUrl
            });
          }
        });
      }
    });

    if (pendingPredictions.length === 0) return;

    const timers = pendingPredictions.map(({ imageId, predictionId, occasion, originalImageUrl }) => {
      return setInterval(async () => {
        try {
          const status = await checkPredictionStatus(predictionId);

          if (status.status === 'succeeded' || status.output) {
            setResults(prev => {
              const imageData = { ...prev[imageId] };
              imageData.predictions = imageData.predictions.map(p =>
                p.predictionId === predictionId
                  ? {
                    ...p,
                    isLoading: false,
                    imageUrl: status.output,
                    status: 'succeeded',
                    description: status.description || p.description
                  }
                  : p
              );
              return { ...prev, [imageId]: imageData };
            });

            if (uploadedImage === originalImageUrl) {
              setStylizedImages(prev => {
                const exists = prev.some(img => img.occasion === occasion);
                if (exists) {
                  return prev.map(img =>
                    img.occasion === occasion
                      ? {
                        ...img,
                        url: status.output,
                        description: status.description || img.description
                      }
                      : img
                  );
                } else {
                  return [...prev, {
                    url: status.output,
                    occasion,
                    description: status.description || "Style transformation complete."
                  }];
                }
              });
            }
          } else if (status.status === 'failed') {
            setResults(prev => {
              const imageData = { ...prev[imageId] };
              imageData.predictions = imageData.predictions.map(p =>
                p.predictionId === predictionId
                  ? { ...p, isLoading: false, error: status.error || 'Generation failed', status: 'failed' }
                  : p
              );
              return { ...prev, [imageId]: imageData };
            });
          }
        } catch (err) {
          console.error(`Error checking prediction ${predictionId}:`, err);
        }
      }, 3000);
    });

    return () => timers.forEach(timer => clearInterval(timer));
  }, [results, uploadedImage]);

  const getFilteredResults = () => {
    const allResults = [];

    Object.values(results).forEach(imageResult => {
      if (!imageResult.predictions) return;

      imageResult.predictions.forEach(pred => {
        if (pred.status === 'succeeded' && pred.imageUrl) {
          if (currentTab === 'all' || currentTab.toLowerCase() === pred.occasion.toLowerCase()) {
            allResults.push({
              originalImage: imageResult.originalImage.dataUrl,
              stylizedImage: pred.imageUrl,
              occasion: pred.occasion,
              imageName: imageResult.originalImage.name,
              description: pred.description || "Style transformation complete."
            });
          }
        }
      });
    });

    return allResults;
  };

  const getCounts = () => {
    const counts = { Office: 0, Party: 0, Vacation: 0 };

    Object.values(results).forEach(imageResult => {
      if (!imageResult.predictions) return;

      imageResult.predictions.forEach(pred => {
        if (pred.status === 'succeeded' && pred.imageUrl && counts[pred.occasion] !== undefined) {
          counts[pred.occasion]++;
        }
      });
    });

    return counts;
  };

  const removeImage = (imageIndex) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== imageIndex));
  };

  const counts = getCounts();
  const filteredResults = getFilteredResults();
  const completedCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const totalExpected = uploadedImages.length * 3;

  const handleDownload = (imageUrl, occasion, imageName) => {
    const baseName = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
    downloadImage(imageUrl, `${baseName}-${occasion.toLowerCase()}.jpg`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Fashion Style Transformer</h1>
          <p className="text-gray-600 mt-2">
            Transform your outfit photos into styled variations for different occasions
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Your Outfits (Max 5)</h2>

          {uploadedImages.length < 5 && (
            <div className="mb-6">
              <ImageUploader
                onImageUpload={(dataUrl, file) => handleUploadedImage(dataUrl, file)}
              />
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Selected Images ({uploadedImages.length}/5):</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.dataUrl}
                      alt={`Outfit ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                    <p className="text-sm mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={processAllImages}
                  disabled={isProcessing || uploadedImages.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
                >
                  {isProcessing ? 'Processing...' : 'Generate All Style Variants'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {totalExpected > 0 && (
            <div className="mt-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <p>Progress: {completedCount} of {totalExpected} images completed</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-blue-100 p-2 rounded">Office: {counts.Office}/{uploadedImages.length}</div>
                  <div className="bg-purple-100 p-2 rounded">Party: {counts.Party}/{uploadedImages.length}</div>
                  <div className="bg-yellow-100 p-2 rounded">Vacation: {counts.Vacation}/{uploadedImages.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="my-8">
            <LoadingSpinner message="Generating stylized images... This may take a few minutes." />
          </div>
        )}

        {stylizedImages.length > 0 && (
          <div className="my-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Style Preview</h2>
            <StylePreview
              originalImage={uploadedImage}
              stylizedImages={stylizedImages}
              onDownload={(imageUrl, occasion) => {
                const currentImageId = Object.keys(results).find(
                  id => results[id].originalImage.dataUrl === uploadedImage
                );
                const imageName = currentImageId ? results[currentImageId].originalImage.name : 'image';
                const baseName = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
                downloadImage(imageUrl, `${baseName}-${occasion.toLowerCase()}.jpg`);
              }}
            />
          </div>
        )}

        {completedCount > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <h2 className="text-xl font-semibold mb-3 md:mb-0">Stylized Results</h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCurrentTab('all')}
                  className={`px-3 py-1 rounded ${currentTab === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
                >
                  All ({completedCount})
                </button>
                <button
                  onClick={() => setCurrentTab('office')}
                  className={`px-3 py-1 rounded ${currentTab === 'office' ? 'bg-blue-600 text-white' : 'bg-blue-100'}`}
                >
                  Office ({counts.Office})
                </button>
                <button
                  onClick={() => setCurrentTab('party')}
                  className={`px-3 py-1 rounded ${currentTab === 'party' ? 'bg-purple-600 text-white' : 'bg-purple-100'}`}
                >
                  Party ({counts.Party})
                </button>
                <button
                  onClick={() => setCurrentTab('vacation')}
                  className={`px-3 py-1 rounded ${currentTab === 'vacation' ? 'bg-yellow-600 text-white' : 'bg-yellow-100'}`}
                >
                  Vacation ({counts.Vacation})
                </button>
              </div>
            </div>

            {filteredResults.map((result, index) => (
              <div key={index} className="bg-gray-50 rounded-lg overflow-hidden shadow">
                <div className="p-3 bg-gray-100 border-b">
                  <h3 className="font-medium">{result.occasion} Style</h3>
                  <p className="text-sm text-gray-500">{result.imageName}</p>
                </div>

                <div className="grid grid-cols-2">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-1">Original</p>
                    <img
                      src={result.originalImage}
                      alt="Original outfit"
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-1">Stylized</p>
                    <img
                      src={result.stylizedImage}
                      alt={`${result.occasion} style`}
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium mb-1">Outfit Description:</h4>
                    <button
                      onClick={() => downloadTextFile(result.description, `${result.imageName}-${result.occasion.toLowerCase()}-description.txt`)}
                      className="text-blue-600 text-xs hover:text-blue-800"
                    >
                      Download text
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">{result.description}</p>
                </div>

                <div className="p-3 bg-gray-50 border-t flex gap-2">
                  <button
                    onClick={() => window.open(result.stylizedImage, '_blank')}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    View Full Size
                  </button>
                  <button
                    onClick={() => handleDownload(result.stylizedImage, result.occasion, result.imageName)}
                    className="flex-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Download Image
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">About these styles:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Office Style:</strong> Professional editorial look suitable for workplace environments.</li>
                <li><strong>Party Style:</strong> Glamorous setting with vibrant atmosphere for evening events.</li>
                <li><strong>Vacation Style:</strong> Relaxed luxury feel perfect for holiday and leisure occasions.</li>
              </ul>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Fashion Style Transformer &copy; 2025</p>
        </footer>
      </div>
    </div>
  );
};

export default App;