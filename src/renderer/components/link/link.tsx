import { Renderer } from "@freelensapp/extensions";

/**
 * In-app link for URLs built with `Renderer.Navigation` helpers (for example `getDetailsUrl`).
 *
 * Freelens 2 does not provide `react-router-dom`; `MaybeLink` renders the host router link.
 */
export const Link = Renderer.Component.MaybeLink;
