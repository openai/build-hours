import { Suspense } from "react"
import ImageRemixTool from "@/components/image-remix-tool"
import LoadingOverlay from "@/components/loading-overlay"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6">
          <img
            src="/OpenAI_Frontiers-2025.svg"
            alt="OpenAI Frontiers 2025"
            className="mx-auto block h-[8.45rem]"
          />
        </h1>

        <Suspense fallback={<LoadingOverlay message="Loading application..." />}>
          <ImageRemixTool />
        </Suspense>
      </div>
    </main>
  )
}
