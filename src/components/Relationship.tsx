import { useEffect, useState } from "react";
import "../styles/Entity.css";

interface RelationshipProps {
    from: HTMLLIElement | null;
    to: HTMLLIElement | null;
}

export function Relationship({ from, to }: RelationshipProps) {
    const [fromPosition, setFromPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [toPosition, setToPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        let animationFrameId: number;

        const updatePositions = () => {
            if (from && to) {
                const fromRect = from.getBoundingClientRect();
                const toRect = to.getBoundingClientRect();

                setFromPosition({
                    x: fromRect.right,
                    y: fromRect.top + fromRect.height / 2
                });

                setToPosition({
                    x: toRect.left,
                    y: toRect.top + toRect.height / 2
                });
            }
            animationFrameId = requestAnimationFrame(updatePositions); // Continuously track positions
        };

        updatePositions(); // Start tracking

        return () => {
            cancelAnimationFrame(animationFrameId); // Cleanup on unmount
        };
    }, [from, to]); // Track continuously

    const midX = (fromPosition.x + toPosition.x) / 2;

    return (
        <>
            {from && to && (
                <div>
                    {/* Horizontal line from 'fromPosition' to the midpoint */}
                    <div style={{
                        position: "fixed",
                        top: `${fromPosition.y}px`,
                        left: `${Math.min(fromPosition.x, midX)}px`,
                        width: `${Math.abs(midX - fromPosition.x)}px`,
                        height: "2px",
                        backgroundColor: "black"
                    }} />

                    {/* Horizontal line from 'toPosition' to the midpoint */}
                    <div style={{
                        position: "fixed",
                        top: `${toPosition.y}px`,
                        left: `${Math.min(toPosition.x, midX)}px`,
                        width: `${Math.abs(midX - toPosition.x)}px`,
                        height: "2px",
                        backgroundColor: "black"
                    }} />

                    {/* Vertical line connecting the two */}
                    <div style={{
                        position: "fixed",
                        top: `${Math.min(fromPosition.y, toPosition.y)}px`,
                        left: `${midX}px`,
                        width: "2px",
                        height: `${Math.abs(toPosition.y - fromPosition.y)}px`,
                        backgroundColor: "black"
                    }} />
                </div>
            )}
        </>
    );
}
