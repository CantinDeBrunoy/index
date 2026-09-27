import { fetchWithRetry, HttpError, type RetryOptions } from "../http.js";
import type { NotificationMessage, Notifier } from "./notifier.js";

export const NTFY_SERVER = "https://ntfy.sh";

/**
 * Publishes as JSON on the server root (https://docs.ntfy.sh/publish/#publish-as-json):
 * unlike the Title header, the JSON body carries "✈️" and "€" without any encoding trick.
 */
export class NtfyNotifier implements Notifier {
  readonly name = "ntfy";
  // Private field: the topic acts as a password and must never end up in a log.
  readonly #topic: string;
  readonly #server: string;
  readonly #retry: RetryOptions;

  constructor(topic: string, options: { server?: string; retry?: RetryOptions } = {}) {
    this.#topic = topic;
    this.#server = options.server ?? NTFY_SERVER;
    this.#retry = options.retry ?? {};
  }

  async send(message: NotificationMessage): Promise<void> {
    const response = await fetchWithRetry(
      this.#server,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: this.#topic,
          title: message.title,
          message: message.body,
          click: message.url,
          actions: [
            { action: "view", label: "Voir l'offre", url: message.url },
            ...(message.overviewUrl ? [{ action: "view", label: "Tous les bons plans", url: message.overviewUrl }] : []),
          ],
        }),
      },
      this.#retry,
    );
    if (!response.ok) throw new HttpError(response.status, (await response.text()).slice(0, 200));
  }
}
