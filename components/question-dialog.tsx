import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCollidedPlayersStore } from "@/stores/collidedPlayersStore";

import { Button } from "./ui/button";
import { usePlayersStore } from "@/stores/playersStore";
import { useQuestionsStore } from "@/stores/questionsStore";
import React from "react";

import { Check, X } from "lucide-react";
import { useState, useEffect } from "react";

import { QuestionType } from "@/lib/types";

interface QuestionDialogProps {
    isDialogOpen: boolean;
    setIsDialogOpen: (open: boolean) => void;
    id: string;
    socketRef: React.RefObject<WebSocket | null>;
}

const QuestionDialog: React.FC<QuestionDialogProps> = ({
    isDialogOpen,
    setIsDialogOpen,
    id,
    socketRef,
}) => {
    const { players } = usePlayersStore();
    const { collidedPlayers } = useCollidedPlayersStore();
    const { getRandomQuestion, markQuestionUsed } = useQuestionsStore();

    const [message, setMessage] = useState("");
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [question, setQuestion] = useState<QuestionType | null>(null);
    
    // Feedback from other player's answer
    const [otherPlayerFeedback, setOtherPlayerFeedback] = useState<{
        playerName: string;
        isCorrect: boolean;
    } | null>(null);

    // Pick a random question when dialog opens
    useEffect(() => {
        if (isDialogOpen && !question) {
            const randomQuestion = getRandomQuestion();
            markQuestionUsed(randomQuestion.id);
            queueMicrotask(() => setQuestion(randomQuestion));
        }
    }, [isDialogOpen, question, getRandomQuestion, markQuestionUsed]);

    // Listen for answer feedback from server
    React.useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === "answer:feedback") {
                const { playerId, playerName, isCorrect } = data.payload;
                // Only show feedback if it's not from the current player
                if (playerId !== id) {
                    setOtherPlayerFeedback({ playerName, isCorrect });
                }
            }
        };

        socket.addEventListener("message", handleMessage);
        return () => socket.removeEventListener("message", handleMessage);
    }, [socketRef, id]);

    const handleAnswer = (
        choice: "straw-man-fallacy" | "not-straw-man-fallacy",
    ) => {
        // Ensure there is always a return string
        if (!choice || hasAnswered || !question) return;

        const answer = question.answer;
        const socket = socketRef.current;
        const wasCorrect = choice === answer;

        setHasAnswered(true);
        setIsCorrect(wasCorrect);

        // Get current player's name
        const currentPlayer = players.find((p) => p.id === id);
        const playerName = currentPlayer?.name || "Unknown";

        // Broadcast feedback to all players
        socket?.send(
            JSON.stringify({
                type: "answer:feedback",
                payload: {
                    playerId: id,
                    playerName,
                    isCorrect: wasCorrect,
                },
            }),
        );

        if (wasCorrect) {
            setMessage("You answered correctly! You are safe from infection.");
        } else {
            setMessage("Wrong answer! You have been infected.");
        }

        // Start countdown
        setCountdown(5);
        
        const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(countdownInterval);
                    
                    // Send socket message after countdown
                    if (wasCorrect) {
                        socket?.send(
                            JSON.stringify({
                                type: "answer:correct",
                                payload: {},
                            }),
                        );
                    } else {
                        socket?.send(
                            JSON.stringify({
                                type: "player:infect",
                                payload: {
                                    playerId: id,
                                },
                            }),
                        );
                    }
                    
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={() => {}} modal={true}>
            <DialogContent
                className="text-white  shadow-green-500"
                style={{
                    backgroundImage: "url('/ui/DIALOG_BG.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
                showCloseButton={false}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle
                        className="
                            text-center text-5xl font-jungle
                            bg-gradient-to-b from-green-300 to-green-500 text-transparent bg-clip-text  drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]
                    "
                    >
                        Someone is trying to infect you! <br /> Answer correctly
                        to save yourself!
                    </DialogTitle>
                </DialogHeader>
                {/* if the id on this props is in collidedPlayers, 
                see who is infected and if this is the one who is infected 
                allow dialog answering  */}
                {collidedPlayers.find((p) => p.id === id) &&
                players.find((p) => p.id === id)?.isInfected === false ? (
                    <div className="mt-4">
                        <p className="text-2xl font-bold mb-2 text-white/90">
                            Scenario (is this an example of Straw Man Fallacy?)
                        </p>
                        <div className="text-lg bg-black/30 space-y-2 border border-green-300 px-4 py-2 font-medium">
                            {question ? (
                                question.question.split("\n").map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))
                            ) : (
                                <p>Loading question...</p>
                            )}
                        </div>

                        <div className="flex w-full gap-2 mt-8">
                            <Button
                                className="flex-1 bg-green-500 hover:bg-green-500/80 disabled:opacity-50"
                                onClick={() =>
                                    handleAnswer("straw-man-fallacy")
                                }
                                disabled={hasAnswered || !question}
                            >
                                Straw Man Fallacy
                            </Button>
                            <Button
                                className="flex-1 bg-red-500 hover:bg-red-500/80 disabled:opacity-50"
                                onClick={() =>
                                    handleAnswer("not-straw-man-fallacy")
                                }
                                disabled={hasAnswered || !question}
                            >
                                Not Straw Man Fallacy
                            </Button>
                        </div>

                        {/* Answer feedback */}
                        {hasAnswered && (
                            <div
                                className={`mt-4 p-4 rounded-lg text-center ${
                                    isCorrect
                                        ? "bg-green-500/30 border border-green-400"
                                        : "bg-red-500/30 border border-red-400"
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    {isCorrect ? (
                                        <Check className="w-6 h-6 text-green-400" />
                                    ) : (
                                        <X className="w-6 h-6 text-red-400" />
                                    )}
                                    <span className="text-xl font-bold">
                                        {isCorrect ? "Correct!" : "Wrong!"}
                                    </span>
                                </div>
                                <p className="text-sm">{message}</p>
                                {countdown !== null && (
                                    <p className="text-sm mt-2 text-white/70">
                                        Resuming in {countdown} second
                                        {countdown !== 1 ? "s" : ""}...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-lg bg-black/30 space-y-2 border border-green-300 px-4 py-2 font-medium">
                            Please wait while someone is answering the question.
                        </p>
                        
                        {/* Show feedback when other player answers */}
                        {otherPlayerFeedback && (
                            <div
                                className={`mt-4 p-4 rounded-lg ${
                                    otherPlayerFeedback.isCorrect
                                        ? "bg-green-500/30 border border-green-400"
                                        : "bg-red-500/30 border border-red-400"
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    {otherPlayerFeedback.isCorrect ? (
                                        <Check className="w-6 h-6 text-green-400" />
                                    ) : (
                                        <X className="w-6 h-6 text-red-400" />  
                                    )}
                                    <span className="text-xl font-bold">
                                        {otherPlayerFeedback.playerName} answered{" "}
                                        {otherPlayerFeedback.isCorrect ? "correctly!" : "incorrectly!"}
                                    </span>
                                </div>
                                <p className="text-sm text-white/80">
                                    {otherPlayerFeedback.isCorrect
                                        ? `${otherPlayerFeedback.playerName} is safe from infection.`
                                        : `${otherPlayerFeedback.playerName} has been infected!`}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default QuestionDialog;
