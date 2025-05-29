"use client"

interface ResultGalleryProps {
  images: { url: string; id: string | null }[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onPreview: (index: number) => void
}

export default function ResultGallery({ images, selectedIndex, onSelect, onPreview }: ResultGalleryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {images.map((image, index) => (
        <div
          key={index}
          className={`relative rounded-xl overflow-hidden shadow-md cursor-pointer transition-transform hover:scale-[1.02] ${
            selectedIndex === index ? "ring-4 ring-indigo-500" : ""
          }`}
          onClick={() => { onPreview(index); }}
        >
          {image.url ? (
            <img src={image.url} alt={`Result image ${index + 1}`} className="w-full h-auto" />
          ) : (
            <div className="flex items-center justify-center w-full h-64 bg-gray-100 text-gray-500">
              Generating...
            </div>
          )}
          <div
            className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 ${
              selectedIndex === index ? "bg-indigo-500 border-white" : "bg-white border-gray-300"
            }`}
            onClick={(e) => { e.stopPropagation(); onSelect(index); }}
          >
            {selectedIndex === index && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
