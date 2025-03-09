import { useState, useRef, useEffect } from "react";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { SqlInputPanel } from "./components/SqlInputPanel";
import { compressData, decompressData } from "./utils/urlShortener";
import { diagramToShareCode, shareCodeToDiagram } from "./utils/shareCode";
import "./App.css";

function App() {
    const [sqlInput, setSqlInput] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(380); // Increased initial width from 280px to 380px
    const [isResizing, setIsResizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showImportCodeModal, setShowImportCodeModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [shareCode, setShareCode] = useState("");
    const [activeShareTab, setActiveShareTab] = useState<"url" | "code">("url");
    const [copySuccess, setCopySuccess] = useState(false);
    const [importCode, setImportCode] = useState("");
    const [importError, setImportError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingSource, setLoadingSource] = useState<
        "hash" | "file" | "code" | null
    >(null);
    const shareUrlInputRef = useRef<HTMLInputElement>(null);
    const diagramCanvasRef = useRef<any>(null);
    const appMainRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const shareCodeRef = useRef<HTMLTextAreaElement>(null);

    // Check URL hash on initial load
    useEffect(() => {
        if (window.location.hash && window.location.hash.length > 1) {
            try {
                // Remove the leading # and decode the data
                const hashData = window.location.hash.substring(1);
                const jsonData = decompressData(hashData);

                // Set loading state
                setIsLoading(true);
                setLoadingSource("hash");

                // Once DOM is ready, import the data
                setTimeout(() => {
                    if (
                        diagramCanvasRef.current &&
                        diagramCanvasRef.current.handleImportFromJson
                    ) {
                        const success =
                            diagramCanvasRef.current.handleImportFromJson(
                                jsonData
                            );
                        if (success && jsonData.sqlInput) {
                            setSqlInput(jsonData.sqlInput);
                        }
                        // Clear loading state
                        setIsLoading(false);
                        setLoadingSource(null);
                    }
                }, 100);
            } catch (error) {
                console.error("Error loading diagram from URL:", error);
                // Show a more helpful error message
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "The shared diagram data is invalid or corrupted.";
                alert(`Error loading diagram: ${errorMessage}`);
                // Clear loading state
                setIsLoading(false);
                setLoadingSource(null);
            }
        }
    }, []);

    const handleTablesGenerated = (tables: any[]) => {
        if (
            diagramCanvasRef.current &&
            diagramCanvasRef.current.handleGenerateFromSql
        ) {
            diagramCanvasRef.current.handleGenerateFromSql(tables);
        }
    };

    // Handle mouse down on resizer
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    // Handle mouse move for resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !appMainRef.current) return;

            // Calculate position relative to the app-main element
            const appMainRect = appMainRef.current.getBoundingClientRect();
            const newWidth = Math.max(
                280,
                Math.min(800, e.clientX - appMainRect.left)
            );

            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.classList.remove("resizing");
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.classList.add("resizing");
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    // Store sidebar width in localStorage to persist between sessions
    useEffect(() => {
        const storedWidth = localStorage.getItem("sidebarWidth");
        if (storedWidth) {
            const width = parseInt(storedWidth, 10);
            // Make sure the stored width is within the new constraints
            if (width >= 280 && width <= 800) {
                setSidebarWidth(width);
            }
        }
    }, []);

    useEffect(() => {
        if (sidebarWidth >= 280 && sidebarWidth <= 800) {
            localStorage.setItem("sidebarWidth", sidebarWidth.toString());
        }
    }, [sidebarWidth]);

    // Handle export menu clicks outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                showExportMenu &&
                exportMenuRef.current &&
                !exportMenuRef.current.contains(e.target as Node)
            ) {
                setShowExportMenu(false);
            }

            if (
                showShareModal &&
                shareUrlInputRef.current &&
                !shareUrlInputRef.current
                    .closest(".share-modal-container")
                    ?.contains(e.target as Node)
            ) {
                setShowShareModal(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showExportMenu, showShareModal]);

    const toggleExportMenu = () => {
        setShowExportMenu((prev) => !prev);
    };

    // Prepare data for sharing
    const prepareExportData = () => {
        if (
            !diagramCanvasRef.current ||
            !diagramCanvasRef.current.getExportData
        ) {
            console.error("Export data method not available");
            return null;
        }

        // Get diagram data and add SQL input to it
        const diagramData = diagramCanvasRef.current.getExportData();
        const data = {
            ...diagramData,
            sqlInput, // Include the SQL input in the export data
        };

        return data;
    };

    // Open share modal with tabs
    const openShareModal = () => {
        const data = prepareExportData();
        if (!data) return;

        // Generate URL
        const compressedData = compressData(data);
        const url = `${window.location.origin}${window.location.pathname}#${compressedData}`;
        setShareUrl(url);

        // Generate code
        const code = diagramToShareCode(data);
        setShareCode(code);

        // Show modal
        setShowShareModal(true);
        setActiveShareTab("url"); // Default to URL tab

        // Focus appropriate field based on active tab
        setTimeout(() => {
            if (activeShareTab === "url" && shareUrlInputRef.current) {
                shareUrlInputRef.current.select();
            } else if (activeShareTab === "code" && shareCodeRef.current) {
                shareCodeRef.current.select();
            }
        }, 100);
    };

    // Copy either URL or code to clipboard
    const copyToClipboard = () => {
        if (activeShareTab === "url" && shareUrlInputRef.current) {
            shareUrlInputRef.current.select();
            document.execCommand("copy");
        } else if (activeShareTab === "code" && shareCodeRef.current) {
            shareCodeRef.current.select();
            document.execCommand("copy");
        }

        // Show success state
        setCopySuccess(true);
        setTimeout(() => {
            setCopySuccess(false);
        }, 2000);
    };

    const exportAsImage = (format: "png" | "jpeg") => {
        if (!diagramCanvasRef.current) return;

        const canvasElement = document.querySelector(
            ".diagram-canvas"
        ) as HTMLElement;
        if (!canvasElement) return;

        // Use html2canvas to capture the diagram
        import("html2canvas").then(({ default: html2canvas }) => {
            // Using 'as any' to bypass TypeScript errors due to type definition mismatch
            const options = {
                backgroundColor: "#f5f5f5",
                scale: 2, // Better quality
                logging: false,
                allowTaint: true,
                useCORS: true,
            } as any;

            html2canvas(canvasElement, options).then(
                (canvas: HTMLCanvasElement) => {
                    // Create download link
                    const link = document.createElement("a");
                    link.download = `er-diagram.${format}`;
                    link.href = canvas.toDataURL(`image/${format}`);
                    link.click();
                }
            );
        });

        setShowExportMenu(false);
    };

    const exportAsSVG = () => {
        if (!diagramCanvasRef.current) return;

        // Get the diagram element
        const canvasElement = document.querySelector(
            ".diagram-canvas"
        ) as HTMLElement;
        if (!canvasElement) return;

        // Use DOM to SVG library
        import("dom-to-svg").then((domToSVG) => {
            const svg = domToSVG.elementToSVG(canvasElement);
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svg);

            // Create a Blob with the SVG content
            const blob = new Blob([svgString], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement("a");
            link.download = "er-diagram.svg";
            link.href = url;
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
        });

        setShowExportMenu(false);
    };

    const exportAsJSON = () => {
        if (
            !diagramCanvasRef.current ||
            !diagramCanvasRef.current.getExportData
        ) {
            // If getExportData doesn't exist yet, we'll create it in the DiagramCanvas component
            console.error("Export data method not available");
            return;
        }

        // Get diagram data and add SQL input to it
        const diagramData = diagramCanvasRef.current.getExportData();
        const exportData = {
            ...diagramData,
            sqlInput, // Include the SQL input in the export data
        };

        const jsonStr = JSON.stringify(exportData, null, 2);

        // Create a Blob with the JSON content
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement("a");
        link.download = "er-diagram-schema.json";
        link.href = url;
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === "application/json") {
                // Set loading state
                setIsLoading(true);
                setLoadingSource("file");

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target && event.target.result) {
                        try {
                            const jsonData = JSON.parse(
                                event.target.result as string
                            );

                            if (
                                diagramCanvasRef.current &&
                                diagramCanvasRef.current.handleImportFromJson
                            ) {
                                // Import diagram data
                                const success =
                                    diagramCanvasRef.current.handleImportFromJson(
                                        jsonData
                                    );

                                if (success) {
                                    // Set the SQL input if it exists in the imported data
                                    if (jsonData.sqlInput) {
                                        setSqlInput(jsonData.sqlInput);
                                    }

                                    // Removed success alert
                                }
                            }
                        } catch (error) {
                            console.error("Error parsing JSON:", error);
                            alert(
                                `Error importing diagram: ${
                                    error instanceof Error
                                        ? error.message
                                        : "Invalid JSON format"
                                }`
                            );
                        } finally {
                            // Clear loading state
                            setIsLoading(false);
                            setLoadingSource(null);
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                alert("Please select a JSON file");
            }
        }

        // Reset the file input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Show import code modal
    const showImportCodeDialog = () => {
        setImportCode("");
        setImportError("");
        setShowImportCodeModal(true);
    };

    // Import diagram from code
    const importFromCode = () => {
        if (!importCode.trim()) {
            setImportError("Please enter a share code");
            return;
        }

        try {
            // Set loading state
            setIsLoading(true);
            setLoadingSource("code");

            const importedData = shareCodeToDiagram(importCode);

            if (
                diagramCanvasRef.current &&
                diagramCanvasRef.current.handleImportFromJson
            ) {
                const success =
                    diagramCanvasRef.current.handleImportFromJson(importedData);

                if (success && importedData.sqlInput) {
                    setSqlInput(importedData.sqlInput);
                    setShowImportCodeModal(false);
                } else {
                    setImportError("Failed to import diagram");
                }
            }
        } catch (error) {
            console.error("Error importing from code:", error);
            setImportError("Invalid share code format");
        } finally {
            // Clear loading state
            setIsLoading(false);
            setLoadingSource(null);
        }
    };

    return (
        <div className="er-diagram-app">
            <header className="app-header">
                <h1>ER Diagram Generator</h1>
                <div className="toolbar">
                    <button onClick={handleImportClick} title="Import Diagram">
                        <i className="fas fa-download"></i>
                    </button>
                    <div className="export-container" ref={exportMenuRef}>
                        <button
                            onClick={toggleExportMenu}
                            title="Export Diagram"
                        >
                            <i className="fas fa-upload"></i>
                        </button>
                        {showExportMenu && (
                            <div className="export-menu">
                                <button onClick={() => exportAsImage("png")}>
                                    Export as PNG
                                </button>
                                <button onClick={() => exportAsImage("jpeg")}>
                                    Export as JPEG
                                </button>
                                <button onClick={exportAsSVG}>
                                    Export as SVG
                                </button>
                                <button onClick={exportAsJSON}>
                                    Export as JSON
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={openShareModal} title="Share Diagram">
                        <i className="fas fa-share"></i>
                    </button>
                    <button
                        onClick={showImportCodeDialog}
                        title="Import From Code"
                    >
                        <i className="fas fa-paste"></i>
                    </button>
                    <input
                        type="file"
                        id="import-json-input"
                        accept=".json"
                        style={{ display: "none" }}
                        onChange={handleFileImport}
                        ref={fileInputRef}
                    />
                </div>
            </header>

            <main ref={appMainRef} className="app-main">
                <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
                    <SqlInputPanel
                        sqlInput={sqlInput}
                        onSqlInputChange={setSqlInput}
                        onTablesGenerated={handleTablesGenerated}
                    />
                </div>

                {/* Resizer handle */}
                <div
                    className="sidebar-resizer"
                    onMouseDown={handleMouseDown}
                    title="Drag to resize panel"
                ></div>

                <DiagramCanvas
                    ref={diagramCanvasRef}
                    isLoading={isLoading}
                    loadingSource={loadingSource}
                />
            </main>

            {/* Combined Share Modal with Tabs */}
            {showShareModal && (
                <div className="modal-overlay">
                    <div className="share-modal-container">
                        <div className="share-modal">
                            <h3>Share your ER Diagram</h3>

                            <div className="share-tabs">
                                <button
                                    className={`tab-btn ${
                                        activeShareTab === "url" ? "active" : ""
                                    }`}
                                    onClick={() => {
                                        setActiveShareTab("url");
                                        setTimeout(() => {
                                            if (shareUrlInputRef.current) {
                                                shareUrlInputRef.current.select();
                                            }
                                        }, 50);
                                    }}
                                >
                                    Share URL
                                </button>
                                <button
                                    className={`tab-btn ${
                                        activeShareTab === "code"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => {
                                        setActiveShareTab("code");
                                        setTimeout(() => {
                                            if (shareCodeRef.current) {
                                                shareCodeRef.current.select();
                                            }
                                        }, 50);
                                    }}
                                >
                                    Share Code
                                </button>
                            </div>

                            {activeShareTab === "url" && (
                                <div className="share-tab-content">
                                    <p>
                                        Copy this URL to share your diagram with
                                        others:
                                    </p>
                                    <div className="share-url-container">
                                        <input
                                            type="text"
                                            value={shareUrl}
                                            readOnly
                                            ref={shareUrlInputRef}
                                            className="share-url-input"
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            className={`copy-btn ${
                                                copySuccess
                                                    ? "copy-success"
                                                    : ""
                                            }`}
                                        >
                                            {copySuccess ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeShareTab === "code" && (
                                <div className="share-tab-content">
                                    <p>
                                        Copy this code to share your diagram
                                        with others:
                                    </p>
                                    <div className="share-code-container">
                                        <textarea
                                            value={shareCode}
                                            readOnly
                                            ref={shareCodeRef}
                                            className="share-code-input"
                                            rows={5}
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            className={`copy-btn ${
                                                copySuccess
                                                    ? "copy-success"
                                                    : ""
                                            }`}
                                        >
                                            {copySuccess ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="close-btn"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Code Modal */}
            {showImportCodeModal && (
                <div className="modal-overlay">
                    <div className="share-modal-container">
                        <div className="share-modal">
                            <h3>Import ER Diagram from Code</h3>
                            <p>Paste the shared code below:</p>
                            <div className="import-code-container">
                                <textarea
                                    value={importCode}
                                    onChange={(e) =>
                                        setImportCode(e.target.value)
                                    }
                                    className="share-code-input"
                                    rows={5}
                                    placeholder="Paste share code here..."
                                />
                            </div>
                            {importError && (
                                <p className="error-message">{importError}</p>
                            )}
                            <div className="modal-buttons">
                                <button
                                    onClick={importFromCode}
                                    className="import-btn"
                                >
                                    Import
                                </button>
                                <button
                                    onClick={() =>
                                        setShowImportCodeModal(false)
                                    }
                                    className="close-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
