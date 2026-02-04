"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GameOverDialogProps {
    isOpen: boolean;
    onStartNewGame: () => void;
    isHost: boolean;
}

const GameOverDialog: React.FC<GameOverDialogProps> = ({
    isOpen,
    onStartNewGame,
    isHost,
}) => {
    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="text-white shadow-red-500 max-w-md"
                style={{
                    backgroundImage: "url('/ui/DIALOG_BG.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle
                        className="
                            text-center text-5xl font-jungle
                            bg-gradient-to-b from-red-400 to-red-600 text-transparent bg-clip-text drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]
                        "
                    >
                        GAME OVER!
                    </DialogTitle>
                    <DialogDescription className="text-center text-xl font-jungle text-white/80 mt-4">
                        All players have been infected!
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 mt-6">
                    <p className="text-center text-lg font-jungle bg-gradient-to-b from-amber-300 to-amber-500 text-transparent bg-clip-text">
                        The infection has spread to everyone.
                    </p>
                    
                    {isHost ? (
                        <Button
                            onClick={onStartNewGame}
                            className="mt-4 text-lg px-8 py-3 font-jungle bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600"
                        >
                            Start New Game
                        </Button>
                    ) : (
                        <p className="text-center text-md font-jungle text-white/60 mt-4">
                            Waiting for Kent to start a new game...
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GameOverDialog;
