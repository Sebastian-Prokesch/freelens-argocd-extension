import { Renderer } from "@freelensapp/extensions";

import type React from "react";

export function createKubeObjectDetailRegistration<TProps extends { extension: Renderer.LensExtension }>({
  kind,
  apiVersions,
  extension,
  Details,
  priority = 10,
}: {
  kind: string;
  apiVersions: string[];
  extension: Renderer.LensExtension;
  Details: (props: TProps) => React.JSX.Element | null;
  priority?: number;
}) {
  type PropsWithoutExtension = Omit<TProps, "extension">;

  return {
    kind,
    apiVersions,
    priority,
    components: {
      Details: (props: PropsWithoutExtension) => <Details {...({ ...props, extension } as unknown as TProps)} />,
    },
  };
}

export function createKubeObjectMenuRegistration<TProps extends { extension: Renderer.LensExtension }>({
  kind,
  apiVersions,
  extension,
  MenuItem,
}: {
  kind: string;
  apiVersions: string[];
  extension: Renderer.LensExtension;
  MenuItem: (props: TProps) => React.JSX.Element | null;
}) {
  type PropsWithoutExtension = Omit<TProps, "extension">;

  return {
    kind,
    apiVersions,
    components: {
      MenuItem: (props: PropsWithoutExtension) => <MenuItem {...({ ...props, extension } as unknown as TProps)} />,
    },
  };
}
