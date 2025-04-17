import React from 'react';

const StylePreview = ({ originalImage, stylizedImages, onDownload }) => {
  // Define occasions that correspond to the image order
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
        {/* Original image column */}
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

        {/* Stylized images */}
        {stylizedImages.map((imageUrl, index) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-md">
            <div className="bg-gray-50 p-3">
              <h3 className="text-lg font-semibold text-center">
                {index < occasions.length ? occasions[index] : "Style"} Style
              </h3>
            </div>
            <div className="p-4">
              <img
                src={imageUrl}
                alt={`${index < occasions.length ? occasions[index] : "Style"} style`}
                className="w-full h-64 object-cover rounded"
              />
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => handleDownload(imageUrl, index < occasions.length ? occasions[index] : "Style")}
                className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
              >
                Download
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