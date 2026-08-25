/**
 * Projects feature barrel.
 * Project cards/detail, the AI score UI and the mock data module.
 */
export { ProjectCard } from "./components/ProjectCard";
export { ProjectDetail } from "./components/ProjectDetail";
export { AIScoreBadge, getScoreTier } from "./components/AIScoreBadge";
export { ScoreRing } from "./components/ScoreRing";
export { RadarChart } from "./components/RadarChart";
export { GapAnalysisPanel } from "./components/GapAnalysisPanel";
export { RecommendationsList } from "./components/RecommendationsList";
export { RequiredSkillsList } from "./components/RequiredSkillsList";
export { ExportPdfButton } from "./components/ExportPdfButton";
export { AgentReportView } from "./components/AgentReportView";
export { SwotTemplate, ComparisonTemplate, CompetitiveTemplate } from "./components/AgentTemplates";
export {
  ANALYSIS_TYPES,
  startAnalysis,
  fetchProjectArtifacts,
  fetchAgentArtifact,
  fetchAgentPdf,
  mapAgentArtifact,
} from "./lib/aiAgent";
export { projects, sectorOptions, sectorLabels, statusLabels } from "./data/projects";
