import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import styles from "../../pages/argo-api-list.module.scss";

const {
  Component: { Checkbox },
} = Renderer;

export interface ArgoApiCheckboxFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyLabel?: string;
}

export const ArgoApiCheckboxFilter = observer(
  ({ label, options, selected, onChange, emptyLabel = "All" }: ArgoApiCheckboxFilterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isOpen) return;

      const onPointerDown = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [isOpen]);

    const toggleValue = (value: string, checked: boolean) => {
      if (checked) {
        onChange([...selected, value].sort((a, b) => a.localeCompare(b)));
        return;
      }
      onChange(selected.filter((item) => item !== value));
    };

    const summary =
      selected.length === 0 ? emptyLabel : selected.length === 1 ? selected[0] : `${selected.length} selected`;

    return (
      <div className={styles.checkboxFilter} ref={rootRef}>
        <span className={styles.namespaceLabel}>{label}</span>
        <button
          type="button"
          className={styles.checkboxFilterButton}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className={styles.checkboxFilterSummary}>{summary}</span>
          <span className={styles.checkboxFilterCaret} aria-hidden>
            ▾
          </span>
        </button>
        {isOpen ? (
          <div className={styles.checkboxFilterMenu} role="listbox" aria-label={label}>
            <div className={styles.checkboxFilterMenuActions}>
              <button type="button" className={styles.checkboxFilterAction} onClick={() => onChange([])}>
                Clear
              </button>
              <button
                type="button"
                className={styles.checkboxFilterAction}
                onClick={() => onChange([...options])}
                disabled={options.length === 0}
              >
                Select all
              </button>
            </div>
            <div className={styles.checkboxFilterOptions}>
              {options.length === 0 ? (
                <div className={styles.checkboxFilterEmpty}>No values</div>
              ) : (
                options.map((option) => (
                  <Checkbox
                    key={option}
                    label={option}
                    value={selected.includes(option)}
                    onChange={(checked) => toggleValue(option, checked)}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
