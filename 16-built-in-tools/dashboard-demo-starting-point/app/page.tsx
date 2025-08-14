import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import Assistant from "@/components/assistant";

export default function Page() {
  return (
    <div className="flex min-h-screen bg-zinc-100">
      <div className="w-1/4 fixed h-screen">
        <Assistant />
      </div>
      <div className="flex flex-1 flex-col bg-white m-4 ml-[25%] rounded-xl shadow-lg">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <DataTable />
          </div>
        </div>
      </div>
    </div>
  );
}
