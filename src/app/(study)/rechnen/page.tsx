import { CalcExerciseView } from "@/components/study/CalcExerciseView";
import { CORPORATE_FINANCE_EXERCISES } from "@/lib/study/seed";

export const metadata = {
  title: "Rechenaufgaben",
};

export default function RechnenPage() {
  return (
    <main className="min-h-screen w-full">
      <CalcExerciseView exercises={CORPORATE_FINANCE_EXERCISES} />
    </main>
  );
}
