import { Renderer } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../../common/store";

const { observer } = global.MobxReact;

const {
  Component: { Checkbox },
} = Renderer;

const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();

export const ArgoPreferenceInput = observer(() => {
  return (
    <Checkbox
      label="Enable Argo extension features"
      value={preferences.enabled}
      onChange={(v) => {
        preferences.enabled = v;
      }}
    />
  );
});

export const ArgoPreferenceHint = () => <span>Controls extension-level Argo features and integration toggles.</span>;
