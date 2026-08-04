import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { projects } from "@/features/projects/data/projects";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";

export default async function ProjectDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const project = projects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
