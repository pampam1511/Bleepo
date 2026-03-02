import { createContext, useContext } from "react";
import {
  fetchMonthLogs,
  fetchAllLogs,
  getDetailLog,
  saveHealthLog,
  computePeriodStats,
} from "@/lib/health /period-service";
import {
  getTodayCalories,
  saveTodayCalories,
  getCaloriesRange,
  getTodayNutrition,
  saveTodayNutrition,
} from "@/lib/health /calorie-service";
import {
  getStepsDaily,
  saveStepsDaily,
  getStepsGoal,
  saveStepsGoal,
} from "@/lib/health /step-service";
import {
  logWeight,
  getWeightLogs,
  calculateBMI,
  bmiCategory,
} from "@/lib/health /weight-service";
import{
  savePCOSLog,
  getPCOSLog,
  getPCOSLogs,
  getPCOSTrends,
  getPCOSStreak,
  type PCOSPayload,
  type PCOSLog,
  type PCOSTrends,
}from "@/lib/health /pcos-service"

type HealthContextType = {
  // Period
  fetchMonthLogs: (date: Date) => Promise<any[]>;
  fetchAllLogs: () => Promise<any[]>;
  getDetailLog: (healthLogId: string, type: "PERIOD" | "PCOS") => Promise<any>;
  saveHealthLog: (params: { date: string; type: "PERIOD" | "PCOS"; payload: any }) => Promise<void>;
  getPeriodStats: (logs: any[]) => {
    avgLength: number | null;
    avgCycle: number | null;
    nextPeriodDate: Date | null;
    ovulationDate: Date | null;
    fertileStart: Date | null;
    fertileEnd: Date | null;
    cycleRange: { early: Date; late: Date } | null;
  };
  // Calories
  getTodayCalories: () => Promise<any | null>;
  saveTodayCalories: (params: {
    targetCalories: number;
    dailyCalories: number;
    burnedCalories?: number;
    burnedGoal?: number;
    burnedSource?: "steps" | "manual";
    goalStatus?: string;
  }) => Promise<void>;
  getCaloriesRange: (start: Date, end: Date) => Promise<any[]>;
  // Nutrition
  getTodayNutrition: () => Promise<any | null>;
  saveTodayNutrition: (params: {
    carbs: number;
    fat: number;
    protein: number;
    carbsGoal?: number;
    fatGoal?: number;
    proteinGoal?: number;
  }) => Promise<void>;
  // Steps
  getStepsDaily: (start: Date, end: Date) => Promise<any[]>;
  saveStepsDaily: (date: Date, payload: any) => Promise<void>;
  getStepsGoal: () => Promise<any | null>;
  saveStepsGoal: (params: { targetSteps: number; goalStatus?: string }) => Promise<void>;
  // Weight
  logWeight: (weightKg: number, heightCm: number, note?: string) => Promise<void>;
  getWeightLogs: (limitDays?: number) => Promise<any[]>;
  calculateBMI: (weightKg: number, heightCm: number) => number;
  bmiCategory: (bmi: number) => string;
  //PCOS
  savePCOSLog:   (date: string, payload: PCOSPayload) => Promise<void>;
  getPCOSLog:    (date: string) => Promise<PCOSLog | null>;
  getPCOSLogs:   (startDate: Date, endDate: Date) => Promise<PCOSLog[]>;
  getPCOSTrends: (limitDays?: number) => Promise<PCOSTrends>;
  getPCOSStreak: () => Promise<number>;

};

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  return (
    <HealthContext.Provider
      value={{
        fetchMonthLogs,
        fetchAllLogs,
        getDetailLog,
        saveHealthLog,
        getPeriodStats: computePeriodStats,
        getTodayCalories,
        saveTodayCalories,
        getCaloriesRange,
        getTodayNutrition,
        saveTodayNutrition,
        getStepsDaily,
        saveStepsDaily,
        getStepsGoal,
        saveStepsGoal,
        logWeight,
        getWeightLogs,
        calculateBMI,
        bmiCategory,
        savePCOSLog,
        getPCOSLog,
        getPCOSLogs,
        getPCOSTrends,
        getPCOSStreak,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) throw new Error("useHealth must be used inside HealthProvider");
  return context;
}