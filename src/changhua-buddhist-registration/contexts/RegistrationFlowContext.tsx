import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { PersonalInfoFormData } from '@/utils/form-validation';
import { TransportOption } from '@/types';

// 報名流程步驟
export type RegistrationStep = 
  | 'identity'      // 身份選擇
  | 'event'         // 活動選擇
  | 'personal-info' // 個人資料填寫
  | 'transport'     // 交通車登記
  | 'confirmation'  // 確認頁面
  | 'success';      // 成功頁面

// 報名流程狀態
export interface RegistrationFlowState {
  currentStep: RegistrationStep;
  completedSteps: RegistrationStep[];
  
  // 各步驟的資料
  identity: 'monk' | 'volunteer' | null;
  selectedEventId: string | null;
  personalInfo: PersonalInfoFormData | null;
  transportSelection: {
    locationId: string | null;
    transport: TransportOption | null;
  } | null;
  
  // 流程狀態
  isLoading: boolean;
  error: string | null;
  
  // 持久化相關
  sessionId: string;
  lastSaved: Date | null;
}

// 報名流程動作
export type RegistrationFlowAction =
  | { type: 'SET_STEP'; payload: RegistrationStep }
  | { type: 'COMPLETE_STEP'; payload: RegistrationStep }
  | { type: 'SET_IDENTITY'; payload: 'monk' | 'volunteer' }
  | { type: 'SET_EVENT'; payload: string }
  | { type: 'SET_PERSONAL_INFO'; payload: PersonalInfoFormData }
  | { type: 'SET_TRANSPORT'; payload: { locationId: string | null; transport: TransportOption | null } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FLOW' }
  | { type: 'RESTORE_FROM_STORAGE'; payload: Partial<RegistrationFlowState> };

// 初始狀態
const initialState: RegistrationFlowState = {
  currentStep: 'identity',
  completedSteps: [],
  identity: null,
  selectedEventId: null,
  personalInfo: null,
  transportSelection: null,
  isLoading: false,
  error: null,
  sessionId: '',
  lastSaved: null,
};

// Reducer
function registrationFlowReducer(
  state: RegistrationFlowState,
  action: RegistrationFlowAction
): RegistrationFlowState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        error: null,
      };

    case 'COMPLETE_STEP':
      const newCompletedSteps = [...state.completedSteps];
      if (!newCompletedSteps.includes(action.payload)) {
        newCompletedSteps.push(action.payload);
      }
      return {
        ...state,
        completedSteps: newCompletedSteps,
        lastSaved: new Date(),
      };

    case 'SET_IDENTITY':
      return {
        ...state,
        identity: action.payload,
        lastSaved: new Date(),
      };

    case 'SET_EVENT':
      return {
        ...state,
        selectedEventId: action.payload,
        lastSaved: new Date(),
      };

    case 'SET_PERSONAL_INFO':
      return {
        ...state,
        personalInfo: action.payload,
        lastSaved: new Date(),
      };

    case 'SET_TRANSPORT':
      return {
        ...state,
        transportSelection: action.payload,
        lastSaved: new Date(),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'RESET_FLOW':
      return {
        ...initialState,
        sessionId: generateSessionId(),
      };

    case 'RESTORE_FROM_STORAGE':
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

// 生成會話 ID
function generateSessionId(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Context
const RegistrationFlowContext = createContext<{
  state: RegistrationFlowState;
  dispatch: React.Dispatch<RegistrationFlowAction>;
  
  // 便利方法
  goToStep: (step: RegistrationStep) => void;
  completeStep: (step: RegistrationStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canGoToStep: (step: RegistrationStep) => boolean;
  getStepProgress: () => number;
  resetFlow: () => void;
  
  // 資料設定方法
  setIdentity: (identity: 'monk' | 'volunteer') => void;
  setEvent: (eventId: string) => void;
  setPersonalInfo: (info: PersonalInfoFormData) => void;
  setTransport: (selection: { locationId: string | null; transport: TransportOption | null }) => void;
  
  // 持久化方法
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearStorage: () => void;
} | null>(null);

// 步驟順序定義
const STEP_ORDER: RegistrationStep[] = [
  'identity',
  'event', 
  'personal-info',
  'transport',
  'confirmation',
  'success'
];

// Provider 元件
export function RegistrationFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(registrationFlowReducer, {
    ...initialState,
    sessionId: generateSessionId(),
  });
  const router = useRouter();

  // 載入儲存的狀態
  useEffect(() => {
    loadFromStorage();
  }, []);

  // 自動儲存狀態變更
  useEffect(() => {
    if (state.lastSaved) {
      saveToStorage();
    }
  }, [state.lastSaved]);

  // 便利方法實作
  const goToStep = (step: RegistrationStep) => {
    if (canGoToStep(step)) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const completeStep = (step: RegistrationStep) => {
    dispatch({ type: 'COMPLETE_STEP', payload: step });
  };

  const goToNextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1];
      goToStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const previousStep = STEP_ORDER[currentIndex - 1];
      goToStep(previousStep);
    }
  };

  const canGoToStep = (step: RegistrationStep): boolean => {
    const stepIndex = STEP_ORDER.indexOf(step);
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    
    // 可以回到已完成的步驟
    if (state.completedSteps.includes(step)) {
      return true;
    }
    
    // 可以前進到下一步（如果當前步驟已完成）
    if (stepIndex === currentIndex + 1 && state.completedSteps.includes(state.currentStep)) {
      return true;
    }
    
    // 可以停留在當前步驟
    if (stepIndex === currentIndex) {
      return true;
    }
    
    return false;
  };

  const getStepProgress = (): number => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    return Math.round(((currentIndex + 1) / STEP_ORDER.length) * 100);
  };

  const resetFlow = () => {
    dispatch({ type: 'RESET_FLOW' });
    clearStorage();
  };

  // 資料設定方法
  const setIdentity = (identity: 'monk' | 'volunteer') => {
    dispatch({ type: 'SET_IDENTITY', payload: identity });
  };

  const setEvent = (eventId: string) => {
    dispatch({ type: 'SET_EVENT', payload: eventId });
  };

  const setPersonalInfo = (info: PersonalInfoFormData) => {
    dispatch({ type: 'SET_PERSONAL_INFO', payload: info });
  };

  const setTransport = (selection: { locationId: string | null; transport: TransportOption | null }) => {
    dispatch({ type: 'SET_TRANSPORT', payload: selection });
  };

  // 持久化方法
  const saveToStorage = () => {
    try {
      const dataToSave = {
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        identity: state.identity,
        selectedEventId: state.selectedEventId,
        personalInfo: state.personalInfo,
        transportSelection: state.transportSelection,
        sessionId: state.sessionId,
        lastSaved: state.lastSaved?.toISOString(),
      };
      
      localStorage.setItem('registrationFlow', JSON.stringify(dataToSave));
      sessionStorage.setItem(`registrationFlow_${state.sessionId}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save registration flow to storage:', error);
    }
  };

  const loadFromStorage = (): boolean => {
    try {
      // 優先從 sessionStorage 載入
      const sessionData = sessionStorage.getItem(`registrationFlow_${state.sessionId}`);
      let savedData = sessionData ? JSON.parse(sessionData) : null;
      
      // 如果 sessionStorage 沒有，從 localStorage 載入
      if (!savedData) {
        const localData = localStorage.getItem('registrationFlow');
        savedData = localData ? JSON.parse(localData) : null;
      }
      
      if (savedData) {
        // 檢查資料是否過期（24小時）
        const lastSaved = savedData.lastSaved ? new Date(savedData.lastSaved) : null;
        const now = new Date();
        const hoursSinceLastSave = lastSaved ? (now.getTime() - lastSaved.getTime()) / (1000 * 60 * 60) : 0;
        
        if (hoursSinceLastSave < 24) {
          dispatch({
            type: 'RESTORE_FROM_STORAGE',
            payload: {
              ...savedData,
              lastSaved: lastSaved,
            },
          });
          return true;
        } else {
          // 資料過期，清除
          clearStorage();
        }
      }
    } catch (error) {
      console.warn('Failed to load registration flow from storage:', error);
    }
    
    return false;
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem('registrationFlow');
      sessionStorage.removeItem(`registrationFlow_${state.sessionId}`);
    } catch (error) {
      console.warn('Failed to clear registration flow storage:', error);
    }
  };

  const contextValue = {
    state,
    dispatch,
    goToStep,
    completeStep,
    goToNextStep,
    goToPreviousStep,
    canGoToStep,
    getStepProgress,
    resetFlow,
    setIdentity,
    setEvent,
    setPersonalInfo,
    setTransport,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  };

  return (
    <RegistrationFlowContext.Provider value={contextValue}>
      {children}
    </RegistrationFlowContext.Provider>
  );
}

// Hook
export function useRegistrationFlow() {
  const context = useContext(RegistrationFlowContext);
  if (!context) {
    throw new Error('useRegistrationFlow must be used within a RegistrationFlowProvider');
  }
  return context;
}

// 步驟資訊
export const STEP_INFO: Record<RegistrationStep, { title: string; description: string }> = {
  identity: {
    title: '身份選擇',
    description: '選擇您的身份類型',
  },
  event: {
    title: '選擇活動',
    description: '選擇要報名的活動',
  },
  'personal-info': {
    title: '個人資料',
    description: '填寫個人基本資料',
  },
  transport: {
    title: '交通安排',
    description: '選擇交通車地點',
  },
  confirmation: {
    title: '確認資料',
    description: '確認所有報名資料',
  },
  success: {
    title: '報名完成',
    description: '報名成功確認',
  },
};