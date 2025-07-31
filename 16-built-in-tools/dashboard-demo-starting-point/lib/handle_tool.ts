import useDataStore from "@/stores/useDataStore";
import { CardItem, ChartData, TableData } from "@/stores/useDataStore";

export function handleTool(name: string, args: any) {
  const { cardItems, setCardItems, setChartData, setTableData } =
    useDataStore.getState();

  if (name !== "generate_component" || !args) return;

  const { type, component } = args as { type: string; component: any };

  switch (type) {
    case "card": {
      const card = component as CardItem;
      let items = [...cardItems, card];
      if (items.length > 4) {
        items = items.slice(items.length - 4);
      }
      setCardItems(items);
      break;
    }
    case "chart": {
      setChartData(component as ChartData);
      break;
    }
    case "table": {
      const rows = (component?.rows || []) as any[];
      const mapped: TableData[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        comments: r.comments,
      }));
      setTableData(mapped);
      break;
    }
    default:
      break;
  }
}
