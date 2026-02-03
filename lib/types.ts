export type Gender = "male" | "female";

export interface PlayerType {
    id: string | null;
    name: string | null;
    x: number;
    y: number;
    collidingWith?: string | null;
    isInfected: boolean;
    gender?: Gender;
}

export interface QuestionType {
    id : number;
    question: string;
    answer: string | "straw-man-fallacy" | "not-straw-man-fallacy",
    explanation: string;
}