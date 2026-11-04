import { getArgoExtension } from "../../extension-ref";

import type React from "react";

export interface ArgoPageLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** `id` of one of this extension's cluster pages. */
  pageId: string;
  /** Values for the page's declared `params`. */
  params?: Record<string, string>;
}

/** Link to one of this extension's own pages, through `extension.navigate(pageId, params)`. */
export function ArgoPageLink({ pageId, params, onClick, children, ...rest }: ArgoPageLinkProps) {
  return (
    <a
      {...rest}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        void getArgoExtension().navigate(pageId, params);
      }}
    >
      {children}
    </a>
  );
}
