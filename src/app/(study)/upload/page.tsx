import { CourseUploadView } from "@/components/study/CourseUploadView";

export const metadata = {
  title: "Unterlagen hochladen",
};

export default function UploadPage() {
  return (
    <main className="min-h-screen w-full">
      <CourseUploadView />
    </main>
  );
}
