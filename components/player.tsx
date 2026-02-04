import { PlayerType, Gender } from "@/lib/types";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const MOVEMENT_SPEED = 5;
const SERVER_UPDATE_RATE = 50; // Send to server every 50ms (20 updates/sec)

// Sprite paths for infected players
const INFECTED_SPRITES = {
    front: "/assets/infected_players/INFECTED_IDLE__FRONT.png",
    back: "/assets/infected_players/INFECTED_IDLE__BACK.png",
    left: "/assets/infected_players/INFECTED_RUN__LEFT.png",
    right: "/assets/infected_players/INFECTED_RUN__RIGHT.png",
    attack: "/assets/infected_players/INFECTED_ATTACK_INFECT.png",
};

// Sprite paths for regular players
const REGULAR_SPRITES = {
    male: {
        front: "/assets/regular%20players/MALE_IDLE__FRONT.png",
        back: "/assets/regular%20players/MALE_IDLE__BACK.png",
        left: "/assets/regular%20players/MALE_RUN__LEFT.png",
        right: "/assets/regular%20players/MALE_RUN__RIGHT.png",
    },
    female: {
        front: "/assets/regular%20players/FEMALE_IDLE__FRONT.png",
        back: "/assets/regular%20players/FEMALE_IDLE__BACK.png",
        left: "/assets/regular%20players/FEMALE_RUN__LEFT.png",
        right: "/assets/regular%20players/FEMALE_RUN__RIGHT.png",
    },
};

type Direction = "front" | "back" | "left" | "right";

interface PlayerComponentProps extends PlayerType {
    socketRef?: React.RefObject<WebSocket | null>;
    isCollided: boolean;
    gameRunning: boolean;
    gamePaused: boolean;
    onGenderChange?: (gender: Gender) => void;
}

