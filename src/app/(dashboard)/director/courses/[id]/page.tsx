import { CourseDetailPage } from "@/modules/courses/components/CourseDetailPage";

export default async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetailPage id={id} basePath="/director/courses" enrollmentsBasePath="/director/enrollments" canManage />;
}
