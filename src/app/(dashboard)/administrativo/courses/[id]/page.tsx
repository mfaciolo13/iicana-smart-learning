import { CourseDetailPage } from "@/modules/courses/components/CourseDetailPage";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";

export default async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <CourseDetailPage id={id} basePath="/administrativo/courses" enrollmentsBasePath="/administrativo/enrollments" canManage={false} />;
}