const Player: React.FC<PlayerComponentProps> = ({
    id,
    name,
    x,
    y,
    collidingWith,
    isInfected,
    gender = "male",
    socketRef,
    isCollided,
    gameRunning,
    gamePaused,
    onGenderChange,
}) => {
    const searchParams = useSearchParams();
    const isLocalPlayer = id === searchParams.get("playerId");

    const keysPressed = useRef<Set<string>>(new Set());
    const [localDirection, setLocalDirection] = useState<Direction>("front");
    
    // Client-side prediction: local position for immediate feedback (local player only)
    const [localX, setLocalX] = useState(x);
    const [localY, setLocalY] = useState(y);
    const lastServerUpdateRef = useRef<number>(0);
    const pendingMovementRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

    // Track previous position for remote players (refs = no re-renders)
    const prevPosRef = useRef({ x, y });
    const remoteDirRef = useRef<Direction>("front");

    // Calculate direction for remote players inline (fastest possible - no hook overhead)
    let direction: Direction;
    if (isLocalPlayer) {
        direction = localDirection;
    } else {
        const dx = x - prevPosRef.current.x;
        const dy = y - prevPosRef.current.y;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            remoteDirRef.current = Math.abs(dx) >= Math.abs(dy)
                ? (dx > 0 ? "right" : "left")
                : (dy > 0 ? "front" : "back");
            prevPosRef.current = { x, y };
        }
        direction = remoteDirRef.current;
    }

    // Sync local position with server when server position changes significantly
    // This handles teleports, resets, and server corrections
    useEffect(() => {
        if (!isLocalPlayer) return;
        
        const diffX = Math.abs(localX - x);
        const diffY = Math.abs(localY - y);
        
        // Only correct if significantly different (teleport/reset)
        if (diffX > 50 || diffY > 50) {
            setLocalX(x);
            setLocalY(y);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [x, y]); // Only run when server position changes, not on local movement

    useEffect(() => {
        if (!isLocalPlayer) return;

        const down = (e: KeyboardEvent) =>
            keysPressed.current.add(e.key.toLowerCase());
        const up = (e: KeyboardEvent) =>
            keysPressed.current.delete(e.key.toLowerCase());

        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);

        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, [isLocalPlayer]);

    useEffect(() => {
        if (!isLocalPlayer || !gameRunning || gamePaused || isCollided) return;

        let frameId: number;

        const loop = () => {
            let dx = 0;
            let dy = 0;

            const keys = keysPressed.current;
            if (keys.has("w") || keys.has("arrowup")) dy -= 1;
            if (keys.has("s") || keys.has("arrowdown")) dy += 1;
            if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
            if (keys.has("d") || keys.has("arrowright")) dx += 1;

            if (dx !== 0 || dy !== 0) {
                // Normalize diagonal movement
                const normalizedDx = (dx / Math.hypot(dx, dy)) * MOVEMENT_SPEED;
                const normalizedDy = (dy / Math.hypot(dx, dy)) * MOVEMENT_SPEED;

                // Update direction for sprite
                if (Math.abs(dx) >= Math.abs(dy)) {
                    setLocalDirection(dx > 0 ? "right" : "left");
                } else {
                    setLocalDirection(dy > 0 ? "front" : "back");
                }

                // Client-side prediction: update local position immediately
                setLocalX((prev) => Math.max(0, Math.min(prev + normalizedDx, 1200 - 64)));
                setLocalY((prev) => Math.max(0, Math.min(prev + normalizedDy, 600 - 64)));

                // Accumulate movement for throttled server update
                pendingMovementRef.current.dx += normalizedDx;
                pendingMovementRef.current.dy += normalizedDy;

                // Throttle server updates
                const now = Date.now();
                if (now - lastServerUpdateRef.current >= SERVER_UPDATE_RATE) {
                    socketRef?.current?.send(
                        JSON.stringify({
                            type: "move",
                            payload: {
                                id,
                                dx: pendingMovementRef.current.dx,
                                dy: pendingMovementRef.current.dy,
                                isInfected,
                            },
                        }),
                    );
                    // Reset accumulated movement
                    pendingMovementRef.current = { dx: 0, dy: 0 };
                    lastServerUpdateRef.current = now;
                }
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [
        isLocalPlayer,
        gameRunning,
        gamePaused,
        isCollided,
        socketRef,
        id,
        isInfected,
    ]);

    // Use local position for local player, server position for others
    const displayX = isLocalPlayer ? localX : x;
    const displayY = isLocalPlayer ? localY : y;

    return (
        <li
            style={{ left: displayX, top: displayY }}
            className={`absolute flex flex-col items-center ${!isLocalPlayer ? 'transition-[left,top] duration-75 ease-linear' : ''}`}
        >
            <span className="text-xs font-semibold">{name}</span>

            {/* SPRITE + SHADOW */}
            <div className="relative">
                {/* Ground shadow */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-black blur-xs rounded-full z-0" />

                {isInfected ? (
                    <Image
                        src={
                            collidingWith
                                ? INFECTED_SPRITES.attack
                                : INFECTED_SPRITES[direction]
                        }
                        alt={`${name} infected`}
                        width={64}
                        height={64}
                        className="w-16 h-16 relative z-10 image-rendering-pixelated"
                        priority
                    />
                ) : (
                    <Image
                        src={REGULAR_SPRITES[gender][direction]}
                        alt={name!}
                        width={64}
                        height={64}
                        className="w-16 h-16 relative z-10 image-rendering-pixelated"
                        priority
                    />
                )}

                {/* Gender selector */}
                {isLocalPlayer && !gameRunning && onGenderChange && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
                        <button
                            onClick={() => onGenderChange("male")}
                            className={`text-xs px-2 py-0.5 rounded ${
                                gender === "male"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200"
                            }`}
                        >
                            ♂
                        </button>
                        <button
                            onClick={() => onGenderChange("female")}
                            className={`text-xs px-2 py-0.5 rounded ${
                                gender === "female"
                                    ? "bg-pink-500 text-white"
                                    : "bg-gray-200"
                            }`}
                        >
                            ♀
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
};

export default Player;
