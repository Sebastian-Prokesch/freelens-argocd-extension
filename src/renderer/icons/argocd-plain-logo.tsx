import { Renderer } from "@freelensapp/extensions";
import svgIcon from "./argocd-plain-logo.svg?raw";

const {
  Component: { Icon },
} = Renderer;

export function ArgoPlainLogoIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} svg={svgIcon} />;
}
