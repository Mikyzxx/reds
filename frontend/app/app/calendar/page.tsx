import { CalendarDays } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function CalendarPage() {
  return (
    <ComingSoon
      num="02"
      title="Calendario"
      detail="Vista semanal de actividades del equipo con eventos arrastrables y línea de tiempo en vivo."
      Icon={CalendarDays}
    />
  );
}
