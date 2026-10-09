import { describe, expect, it } from "vitest";
import { defineProjects, getProject, projects } from "./index.ts";

describe("liste des entrées", () => {
  it("numérote dans l'ordre, sur 3 chiffres", () => {
    expect(projects.map((p) => p.number)).toEqual(projects.map((_, i) => String(i + 1).padStart(3, "0")));
    expect(getProject("magellan")?.path).toBe("/005-magellan");
  });

  it("a des slugs uniques et propres", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("est classée par ordre chronologique : un ajout se fait en fin de liste", () => {
    for (let i = 1; i < projects.length; i++) {
      expect(projects[i]!.started >= projects[i - 1]!.started, projects[i]!.slug).toBe(true);
    }
  });

  it("a un pitch en français d'une seule phrase pour chaque entrée", () => {
    for (const p of projects) {
      expect(p.pitch.fr.trim().length, p.slug).toBeGreaterThan(20);
      expect(p.pitch.fr.match(/[.!?](\s|$)/g)?.length ?? 0, p.slug).toBeLessThanOrEqual(1);
    }
  });

  it("ne surveille que des URLs https", () => {
    for (const p of projects) {
      for (const m of p.monitors) expect(m.url, p.slug).toMatch(/^https:\/\//);
    }
  });

  it("ne surveille pas les archives ni les logiciels de bureau", () => {
    for (const p of projects.filter((p) => p.kind !== "web")) expect(p.monitors, p.slug).toHaveLength(0);
  });

  it("porte au plus une pastille d'IA, sans doublon", () => {
    for (const p of projects) {
      expect(new Set(p.badges).size, p.slug).toBe(p.badges.length);
      expect(p.badges.filter((b) => b.startsWith("ia")).length, p.slug).toBeLessThanOrEqual(1);
    }
    expect(defineProjects([{ ...projects[0]!, badges: undefined }])[0]!.badges).toEqual([]);
  });

  it("attribue le numéro suivant à une nouvelle entrée", () => {
    const next = defineProjects([
      ...projects,
      { slug: "nouveau", name: "Nouveau", started: "2027-01", kind: "web", pitch: { fr: "Un projet de test." }, stack: [], links: {} },
    ]);
    expect(next.at(-1)?.number).toBe(String(projects.length + 1).padStart(3, "0"));
  });
});
