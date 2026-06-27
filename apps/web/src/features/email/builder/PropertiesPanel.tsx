import { useTranslation } from "react-i18next";
import { useEmailBuilderStore } from "../store";

const VARIABLE_NAMES = [
  "ticket_id",
  "ticket_number",
  "ticket_subject",
  "ticket_status",
  "ticket_priority",
  "ticket_url",
  "ticket_created_at",
  "content",
  "ticket_description",
  "latest_message",
  "customer_name",
  "customer_first_name",
  "customer_email",
  "agent_name",
  "agent_email",
  "agent_role",
  "organization_name",
  "organization_email",
  "organization_website",
  "current_date",
  "current_year",
];

export function PropertiesPanel() {
  const { t } = useTranslation("emailTemplates");
  const { selectedBlockId, blocks, updateBlock, globalStyles, setGlobalStyles } =
    useEmailBuilderStore();
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  if (!selectedBlock) {
    return (
      <div className="w-72 border-l border-outline-variant bg-surface-container-lowest h-full overflow-y-auto pretty-scroll">
        <div className="p-4 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface text-sm">{t("builder.props.globalStyles")}</h3>
        </div>
        <div className="p-4 space-y-4">
          <Field label={t("builder.props.fontFamily")}>
            <input
              type="text"
              value={globalStyles.fontFamily}
              onChange={(e) => setGlobalStyles({ fontFamily: e.target.value })}
              className={inputCls}
            />
          </Field>
          <ColorField
            label={t("builder.props.primaryColor")}
            value={globalStyles.primaryColor}
            onChange={(v) => setGlobalStyles({ primaryColor: v })}
          />
          <ColorField
            label={t("builder.props.textColor")}
            value={globalStyles.textColor}
            onChange={(v) => setGlobalStyles({ textColor: v })}
          />
          <ColorField
            label={t("builder.props.background")}
            value={globalStyles.backgroundColor}
            onChange={(v) => setGlobalStyles({ backgroundColor: v })}
          />
        </div>
      </div>
    );
  }

  const set = (key: string, value: any) =>
    updateBlock(selectedBlock.id, {
      content: { ...selectedBlock.content, [key]: value },
    });

  const setStyle = (key: string, value: any) =>
    updateBlock(selectedBlock.id, {
      styles: { ...selectedBlock.styles, [key]: value },
    });

  return (
    <div className="w-72 border-l border-outline-variant bg-surface-container-lowest h-full overflow-y-auto pretty-scroll">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface text-sm">{t("builder.props.blockSettings")}</h3>
        <p className="text-xs text-on-surface-variant mt-0.5 capitalize">
          {selectedBlock.type.replace(/_/g, " ").toLowerCase()}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* ── TEXT ─────────────────────────────────── */}
        {selectedBlock.type === "TEXT" && (
          <>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.contentHtml")}>
              <textarea
                value={selectedBlock.content.text ?? ""}
                onChange={(e) => set("text", e.target.value)}
                className={`${inputCls} h-32 resize-y`}
              />
            </Field>
            <Field label={t("builder.props.fontSize")}>
              <input type="text" value={selectedBlock.styles.fontSize ?? "14px"} onChange={(e) => setStyle("fontSize", e.target.value)} className={inputCls} />
            </Field>
            <ColorField label={t("builder.props.color")} value={selectedBlock.styles.color ?? globalStyles.textColor} onChange={(v) => setStyle("color", v)} />
          </>
        )}

        {/* ── HEADING ──────────────────────────────── */}
        {selectedBlock.type === "HEADING" && (
          <>
            <Field label={t("builder.props.level")}>
              <select value={selectedBlock.content.level ?? "h2"} onChange={(e) => set("level", e.target.value)} className={inputCls}>
                <option value="h1">{t("builder.props.headingLarge")}</option>
                <option value="h2">{t("builder.props.headingMedium")}</option>
                <option value="h3">{t("builder.props.headingSmall")}</option>
              </select>
            </Field>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.text")}>
              <input type="text" value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={inputCls} />
            </Field>
            <ColorField label={t("builder.props.color")} value={selectedBlock.content.color ?? globalStyles.textColor} onChange={(v) => set("color", v)} />
          </>
        )}

        {/* ── IMAGE ────────────────────────────────── */}
        {selectedBlock.type === "IMAGE" && (
          <>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.imageUrl")}>
              <input type="text" value={selectedBlock.content.url ?? ""} onChange={(e) => set("url", e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
            <Field label={t("builder.props.altText")}>
              <input type="text" value={selectedBlock.content.alt ?? ""} onChange={(e) => set("alt", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("builder.props.width")}>
              <input type="text" value={selectedBlock.styles.width ?? "100%"} onChange={(e) => setStyle("width", e.target.value)} className={inputCls} />
            </Field>
          </>
        )}

        {/* ── DIVIDER ──────────────────────────────── */}
        {selectedBlock.type === "DIVIDER" && (
          <>
            <Field label={t("builder.props.thickness")}>
              <input type="number" min={1} max={8} value={selectedBlock.styles.thickness ?? 1} onChange={(e) => setStyle("thickness", parseInt(e.target.value))} className={inputCls} />
            </Field>
            <ColorField label={t("builder.props.color")} value={selectedBlock.styles.color ?? "#e5e7eb"} onChange={(v) => setStyle("color", v)} />
          </>
        )}

        {/* ── BUTTON ───────────────────────────────── */}
        {selectedBlock.type === "BUTTON" && (
          <>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.label")}>
              <input type="text" value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("builder.props.url")}>
              <input type="text" value={selectedBlock.content.url ?? ""} onChange={(e) => set("url", e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
            <ColorField label={t("builder.props.background")} value={selectedBlock.content.backgroundColor || globalStyles.primaryColor} onChange={(v) => set("backgroundColor", v)} />
            <ColorField label={t("builder.props.textColor")} value={selectedBlock.content.color ?? "#ffffff"} onChange={(v) => set("color", v)} />
            <Field label={t("builder.props.borderRadius")}>
              <input type="number" min={0} max={50} value={selectedBlock.styles.borderRadius ?? 6} onChange={(e) => setStyle("borderRadius", parseInt(e.target.value))} className={inputCls} />
            </Field>
          </>
        )}

        {/* ── SOCIAL_LINKS ─────────────────────────── */}
        {selectedBlock.type === "SOCIAL_LINKS" && (
          <>
            <Field label={t("builder.props.layout")}>
              <select value={selectedBlock.content.layout ?? "flex-row"} onChange={(e) => set("layout", e.target.value)} className={inputCls}>
                <option value="flex-row">{t("builder.props.horizontal")}</option>
                <option value="flex-col">{t("builder.props.vertical")}</option>
              </select>
            </Field>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant">{t("builder.props.links")}</label>
              {(selectedBlock.content.links ?? []).map((link: any, i: number) => (
                <div key={i} className="flex gap-2 items-start p-2 bg-surface border border-outline-variant rounded-lg">
                  <div className="flex-1 space-y-1.5">
                    <input type="text" placeholder={t("builder.props.label")} value={link.label} onChange={(e) => { const links = [...(selectedBlock.content.links ?? [])]; links[i] = { ...links[i], label: e.target.value }; set("links", links); }} className="w-full px-2 py-1 bg-surface-container border border-outline-variant rounded text-xs" />
                    <input type="text" placeholder={t("builder.props.url")} value={link.url} onChange={(e) => { const links = [...(selectedBlock.content.links ?? [])]; links[i] = { ...links[i], url: e.target.value }; set("links", links); }} className="w-full px-2 py-1 bg-surface-container border border-outline-variant rounded text-xs" />
                  </div>
                  <button onClick={() => { const links = [...(selectedBlock.content.links ?? [])]; links.splice(i, 1); set("links", links); }} className="w-6 h-6 flex items-center justify-center bg-error/10 text-error rounded hover:bg-error/20 shrink-0 mt-0.5">×</button>
                </div>
              ))}
              <button onClick={() => { const links = [...(selectedBlock.content.links ?? [])]; links.push({ label: "Link", url: "https://" }); set("links", links); }} className={addBtnCls}>{t("builder.props.addLink")}</button>
            </div>
          </>
        )}

        {/* ── VARIABLE ─────────────────────────────── */}
        {selectedBlock.type === "VARIABLE" && (
          <Field label={t("builder.props.variable")}>
            <select value={selectedBlock.content.variableName ?? "ticket_id"} onChange={(e) => set("variableName", e.target.value)} className={`${inputCls} font-mono`}>
              {VARIABLE_NAMES.map((v) => (
                <option key={v} value={v}>{`{{${v}}}`}</option>
              ))}
            </select>
          </Field>
        )}

        {/* ── SPACER ───────────────────────────────── */}
        {selectedBlock.type === "SPACER" && (
          <Field label={t("builder.props.height")}>
            <input type="text" value={selectedBlock.content.height ?? "20px"} onChange={(e) => set("height", e.target.value)} className={inputCls} placeholder={t("builder.props.heightHint")} />
          </Field>
        )}

        {/* ── LINK ─────────────────────────────────── */}
        {selectedBlock.type === "LINK" && (
          <>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.linkText")}>
              <input type="text" value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("builder.props.url")}>
              <input type="text" value={selectedBlock.content.url ?? ""} onChange={(e) => set("url", e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
            <ColorField label={t("builder.props.linkColor")} value={selectedBlock.content.color || globalStyles.primaryColor} onChange={(v) => set("color", v)} />
            <Field label={t("builder.props.fontSize")}>
              <input type="text" value={selectedBlock.styles.fontSize ?? "14px"} onChange={(e) => setStyle("fontSize", e.target.value)} className={inputCls} />
            </Field>
          </>
        )}

        {/* ── FEEDBACK ─────────────────────────────── */}
        {selectedBlock.type === "FEEDBACK" && (
          <>
            <AlignField value={selectedBlock.styles.textAlign} onChange={(v) => setStyle("textAlign", v)} />
            <Field label={t("builder.props.question")}>
              <input type="text" value={selectedBlock.content.question ?? ""} onChange={(e) => set("question", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("builder.props.widgetType")}>
              <select value={selectedBlock.content.type ?? "stars"} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                <option value="stars">{t("builder.props.widgetStars")}</option>
                <option value="thumbs">{t("builder.props.widgetThumbs")}</option>
                <option value="emoji">{t("builder.props.widgetEmoji")}</option>
              </select>
            </Field>
            {selectedBlock.content.type === "stars" && (
              <Field label={t("builder.props.starCount")}>
                <input type="number" min={3} max={10} value={selectedBlock.content.scale ?? 5} onChange={(e) => set("scale", parseInt(e.target.value))} className={inputCls} />
              </Field>
            )}
            <Field label={t("builder.props.feedbackBaseUrl")}>
              <input type="text" value={selectedBlock.content.baseUrl ?? ""} onChange={(e) => set("baseUrl", e.target.value)} className={inputCls} placeholder="https://..." />
              <p className="text-xs text-on-surface-variant mt-1">{t("builder.props.feedbackHint")}</p>
            </Field>
          </>
        )}

        {/* ── COLUMNS ──────────────────────────────── */}
        {selectedBlock.type === "COLUMNS" && (
          <>
            <Field label={t("builder.props.columnRatio")}>
              <select value={selectedBlock.content.ratio ?? "50:50"} onChange={(e) => set("ratio", e.target.value)} className={inputCls}>
                <option value="50:50">50 / 50</option>
                <option value="60:40">60 / 40</option>
                <option value="40:60">40 / 60</option>
                <option value="70:30">70 / 30</option>
                <option value="30:70">30 / 70</option>
              </select>
            </Field>
            <Field label={t("builder.props.gap")}>
              <input type="text" value={selectedBlock.content.gap ?? "16px"} onChange={(e) => set("gap", e.target.value)} className={inputCls} placeholder="16px" />
            </Field>
            <Field label={t("builder.props.leftColumnHtml")}>
              <textarea value={selectedBlock.content.col1 ?? ""} onChange={(e) => set("col1", e.target.value)} className={`${inputCls} h-24 resize-y`} />
            </Field>
            <Field label={t("builder.props.rightColumnHtml")}>
              <textarea value={selectedBlock.content.col2 ?? ""} onChange={(e) => set("col2", e.target.value)} className={`${inputCls} h-24 resize-y`} />
            </Field>
          </>
        )}

        {/* ── SECTION ──────────────────────────────── */}
        {selectedBlock.type === "SECTION" && (
          <>
            <Field label={t("builder.props.contentHtml")}>
              <textarea value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={`${inputCls} h-28 resize-y`} />
            </Field>
            <ColorField label={t("builder.props.background")} value={selectedBlock.content.backgroundColor ?? "#f9fafb"} onChange={(v) => set("backgroundColor", v)} />
            <ColorField label={t("builder.props.borderColor")} value={selectedBlock.content.borderColor ?? "#e5e7eb"} onChange={(v) => set("borderColor", v)} />
            <Field label={t("builder.props.borderWidth")}>
              <input type="number" min={0} max={8} value={selectedBlock.content.borderWidth ?? 1} onChange={(e) => set("borderWidth", parseInt(e.target.value))} className={inputCls} />
            </Field>
            <Field label={t("builder.props.borderRadius")}>
              <input type="number" min={0} max={32} value={selectedBlock.content.borderRadius ?? 8} onChange={(e) => set("borderRadius", parseInt(e.target.value))} className={inputCls} />
            </Field>
            <Field label={t("builder.props.innerPadding")}>
              <input type="text" value={selectedBlock.content.padding ?? "24px"} onChange={(e) => set("padding", e.target.value)} className={inputCls} placeholder="24px" />
            </Field>
          </>
        )}

        {/* ── CALLOUT ──────────────────────────────── */}
        {selectedBlock.type === "CALLOUT" && (
          <>
            <Field label={t("builder.props.iconEmoji")}>
              <input type="text" value={selectedBlock.content.icon ?? "💡"} onChange={(e) => set("icon", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("builder.props.text")}>
              <textarea value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={`${inputCls} h-24 resize-y`} />
            </Field>
            <ColorField label={t("builder.props.background")} value={selectedBlock.content.backgroundColor ?? "#eff6ff"} onChange={(v) => set("backgroundColor", v)} />
            <ColorField label={t("builder.props.textColor")} value={selectedBlock.content.textColor ?? "#1e40af"} onChange={(v) => set("textColor", v)} />
            <ColorField label={t("builder.props.borderColor")} value={selectedBlock.content.borderColor ?? "#bfdbfe"} onChange={(v) => set("borderColor", v)} />
            <Field label={t("builder.props.borderRadius")}>
              <input type="number" min={0} max={32} value={selectedBlock.content.borderRadius ?? 8} onChange={(e) => set("borderRadius", parseInt(e.target.value))} className={inputCls} />
            </Field>
          </>
        )}

        {/* ── QUOTE ────────────────────────────────── */}
        {selectedBlock.type === "QUOTE" && (
          <>
            <Field label={t("builder.props.quoteText")}>
              <textarea value={selectedBlock.content.text ?? ""} onChange={(e) => set("text", e.target.value)} className={`${inputCls} h-24 resize-y`} />
            </Field>
            <Field label={t("builder.props.attribution")}>
              <input type="text" value={selectedBlock.content.attribution ?? ""} onChange={(e) => set("attribution", e.target.value)} className={inputCls} placeholder={t("builder.props.attributionPlaceholder")} />
            </Field>
            <ColorField label={t("builder.props.borderColor")} value={selectedBlock.content.borderColor || globalStyles.primaryColor} onChange={(v) => set("borderColor", v)} />
          </>
        )}

        {/* ── LIST ─────────────────────────────────── */}
        {selectedBlock.type === "LIST" && (
          <>
            <Field label={t("builder.props.listType")}>
              <div className="flex bg-surface border border-outline-variant rounded-lg overflow-hidden">
                <button onClick={() => set("ordered", false)} className={`flex-1 py-1.5 text-xs ${!selectedBlock.content.ordered ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}>{t("builder.props.unordered")}</button>
                <button onClick={() => set("ordered", true)} className={`flex-1 py-1.5 text-xs ${selectedBlock.content.ordered ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}>{t("builder.props.ordered")}</button>
              </div>
            </Field>
            <Field label={t("builder.props.fontSize")}>
              <input type="text" value={selectedBlock.styles.fontSize ?? "14px"} onChange={(e) => setStyle("fontSize", e.target.value)} className={inputCls} />
            </Field>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant">{t("builder.props.items")}</label>
              {(selectedBlock.content.items ?? []).map((item: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const items = [...(selectedBlock.content.items ?? [])];
                      items[i] = e.target.value;
                      set("items", items);
                    }}
                    className="flex-1 px-2 py-1.5 bg-surface border border-outline-variant rounded text-xs"
                  />
                  <button
                    onClick={() => {
                      const items = [...(selectedBlock.content.items ?? [])];
                      items.splice(i, 1);
                      set("items", items);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-error hover:bg-error/10 rounded shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => { const items = [...(selectedBlock.content.items ?? [])]; items.push(t("builder.props.newItem")); set("items", items); }} className={addBtnCls}>{t("builder.props.addItem")}</button>
            </div>
          </>
        )}

        {/* ── HTML ─────────────────────────────────── */}
        {selectedBlock.type === "HTML" && (
          <Field label={t("builder.props.rawHtml")}>
            <textarea value={selectedBlock.content.html ?? ""} onChange={(e) => set("html", e.target.value)} className={`${inputCls} h-48 resize-y font-mono text-xs`} placeholder="<!-- your HTML -->" />
            <p className="text-xs text-on-surface-variant mt-1">{t("builder.props.rawHtmlHint")}</p>
          </Field>
        )}

        {/* ── Universal spacing ─────────────────────── */}
        <div className="pt-4 border-t border-outline-variant space-y-4">
          <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t("builder.props.spacing")}</h4>
          <Field label={t("builder.props.padding")}>
            <input type="text" value={selectedBlock.styles.padding ?? "8px 0"} onChange={(e) => setStyle("padding", e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("builder.props.margin")}>
            <input type="text" value={selectedBlock.styles.margin ?? "0"} onChange={(e) => setStyle("margin", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors";
const addBtnCls = "w-full px-3 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-lg text-xs hover:bg-surface-container-high transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-variant mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input type="color" value={value.startsWith("#") ? value : "#2563eb"} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-outline-variant p-0.5 bg-surface" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm uppercase font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40`} />
      </div>
    </Field>
  );
}

function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation("emailTemplates");
  return (
    <Field label={t("builder.props.alignment")}>
      <div className="flex bg-surface border border-outline-variant rounded-lg overflow-hidden">
        {["left", "center", "right"].map((a) => (
          <button key={a} onClick={() => onChange(a)} className={`flex-1 py-1.5 text-xs ${value === a ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}>
            {t(`builder.props.${a}`)}
          </button>
        ))}
      </div>
    </Field>
  );
}
