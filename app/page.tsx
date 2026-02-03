"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { PlayerType } from "@/lib/types";

const LandingPage = () => {
    const router = useRouter();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);

    const handleJoinGame = () => {
        if (!name || name.trim() === "") {
            setErrorMessage("Please enter a valid game name.");
            return;
        } else {
            // Clear error message
            setErrorMessage(null);

            // Build the player object
            const player: PlayerType = {
                id: Math.random().toString(36).substring(2, 15),
                name: name.trim(),
                x: Math.floor(Math.random() * 500),
                y: Math.floor(Math.random() * 500),
                isInfected: false
            };

            // Navigate to the game page with player info as query params
            router.push(
                `/game?playerId=${player.id}&playerName=${encodeURIComponent(
                    player.name!,
                )}&playerX=${player.x}&playerY=${player.y}`,
            );
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-neutral-100">
            <div className="flex flex-col gap-4 border rounded-2xl p-8 bg-neutral-50 shadow-sm w-[30rem]">
                <header>
                    <h1 className="text-center text-lg font-extrabold">
                        Straw Man Arena
                    </h1>
                    <p className="text-center text-sm text-muted-foreground">
                        A real-time multiplayer educational game that teaches
                        the Straw Man fallacy through infection-based gameplay.
                    </p>
                </header>
                <main className="flex flex-col gap-2">
                    <Label htmlFor="name">Game Name</Label>
                    <Input
                        placeholder="Your game name..."
                        name="name"
                        id="name"
                        value={name ?? ""}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {errorMessage && (
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    )}
                    <Button className="w-full" onClick={handleJoinGame}>
                        Create Game
                    </Button>
                </main>
                <footer className="text-xs text-muted-foreground text-center">
                    <span>Developed by </span>
                    <Link
                        href={"https://github.com/Kent0710"}
                        className="underline text-blue-500"
                    >
                        {" "}
                        Kent0710
                    </Link>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
