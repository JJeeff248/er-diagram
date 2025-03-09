import { useState, useRef, useEffect } from "react";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { SqlInputPanel } from "./components/SqlInputPanel";
import "./App.css";
// Import type for html2canvas
import type html2canvas from "html2canvas";

function App() {
    const [sqlInput, setSqlInput] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(380); // Increased initial width from 280px to 380px
    const [isResizing, setIsResizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const diagramCanvasRef = useRef<any>(null);
    const appMainRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

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
            document.body.classList.add("resizing");
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.body.classList.remove("resizing");
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

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                exportMenuRef.current &&
                !exportMenuRef.current.contains(e.target as Node)
            ) {
                setShowExportMenu(false);
            }
        };

        if (showExportMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showExportMenu]);

    const toggleExportMenu = () => {
        setShowExportMenu(!showExportMenu);
    };

    const exportAsImage = (format: "png" | "jpeg") => {
        if (!diagramCanvasRef.current) return;

        const canvasElement = document.querySelector(
            ".diagram-canvas"
        ) as HTMLElement;
        if (!canvasElement) return;

        // Use html2canvas to capture the diagram
        import("html2canvas").then(({ default: html2canvas }) => {
            html2canvas(canvasElement, {
                backgroundColor: "#f5f5f5",
                scale: 2, // Better quality
                logging: false,
                allowTaint: true,
                useCORS: true,
            }).then((canvas: HTMLCanvasElement) => {
                // Create download link
                const link = document.createElement("a");
                link.download = `er-diagram.${format}`;
                link.href = canvas.toDataURL(`image/${format}`);
                link.click();
            });
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

        const data = diagramCanvasRef.current.getExportData();
        const jsonStr = JSON.stringify(data, null, 2);

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

    return (
        <div className="er-diagram-app">
            <header className="app-header">
                <h1>ER Diagram Studio</h1>
                <div className="toolbar">
                    <div className="export-container" ref={exportMenuRef}>
                        <button onClick={toggleExportMenu}>
                            Export Diagram
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
        </div>
    );
}

export default App;
