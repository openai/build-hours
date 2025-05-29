"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"

interface ImageUploaderProps {
  onImageUpload: (file: File) => void
  imagePreview: string | null
}

export default function ImageUploader({ onImageUpload, imagePreview }: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onImageUpload(acceptedFiles[0])
      }
    },
    [onImageUpload],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxFiles: 1,
    noClick: !!imagePreview,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
          isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-300"
        } ${imagePreview ? "cursor-default" : "cursor-pointer"}`}
      >
        <input {...getInputProps()} />

        {imagePreview ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-md mx-auto">
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Uploaded preview"
                className="w-full h-auto rounded-lg shadow-md"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  open()
                }}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Replace Image
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <Upload className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-1">Drag & drop your image here</p>
            <p className="text-sm text-gray-500 mb-4">PNG or JPEG, up to 10MB</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                open()
              }}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Browse Files
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
