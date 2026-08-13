import { Code2 } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function IdePage() {
  return (
    <ComingSoon
      num="04"
      title="IDE"
      detail="Editor colaborativo multi-lenguaje (TypeScript, Python, Rust…) con ejecución en sandbox y terminal integrada."
      Icon={Code2}
    />
  );
}
