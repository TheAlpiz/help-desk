import { useEmailBuilderStore } from "../store";

export function PropertiesPanel() {
  const { selectedBlockId, blocks, updateBlock, globalStyles, setGlobalStyles } = useEmailBuilderStore();
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  if (!selectedBlock) {
    return (
      <div className="w-80 border-l border-outline-variant bg-surface-container-lowest h-full overflow-y-auto">
        <div className="p-4 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface">Global Styles</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Font Family</label>
            <input
              type="text"
              value={globalStyles.fontFamily}
              onChange={(e) => setGlobalStyles({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={globalStyles.primaryColor}
                onChange={(e) => setGlobalStyles({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={globalStyles.primaryColor}
                onChange={(e) => setGlobalStyles({ primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={globalStyles.textColor}
                onChange={(e) => setGlobalStyles({ textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={globalStyles.textColor}
                onChange={(e) => setGlobalStyles({ textColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={globalStyles.backgroundColor}
                onChange={(e) => setGlobalStyles({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={globalStyles.backgroundColor}
                onChange={(e) => setGlobalStyles({ backgroundColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm uppercase"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleContentChange = (key: string, value: any) => {
    updateBlock(selectedBlock.id, {
      content: { ...selectedBlock.content, [key]: value },
    });
  };

  const handleStyleChange = (key: string, value: any) => {
    updateBlock(selectedBlock.id, {
      styles: { ...selectedBlock.styles, [key]: value },
    });
  };

  return (
    <div className="w-80 border-l border-outline-variant bg-surface-container-lowest h-full overflow-y-auto">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface">Block Settings</h3>
        <p className="text-xs text-on-surface-variant mt-1">{selectedBlock.type} Block</p>
      </div>
      <div className="p-4 space-y-6">
        {/* Type-specific settings */}
        {selectedBlock.type === "TEXT" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Alignment</label>
              <div className="flex bg-surface border border-outline-variant rounded-lg overflow-hidden">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleStyleChange("textAlign", align)}
                    className={`flex-1 py-1.5 text-xs capitalize ${selectedBlock.styles.textAlign === align ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Content</label>
              <textarea
                value={selectedBlock.content.text || ""}
                onChange={(e) => handleContentChange("text", e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm h-32"
              />
            </div>
          </div>
        )}

        {selectedBlock.type === "IMAGE" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Alignment</label>
              <div className="flex bg-surface border border-outline-variant rounded-lg overflow-hidden">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleStyleChange("textAlign", align)}
                    className={`flex-1 py-1.5 text-xs capitalize ${selectedBlock.styles.textAlign === align ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleContentChange("url", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Or Image URL</label>
              <input
                type="text"
                value={selectedBlock.content.url || ""}
                onChange={(e) => handleContentChange("url", e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Alt Text</label>
              <input
                type="text"
                value={selectedBlock.content.alt || ""}
                onChange={(e) => handleContentChange("alt", e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Width (px or %)</label>
              <input
                type="text"
                value={selectedBlock.styles.width || "100%"}
                onChange={(e) => handleStyleChange("width", e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {selectedBlock.type === "SOCIAL_LINKS" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Layout</label>
              <select
                value={selectedBlock.content.layout || "flex-row"}
                onChange={(e) => handleContentChange("layout", e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
              >
                <option value="flex-row">Horizontal (Row)</option>
                <option value="flex-col">Vertical (Column)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Alignment</label>
              <div className="flex bg-surface border border-outline-variant rounded-lg overflow-hidden">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleStyleChange("textAlign", align)}
                    className={`flex-1 py-1.5 text-xs capitalize ${selectedBlock.styles.textAlign === align ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"}`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Links</label>
              {(selectedBlock.content.links || []).map((link: any, index: number) => (
                <div key={index} className="flex gap-2 items-center p-2 bg-surface border border-outline-variant rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Twitter)"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...(selectedBlock.content.links || [])];
                        newLinks[index].label = e.target.value;
                        handleContentChange("links", newLinks);
                      }}
                      className="w-full px-2 py-1 bg-surface-container border border-outline-variant rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...(selectedBlock.content.links || [])];
                        newLinks[index].url = e.target.value;
                        handleContentChange("links", newLinks);
                      }}
                      className="w-full px-2 py-1 bg-surface-container border border-outline-variant rounded text-xs"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newLinks = [...(selectedBlock.content.links || [])];
                      newLinks.splice(index, 1);
                      handleContentChange("links", newLinks);
                    }}
                    className="w-6 h-6 flex items-center justify-center bg-error/10 text-error rounded hover:bg-error/20"
                    title="Remove Link"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newLinks = [...(selectedBlock.content.links || [])];
                  newLinks.push({ label: "New Link", url: "https://" });
                  handleContentChange("links", newLinks);
                }}
                className="w-full px-3 py-1.5 mt-2 bg-surface-container border border-outline-variant text-on-surface-variant rounded-lg text-xs hover:bg-surface-container-high transition-colors"
              >
                + Add Link
              </button>
            </div>
          </div>
        )}

        {/* Universal Styles */}
        <div className="pt-4 border-t border-outline-variant space-y-4">
          <h4 className="text-sm font-semibold text-on-surface">Spacing</h4>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Padding</label>
            <input
              type="text"
              value={selectedBlock.styles.padding || "0px"}
              onChange={(e) => handleStyleChange("padding", e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Margin</label>
            <input
              type="text"
              value={selectedBlock.styles.margin || "0px"}
              onChange={(e) => handleStyleChange("margin", e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
