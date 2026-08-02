import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { projects } from "@/lib/mock-data";
import { ProjectDetail } from "@/components/projects/ProjectDetail";

interface ProjectDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const project = projects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
