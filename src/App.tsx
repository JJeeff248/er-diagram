import { useState, useRef, useEffect } from "react";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { SqlInputPanel } from "./components/SqlInputPanel";
import "./App.css";

function App() {
    const [sqlInput, setSqlInput] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(380); // Increased initial width from 280px to 380px
    const [isResizing, setIsResizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);
    const shareUrlInputRef = useRef<HTMLInputElement>(null);
    const diagramCanvasRef = useRef<any>(null);
    const appMainRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check URL hash on initial load
    useEffect(() => {
        if (window.location.hash && window.location.hash.length > 1) {
            try {
                // Remove the leading # and decode the data
                const hashData = window.location.hash.substring(1);
                const jsonData = JSON.parse(atob(hashData));

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
                    }
                }, 100);
            } catch (error) {
                console.error("Error loading diagram from URL:", error);
                alert("The shared diagram data is invalid or corrupted.");
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

    // Share diagram via URL
    const shareDiagram = () => {
        if (
            !diagramCanvasRef.current ||
            !diagramCanvasRef.current.getExportData
        ) {
            console.error("Export data method not available");
            return;
        }

        // Get diagram data and add SQL input to it
        const diagramData = diagramCanvasRef.current.getExportData();
        const exportData = {
            ...diagramData,
            sqlInput, // Include the SQL input in the export data
        };

        // Convert to base64 string to make it URL-safe
        const jsonStr = JSON.stringify(exportData);
        const base64Data = btoa(jsonStr);

        // Create shareable URL with hash
        const url = `${window.location.origin}${window.location.pathname}#${base64Data}`;
        setShareUrl(url);
        setShowShareModal(true);

        // Select the URL text once the input is rendered
        setTimeout(() => {
            if (shareUrlInputRef.current) {
                shareUrlInputRef.current.select();
            }
        }, 100);
    };

    // Copy share URL to clipboard
    const copyShareUrl = () => {
        if (shareUrlInputRef.current) {
            shareUrlInputRef.current.select();
            document.execCommand("copy");
            // Or use the modern clipboard API:
            // navigator.clipboard.writeText(shareUrl);

            // Show success state temporarily
            setCopySuccess(true);
            setTimeout(() => {
                setCopySuccess(false);
            }, 2000);
        }
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
                    <button onClick={shareDiagram} title="Share Diagram">
                        <i className="fas fa-share"></i>
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

                <DiagramCanvas ref={diagramCanvasRef} />
            </main>

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay">
                    <div className="share-modal-container">
                        <div className="share-modal">
                            <h3>Share your ER Diagram</h3>
                            <p>
                                Copy this URL to share your diagram with others:
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
                                    onClick={copyShareUrl}
                                    className={`copy-btn ${
                                        copySuccess ? "copy-success" : ""
                                    }`}
                                >
                                    {copySuccess ? "Copied!" : "Copy"}
                                </button>
                            </div>
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
        </div>
    );
}

export default App;
