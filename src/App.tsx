/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { SqlInputPanel } from "./components/InputPanel";
import "./App.css";

function App() {
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    const appMainRef = useRef<HTMLDivElement>(null);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !appMainRef.current) return;

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

    
    useEffect(() => {
        const storedWidth = localStorage.getItem("sidebarWidth");
        if (storedWidth) {
            const width = parseInt(storedWidth, 10);
            
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

    return (
        <div className="er-diagram-app">
            <main ref={appMainRef} className="app-main">
                <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
                    <SqlInputPanel />
                </div>

                <div
                    className="sidebar-resizer"
                    onMouseDown={handleMouseDown}
                    title="Drag to resize panel"
                />

                <DiagramCanvas />
            </main>
        </div>
    );
}

export default App;
