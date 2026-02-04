"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PlayerType, Gender } from "@/lib/types";
import Player from "@/components/player";
import { usePlayersStore } from "@/stores/playersStore";
import { useQuestionsStore } from "@/stores/questionsStore";
import { useRouter } from "next/navigation";
import QuestionDialog from "@/components/question-dialog";
import { useCollidedPlayersStore } from "@/stores/collidedPlayersStore";
import { Button } from "@/components/ui/button";
import GAMENAMEIMAGE from "@/public/ui/GAME_NAME.png";
import Image from "next/image";
import PLAYERSTITLE from "@/public/ui/PLAYERS_TITLE.png";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Fixed arena dimensions - must match server
const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 600;

// All sprite paths to preload
const ALL_SPRITES = [
    // Infected sprites
    "/assets/infected_players/INFECTED_IDLE__FRONT.png",
    "/assets/infected_players/INFECTED_IDLE__BACK.png",
    "/assets/infected_players/INFECTED_RUN__LEFT.png",
    "/assets/infected_players/INFECTED_RUN__RIGHT.png",
    "/assets/infected_players/INFECTED_ATTACK_INFECT.png",
    // Male regular sprites
    "/assets/regular%20players/MALE_IDLE__FRONT.png",
    "/assets/regular%20players/MALE_IDLE__BACK.png",
    "/assets/regular%20players/MALE_RUN__LEFT.png",
    "/assets/regular%20players/MALE_RUN__RIGHT.png",
    // Female regular sprites
    "/assets/regular%20players/FEMALE_IDLE__FRONT.png",
    "/assets/regular%20players/FEMALE_IDLE__BACK.png",
    "/assets/regular%20players/FEMALE_RUN__LEFT.png",
    "/assets/regular%20players/FEMALE_RUN__RIGHT.png",
];

const GamePageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const socketRef = useRef<WebSocket | null>(null);
    const currentPlayerName = searchParams.get("playerName");
    const currentPlayerId = searchParams.get("playerId");

    // Timer state from server
    const [gameTimer, setGameTimer] = useState(20);
    const [gameRunning, setGameRunning] = useState(false);
    const [gamePaused, setGamePaused] = useState(false);

    const [isCollided, setIsCollided] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Sprite preloading state
    const [spritesLoaded, setSpritesLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Zustand stores
    const { players, setPlayers } = usePlayersStore();
    const { addCollidedPlayer, clearPlayers } = useCollidedPlayersStore();
    const { resetUsedQuestions } = useQuestionsStore();

    // Track previous gameRunning state to detect when game stops
    const prevGameRunningRef = useRef(gameRunning);

    // Reset used questions when game stops (timer ends or manually stopped)
    useEffect(() => {
        if (prevGameRunningRef.current && !gameRunning) {
            // Game just stopped
            resetUsedQuestions();
        }
        prevGameRunningRef.current = gameRunning;
    }, [gameRunning, resetUsedQuestions]);

    // Preload all sprites on mount
    useEffect(() => {
        let loadedCount = 0;
        const totalSprites = ALL_SPRITES.length;
        
        const preloadImage = (src: string): Promise<void> => {
            return new Promise((resolve) => {
                const img = new window.Image();
                img.onload = () => {
                    loadedCount++;
                    setLoadingProgress(Math.round((loadedCount / totalSprites) * 100));
                    resolve();
                };
                img.onerror = () => {
                    // Still count as loaded to not block the game
                    loadedCount++;
                    setLoadingProgress(Math.round((loadedCount / totalSprites) * 100));
                    console.warn(`Failed to preload sprite: ${src}`);
                    resolve();
                };
                img.src = src;
            });
        };
        
        Promise.all(ALL_SPRITES.map(preloadImage)).then(() => {
            setSpritesLoaded(true);
        });
    }, []);

    useEffect(() => {
        // 1. Extract player info from query params
        const player: PlayerType = {
            id: searchParams.get("playerId"),
            name: searchParams.get("playerName"),
            x: parseInt(searchParams.get("playerX") || "0", 10),
            y: parseInt(searchParams.get("playerY") || "0", 10),
            isInfected: searchParams.get("playerName") === "Kent",
            gender: "male",
        };

        // Check if all the players
        if (!player.id || !player.name || isNaN(player.x) || isNaN(player.y)) {
            console.error("Player ID is required to join the game.");
            router.push("/");
            return;
        }

        // 2. Establish WebSocket connection
        const socket = new WebSocket(
            process.env.NEXT_PUBLIC_RENDER_WEBSOCKET || "ws://localhost:5000",
        );
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connection established");

            // Send the object as a stringified JSON
            socket.send(JSON.stringify({ type: "join", payload: { player } }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "players:update") {
                console.log("Received players update:", data);
                const players = data.payload;

                let collisionDetected = false;
                for (const p of players) {
                    if (p.collidingWith) {
                        collisionDetected = true;
                        // set dialog open
                        setIsDialogOpen(true);

                        // set collided players, if there is already, clear it and set this as new
                        addCollidedPlayer(p.id, p.isInfected);
                        addCollidedPlayer(p.collidingWith, false);

                        break;
                    }
                }
                setIsCollided(collisionDetected);

                setPlayers(players);
            }

            if (data.type === "players:reset") {
                setIsCollided(false);
                setIsDialogOpen(false);
                clearPlayers();

                setPlayers(data.payload);
            }

            // Handle timer updates from server
            if (data.type === "timer:update") {
                const { timer, running, paused } = data.payload;
                setGameTimer(timer);
                setGameRunning(running);
                setGamePaused(paused);
            }
        };

        return () => {
            socket.close();
        };
    }, [addCollidedPlayer, clearPlayers, router, searchParams, setPlayers]);

    const handleStartGame = () => {
        socketRef.current?.send(JSON.stringify({ type: "game:start" }));
    };

    const handleStopGame = () => {
        socketRef.current?.send(JSON.stringify({ type: "game:stop" }));
    };

    const handleGenderChange = (playerId: string, gender: Gender) => {
        socketRef.current?.send(
            JSON.stringify({
                type: "player:gender",
                payload: { playerId, gender },
            }),
        );
    };

    return (
        <div className="bg-neutral-100 h-screen flex ">
            {/* Left Side  */}

            {/* Right Side - Game Area */}
            <main
                className="relative flex-[85%] bg-neutral-50 p-4"
                style={{
                    backgroundImage: "url('/assets/DUNGEON_BG.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Black gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/0 z-0" />

                <div className="flex items-center justify-between">
                    <Image
                        src={GAMENAMEIMAGE}
                        alt="Game Name"
                        width={300}
                        height={50}
                        className="z-50 drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]"
                    />

                    {/* <h1
                        className="text-4xl font-semibold font-jungle text-white"
                        onClick={() => console.log(isCollided)}
                    >
                        Game Area{" "}
                    </h1> */}

                    <section className="flex gap-4 items-center">
                        <p className="font-jungle text-5xl bg-gradient-to-b from-green-300 to-green-500 text-transparent bg-clip-text  drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]">
                            Timer: {gameTimer}
                            {gamePaused && (
                                <span className="text-amber-500 ml-2">
                                    (Paused)
                                </span>
                            )}
                        </p>
                        {currentPlayerName === "Kent" && (
                            <Button
                                className="z-50"
                                onClick={
                                    !gameRunning
                                        ? () => handleStartGame()
                                        : () => handleStopGame()
                                }
                                disabled={!gameRunning && !spritesLoaded}
                            >
                                {!gameRunning 
                                    ? (spritesLoaded ? "Start Game" : `Loading... ${loadingProgress}%`)
                                    : "Stop Game"}
                            </Button>
                        )}
                        <Link href={"/"} className="z-50">
                            <Button>Exit Game</Button>
                        </Link>
                    </section>
                </div>

                {/* The Main Arena  */}
                <div
                    className="relative bg-transparent mt-4 overflow-hidden mx-auto"
                    style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}
                >
                    <ul>
                        {players &&
                            players.map((p) => (
                                <Player
                                    key={p.id}
                                    id={p.id}
                                    name={p.name}
                                    x={p.x}
                                    y={p.y}
                                    collidingWith={p.collidingWith}
                                    socketRef={socketRef}
                                    isInfected={p.isInfected}
                                    gender={p.gender}
                                    isCollided={isCollided}
                                    gameRunning={gameRunning}
                                    gamePaused={gamePaused}
                                    onGenderChange={
                                        p.id === currentPlayerId
                                            ? (gender) =>
                                                  handleGenderChange(
                                                      p.id!,
                                                      gender,
                                                  )
                                            : undefined
                                    }
                                />
                            ))}
                    </ul>
                </div>
            </main>

            <aside
                className="relative bg-neutral-50 flex-[15%] p-4 shadow-sm font-jungle overflow-hidden pt-7 "
                style={{
                    backgroundImage: "url('/ui/PLAYERS_BG.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Black gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40  to-black/10 z-0" />

                {/* Content */}
                <div className="relative z-10 text-white">
                    <Image
                        src={PLAYERSTITLE}
                        alt="Game Name"
                        width={300}
                        height={50}
                        className="z-50 drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]"
                    />

                    <ScrollArea
                        type="always"
                        className="overflow-y-auto h-[calc(100dvh-16rem)] mt-4 mb-8"
                    >
                        {players &&
                            players.map((p, index) => (
                                <li
                                    key={p.id}
                                    className="text-3xl truncate mt-2 ml-6
                                        bg-gradient-to-b from-green-300 to-green-500 text-transparent bg-clip-text drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] 
                                    "
                                >
                                    {index + 1}. {p.name}
                                </li>
                            ))}
                    </ScrollArea>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full">See All</Button>
                        </DialogTrigger>
                        <DialogContent
                            className="text-white  shadow-green-500"
                            style={{
                                backgroundImage: "url('/ui/DIALOG_BG.png')",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle
                                    className="
                                        text-center text-5xl font-jungle
                                        bg-gradient-to-b from-green-300 to-green-500 text-transparent bg-clip-text  drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]
                                    "
                                >
                                    All Connected Players
                                </DialogTitle>
                            </DialogHeader>
                            <ScrollArea
                                type="always"
                                className="overflow-y-auto min-h-[20vh] max-h-[60vh] mt-4 mb-8"
                            >
                                {players &&
                                    players.map((p, index) => (
                                        <li
                                            key={p.id}
                                            className="font-jungle text-3xl truncate mt-2 ml-6
                                        bg-gradient-to-b from-green-300 to-green-500 text-transparent bg-clip-text drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] 
                                    "
                                        >
                                            {index + 1}. {p.name}
                                        </li>
                                    ))}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>
            </aside>

            {isDialogOpen && (
                <QuestionDialog
                    isDialogOpen={isDialogOpen}
                    setIsDialogOpen={setIsDialogOpen}
                    id={currentPlayerId || ""}
                    socketRef={socketRef}
                />
            )}
        </div>
    );
};

const GamePage = () => {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white text-2xl">Loading game...</div>}>
            <GamePageContent />
        </Suspense>
    );
};

export default GamePage;
