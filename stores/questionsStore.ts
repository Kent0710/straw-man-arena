import { create } from "zustand";
import { questions } from "@/lib/questions";
import { QuestionType } from "@/lib/types";

type QuestionsStore = {
    usedQuestionIds: Set<number>;
    getRandomQuestion: () => QuestionType;
    markQuestionUsed: (id: number) => void;
    resetUsedQuestions: () => void;
};

export const useQuestionsStore = create<QuestionsStore>((set, get) => ({
    usedQuestionIds: new Set(),

    getRandomQuestion: () => {
        const { usedQuestionIds } = get();
        
        // Get available questions (not yet used)
        const availableQuestions = questions.filter(
            (q) => !usedQuestionIds.has(q.id)
        );

        // If all questions have been used, reset and use all questions
        if (availableQuestions.length === 0) {
            set({ usedQuestionIds: new Set() });
            const randomIndex = Math.floor(Math.random() * questions.length);
            return questions[randomIndex];
        }

        // Pick a random question from available ones
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        return availableQuestions[randomIndex];
    },

    markQuestionUsed: (id: number) =>
        set((state) => ({
            usedQuestionIds: new Set([...state.usedQuestionIds, id]),
        })),

    resetUsedQuestions: () => set({ usedQuestionIds: new Set() }),
}));
