// @ts-check
// Minimal GitHub REST client for the page: read/write a file of the repository and start a
// workflow. Authenticated with a fine-grained token (Contents + Actions write, this repo only).

export class GitHubError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

/** @param {string} text */
export function encodeBase64(text) {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** @param {string} base64 */
export function decodeBase64(base64) {
  const binary = atob(base64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/**
 * @param {{ owner: string, repo: string, token: string, branch?: string, fetch?: typeof globalThis.fetch }} options
 */
export function createGitHub({ owner, repo, token, branch = "main", fetch: fetchImpl = globalThis.fetch.bind(globalThis) }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  /**
   * JSON body of a successful call; errors become a GitHubError with GitHub's message.
   * @param {string} path @param {{ method?: string, body?: unknown }} [init] @returns {Promise<any>}
   */
  async function request(path, init = {}) {
    // "no-store": a poll must never be answered from the browser cache.
    const options = /** @type {RequestInit} */ ({
      method: init.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const response = await fetchImpl(`${base}${path}`, options);
    if (!response.ok) {
      const detail = /** @type {{ message?: unknown }} */ (await response.json().catch(() => ({})));
      throw new GitHubError(response.status, typeof detail.message === "string" ? detail.message : `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    /** @param {string} path @returns {Promise<{ text: string, sha: string }>} */
    async readFile(path) {
      /** @type {{ content: string, sha: string }} */
      const file = await request(`/contents/${path}?ref=${encodeURIComponent(branch)}`);
      return { text: decodeBase64(file.content), sha: file.sha };
    },

    /**
     * Commits the new content; `sha` is the version it replaces (409 if the file moved on).
     * @param {string} path @param {string} text @param {string} sha @param {string} message @returns {Promise<string>}
     */
    async writeFile(path, text, sha, message) {
      /** @type {{ content: { sha: string } }} */
      const commit = await request(`/contents/${path}`, {
        method: "PUT",
        body: { message, content: encodeBase64(text), sha, branch },
      });
      return commit.content.sha;
    },

    /** Starts a run of a workflow that has a workflow_dispatch trigger. @param {string} workflow */
    async runWorkflow(workflow) {
      await request(`/actions/workflows/${workflow}/dispatches`, { method: "POST", body: { ref: branch } });
    },
  };
}
