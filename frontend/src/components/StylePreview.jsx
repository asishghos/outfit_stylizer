import React from 'react';
import { downloadTextFile } from '../services/apiServices';

const StylePreview = ({ originalImage, stylizedImages, onDownload }) => {
  const occasions = ['Office', 'Party', 'Vacation'];
  
  const handleDownload = (imageUrl, occasion) => {
    if (onDownload) {
      onDownload(imageUrl, occasion);
    } else {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `styled-outfit-${occasion.toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border rounded-lg overflow-hidden shadow-md">
          <div className="bg-gray-50 p-3">
            <h3 className="text-lg font-semibold text-center">Original</h3>
          </div>
          <div className="p-4">
            <img
              src={originalImage}
              alt="Original outfit"
              className="w-full h-64 object-cover rounded"
            />
          </div>
        </div>

        {stylizedImages.map((image, index) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-md">
            <div className="bg-gray-50 p-3">
              <h3 className="text-lg font-semibold text-center">
                {image.occasion} Style
              </h3>
            </div>
            <div className="p-4">
              <img
                src={image.url}
                alt={`${image.occasion} style`}
                className="w-full h-64 object-cover rounded"
              />
            </div>
            <div className="px-4 pb-2">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium mb-1">Outfit Description:</h4>
                <button
                  onClick={() => downloadTextFile(image.description || `${image.occasion} style transformation.`, `outfit-${image.occasion.toLowerCase()}-description.txt`)}
                  className="text-blue-600 text-xs hover:text-blue-800"
                >
                  Download text
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-3 h-20 overflow-y-auto">
                {image.description || `${image.occasion} style transformation.`}
              </p>
              <button
                onClick={() => handleDownload(image.url, image.occasion)}
                className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
              >
                Download Image
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">About these styles:</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Office Style:</strong> Professional editorial look suitable for workplace environments.</li>
          <li><strong>Party Style:</strong> Glamorous setting with vibrant atmosphere for evening events.</li>
          <li><strong>Vacation Style:</strong> Relaxed luxury feel perfect for holiday and leisure occasions.</li>
        </ul>
      </div>
    </div>
  );
};

export default StylePreview;