import type { Renderer } from "@freelensapp/extensions";

let argoExtension: Renderer.LensExtension | null = null;

export function setArgoExtension(extension: Renderer.LensExtension) {
  argoExtension = extension;
}

export function getArgoExtension(): Renderer.LensExtension {
  if (!argoExtension) {
    throw new Error("Argo extension is not activated yet.");
  }
  return argoExtension;
}

export function tryGetArgoExtension(): Renderer.LensExtension | null {
  return argoExtension;
}
