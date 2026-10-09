import { PROJECTS } from "./projects.ts";
import type { Project, ProjectInput } from "./types.ts";

export type * from "./types.ts";
export { GITHUB_URL, MONOREPO_URL, PORTFOLIO_URL, WORKERS_SUBDOMAIN } from "./projects.ts";

/** Attribue à chaque entrée son numéro (001, 002…) d'après sa position, et le chemin de sa fiche. */
export function defineProjects(list: readonly ProjectInput[]): Project[] {
  return list.map((input, i) => {
    const number = String(i + 1).padStart(3, "0");
    return {
      ...input,
      number,
      path: `/${number}-${input.slug}`,
      year: Number(input.started.slice(0, 4)),
      monitors: input.monitors ?? [],
      badges: input.badges ?? [],
    };
  });
}

export const projects: readonly Project[] = defineProjects(PROJECTS);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
