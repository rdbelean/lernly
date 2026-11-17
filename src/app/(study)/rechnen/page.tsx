import { CalcExerciseView } from "@/components/study/CalcExerciseView";

export const metadata = {
  title: "Rechenaufgaben",
};

export default function RechnenPage() {
  return (
    <main className="min-h-screen w-full">
      <CalcExerciseView />
    </main>
  );
}
