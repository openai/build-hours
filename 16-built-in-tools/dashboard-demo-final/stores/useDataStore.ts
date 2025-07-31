import { create } from "zustand";
// import tableData from "@/data/tableData.json";
// import chartData from "@/data/chartData.json";
// import cardsData from "@/data/cardsData.json";

export interface CardItem {
  title: string;
  value: string;
  description: string;
}

export interface ChartDataPoint {
  date: string;
  value1: number;
  value2?: number;
}

export interface ChartData {
  data: ChartDataPoint[];
  config: {
    title: string;
    value1: {
      label: string;
    };
    value2?: {
      label: string;
    };
  };
}

export interface TableData {
  id: number;
  name: string;
  description: string;
  comments: string;
}

interface DataStore {
  // Card state
  cardItems: CardItem[];
  setCardItems: (items: CardItem[]) => void;
  addCardItem: (item: CardItem) => void;

  // Chart state
  chartData: ChartData;
  setChartData: (data: ChartData) => void;

  // Table state
  tableData: TableData[];
  setTableData: (data: TableData[]) => void;
}

const useDataStore = create<DataStore>((set) => ({
  cardItems: [],
  setCardItems: (items) => set({ cardItems: items }),
  addCardItem: (item) =>
    set((state) => ({ cardItems: [...state.cardItems, item] })),

  // Chart
  chartData: { data: [], config: { title: "", value1: { label: "" } } },
  setChartData: (data) => set({ chartData: data }),

  tableData: [],
  setTableData: (table) => set({ tableData: table }),
}));

export default useDataStore;
