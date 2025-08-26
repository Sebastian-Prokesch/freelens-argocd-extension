import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoPreferencesStore } from "../../common/store";

const {
  Component: { Checkbox },
} = Renderer;

const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();

export const ArgoPreferenceInput = observer(() => {
  return (
    <Checkbox
      label="Argo checkbox"
      value={preferences.enabled}
      onChange={(v) => {
        console.log(`[ARGO-PREFERENCES-STORE] onChange ${v}`);
        preferences.enabled = v;
      }}
    />
  );
});

export const ArgoPreferenceHint = () => <span>This is an example of an preference for extensions.</span>;
