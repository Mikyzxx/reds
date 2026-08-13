import { SquareKanban } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function PlannerPage() {
  return (
    <ComingSoon
      num="01"
      title="Planner"
      detail="Tablero kanban de sprints con columnas Backlog, En curso, Revisión y Hecho."
      Icon={SquareKanban}
    />
  );
}
