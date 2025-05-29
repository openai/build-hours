"use client"

import { useState, useEffect } from "react"
import ImageUploader from "./image-uploader"
import ModifierGrid from "./modifier-grid"
import ResultGallery from "./result-gallery"
import ErrorMessage from "./error-message"

export default function ImageRemixTool() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<{ url: string; id: string | null }[]>([])
  // index of the image selected for download
  const [selectedDownloadIndex, setSelectedDownloadIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // State for image preview modal and which image is previewed
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [modifyPrompt, setModifyPrompt] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  const [modifyError, setModifyError] = useState<string | null>(null)

  // Handle keyboard navigation in preview modal: ESC to close, arrows to navigate previews
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isModalOpen || previewIndex === null) return
      switch (e.key) {
        case "Escape":
          setIsModalOpen(false)
          break
        case "ArrowLeft":
          if (results.length > 0) {
            setPreviewIndex((previewIndex - 1 + results.length) % results.length)
          }
          break
        case "ArrowRight":
          if (results.length > 0) {
            setPreviewIndex((previewIndex + 1) % results.length)
          }
          break
    }
    }
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isModalOpen, previewIndex, results])

  const handleImageUpload = (file: File) => {
    setUploadedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleModifierToggle = (modifier: string) => {
    setSelectedModifiers((prev) => {
      if (prev.includes(modifier)) {
        return prev.filter((m) => m !== modifier)
      } else {
        // Unlimited selections – just add the new modifier.
        return [...prev, modifier]
      }
    })
  }

  const handleGenerate = async () => {
    if (!uploadedImage || selectedModifiers.length === 0) return

    setIsGenerating(true)
    setResults(Array(selectedModifiers.length).fill({ url: '', id: null }))
    setSelectedDownloadIndex(null)
    setError(null)

    console.log('Starting generation for', selectedModifiers.length, 'images')

    try {
      const generationPromises = selectedModifiers.map(async (modifier, index) => {
        const formData = new FormData()
        formData.append("image", uploadedImage)
        formData.append("modifier", modifier)

        const response = await fetch("/api/stream", {
          method: "POST",
          body: formData,
        })

        if (!response.ok || !response.body) {
          const errorData = await response.text()
          throw new Error(errorData || `Failed to generate image for ${modifier}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (!line) continue
            const evt = JSON.parse(line)
            console.log('Raw event for index', index, evt)
            if (evt.type === "partial") {
              setResults((prev) => {
                const arr = [...prev]
                arr[index] = { ...arr[index], url: evt.url }
                return arr
              })
            } else if (evt.type === "final" && evt.id) {
              setResults((prev) => {
                const arr = [...prev]
                arr[index] = { ...arr[index], id: evt.id }
                return arr
              })
            }
          }
        }
      })

      await Promise.allSettled(generationPromises)
    } catch (error) {
      console.error("Error generating images:", error)
      setError(error instanceof Error ? error.message : "Failed to generate images")
    } finally {
      setIsGenerating(false)
    }
  }

  // Preview a thumbnail without selecting for download
  const handlePreview = (index: number) => {
    setPreviewIndex(index)
    setIsModalOpen(true)
    setModifyPrompt('')
    setModifyError(null)
  }

  // Mark an image as selected for download
  const handleSelectForDownload = (index: number) => {
    setSelectedDownloadIndex(index)
  }

  // Process and download the selected image with SVG border applied
  const [isDownloading, setIsDownloading] = useState(false)
  const handleDownload = async () => {
    if (selectedDownloadIndex === null || !results[selectedDownloadIndex]?.url) return
    setIsDownloading(true)
    setError(null)
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: results[selectedDownloadIndex].url,      // original remix
          sideSvgUrl: './OpenAI-black-wordmark.svg',             // your SVG logo/path
          sideWidth: 160,                                      // px – wider vertical bands
          topBottomHeight: 80,                                 // px – slimmer horizontal bands
        }),
      })
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      const data = await response.json()
      if (!data.imageData) {
        throw new Error(data.error || 'No image data returned')
      }
      const link = document.createElement('a')
      link.href = data.imageData
      link.download = `remixed-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleModify = async () => {
    console.log('handleModify')
    console.log('previewIndex', previewIndex)
    console.log('results', results)
    if (previewIndex === null || !results[previewIndex]?.url) return
    console.log('Modifying image', results[previewIndex].url, 'with', modifyPrompt)
    setIsModifying(true)
    setModifyError(null)
    setResults((prev) => {
      const arr = [...prev]
      arr[previewIndex] = { ...arr[previewIndex], url: '' }
      return arr
    })
    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: results[previewIndex].url, prompt: modifyPrompt }),
      })
      if (!response.ok || !response.body) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to modify image')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line) continue
          const evt = JSON.parse(line)
          console.log('Raw modify event', evt)
          if (evt.type === 'partial') {
            setResults((prev) => {
              const arr = [...prev]
              arr[previewIndex] = { ...arr[previewIndex], url: evt.url }
              return arr
            })
          } else if (evt.type === 'final' && evt.id) {
            setResults((prev) => {
              const arr = [...prev]
              arr[previewIndex] = { ...arr[previewIndex], id: evt.id }
              return arr
            })
          }
        }
      }
    } catch (err) {
      console.error('Modify error:', err)
      setModifyError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsModifying(false)
      setModifyPrompt('')
    }
  }

  return (
    <>
      <div className="relative space-y-8">
      {isGenerating && (
        <p className="text-center text-gray-700">Generating images...</p>
      )}
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Upload Your Image</h2>
        <ImageUploader onImageUpload={handleImageUpload} imagePreview={imagePreview} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Choose Modifiers</h2>
        <ModifierGrid selectedModifiers={selectedModifiers} onToggle={handleModifierToggle} />
      </section>

      <section className="sticky bottom-4 flex justify-center py-4 bg-gray-100 z-10">
        <button
          onClick={handleGenerate}
          disabled={!uploadedImage || selectedModifiers.length === 0 || isGenerating}
          className="px-8 py-3 bg-indigo-500 text-white font-medium rounded-lg shadow-md hover:bg-indigo-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          aria-disabled={!uploadedImage || selectedModifiers.length === 0 || isGenerating}
        >
          Generate Remixes
        </button>
      </section>

      {results.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">3. Choose Your Favorite</h2>
          <ResultGallery
            images={results}
            selectedIndex={selectedDownloadIndex}
            onSelect={handleSelectForDownload}
            onPreview={handlePreview}
          />

          {selectedDownloadIndex !== null && (
            <div className="mt-6 flex justify-center">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-6 py-2 bg-gray-800 text-white font-medium rounded-lg shadow-md hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? 'Downloading...' : 'Download Image with Border'}
            </button>
            </div>
        )}
        </section>
      )}
      </div>

      {/* Preview Modal */}
      {isModalOpen && previewIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white p-4 rounded-lg shadow-lg max-w-5xl w-full flex flex-col sm:flex-row gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 text-2xl"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
            {results[previewIndex]?.url ? (
              <img
                src={results[previewIndex].url}
                alt={`Result image ${previewIndex + 1}`}
                className="max-h-[80vh] max-w-full rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-[80vh] bg-gray-100 text-gray-500 rounded-lg">
                Generating...
              </div>
            )}
            <div className="flex flex-col w-full sm:w-80">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Modifications</h3>
              <textarea
                className="flex-1 border rounded p-2 mb-2 text-sm text-gray-900 bg-white placeholder-gray-500"
                value={modifyPrompt}
                onChange={(e) => setModifyPrompt(e.target.value)}
                placeholder="Describe your changes"
              />
              {modifyError && (
                <p className="text-red-500 text-sm mb-2">{modifyError}</p>
              )}
              <button
                onClick={handleModify}
                disabled={isModifying || !modifyPrompt.trim()}
                className="mt-auto px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isModifying ? 'Modifying...' : 'Modify!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
