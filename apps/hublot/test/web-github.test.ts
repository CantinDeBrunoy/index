import { describe, expect, it } from "vitest";
import { createGitHub, decodeBase64, encodeBase64, GitHubError } from "../docs/github.js";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** fetch mock: records the calls and answers with the given responses in turn. */
function mockFetch(...responses: Response[]) {
  const calls: Call[] = [];
  const fetch = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(url),
      method: init.method ?? "GET",
      headers: init.headers as Record<string, string>,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return responses[calls.length - 1] ?? new Response(null, { status: 500 });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const repo = { owner: "CantinDeBrunoy", repo: "Hublot", token: "github_pat_test" };

describe("client GitHub de la page", () => {
  it("encode et décode l'UTF-8 en base64", () => {
    expect(decodeBase64(encodeBase64('{"label":"Séoul ✈️"}'))).toBe('{"label":"Séoul ✈️"}');
    expect(decodeBase64("eyJhIjoxfQ==\n")).toBe('{"a":1}');
  });

  it("lit un fichier du dépôt avec sa version (sha)", async () => {
    const { fetch, calls } = mockFetch(Response.json({ content: encodeBase64('{"watches":[]}'), sha: "abc" }));
    const file = await createGitHub({ ...repo, fetch }).readFile("config.json");

    expect(file).toEqual({ text: '{"watches":[]}', sha: "abc" });
    expect(calls[0]?.url).toBe("https://api.github.com/repos/CantinDeBrunoy/Hublot/contents/config.json?ref=main");
    expect(calls[0]?.headers.Authorization).toBe("Bearer github_pat_test");
  });

  it("commite le nouveau contenu en précisant la version remplacée", async () => {
    const { fetch, calls } = mockFetch(Response.json({ content: { sha: "def" } }));
    const sha = await createGitHub({ ...repo, fetch }).writeFile("config.json", "{}\n", "abc", "config: test");

    expect(sha).toBe("def");
    expect(calls[0]).toMatchObject({
      url: "https://api.github.com/repos/CantinDeBrunoy/Hublot/contents/config.json",
      method: "PUT",
      body: { message: "config: test", content: encodeBase64("{}\n"), sha: "abc", branch: "main" },
    });
  });

  it("lance la vérification des prix sur main", async () => {
    const { fetch, calls } = mockFetch(new Response(null, { status: 204 }));
    await createGitHub({ ...repo, fetch }).runWorkflow("check.yml");

    expect(calls[0]).toMatchObject({
      url: "https://api.github.com/repos/CantinDeBrunoy/Hublot/actions/workflows/check.yml/dispatches",
      method: "POST",
      body: { ref: "main" },
    });
  });

  it("remonte le statut HTTP et le message de GitHub", async () => {
    const { fetch } = mockFetch(Response.json({ message: "Bad credentials" }, { status: 401 }));
    const failure = createGitHub({ ...repo, fetch }).readFile("config.json");

    await expect(failure).rejects.toBeInstanceOf(GitHubError);
    await expect(failure).rejects.toMatchObject({ status: 401, message: "Bad credentials" });
  });
});
